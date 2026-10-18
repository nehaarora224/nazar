import { config, DAY_MS } from './config.ts';
import { newToken, safeEqual, sha256, verifyWebhook } from './crypto.ts';
import { composeEmail } from './email.ts';
import { baseUrl, bearer, getCookie, json, parseForm, parseJson, rid, type Req, type Res } from './http.ts';
import type { BaitRecord, EventRecord, EventType, PublicEvent } from './model.ts';
import type { EmailProvider } from './provider.ts';
import type { Store } from './store.ts';

export type Deps = { store: Store; provider: EmailProvider; now: () => number; csrfNonce?: () => string };

const ownerHashOf = (secret: string) => sha256(`owner:${secret}`);
const GENERIC_404 = json(404, { error: 'Not found' });

/** Load a bait and confirm the caller owns it. Collapses "missing" and "not yours" to one answer. */
async function ownedBait(store: Store, id: string, secret: string): Promise<BaitRecord | null> {
  if (!id || !secret) return null;
  const bait = await store.getBait(id);
  if (!bait) return null;
  return safeEqual(bait.ownerHash, ownerHashOf(secret)) ? bait : null;
}

/* ------------------------------ POST /api/baits ------------------------------ */

export async function createBait(req: Req, d: Deps): Promise<Res> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const secret = bearer(req);
  if (!secret || secret.length < 16) return json(401, { error: 'Missing owner credential' });
  const ownerHash = ownerHashOf(secret);

  // Duplicate-submission guard: a replayed request carrying the same Idempotency-Key returns the
  // first result instead of sending a second email. Scoped by owner so keys can't collide/cross.
  const idemKey = req.headers['idempotency-key'];
  const idemScoped = idemKey ? `${ownerHash}:${idemKey}` : '';
  if (idemScoped) {
    const prior = await d.store.idemGet(idemScoped);
    if (prior) return json(200, { id: prior.id, status: prior.status, deduped: true });
  }

  // Per-owner daily cap. Not a bulk-mailer: one recipient per call, limited calls per day.
  const count = await d.store.bump(`create:${ownerHash}`, 24 * 60 * 60);
  if (count > config.maxCreatesPerDay) return json(429, { error: 'Daily limit reached for this device' });

  const parsed = parseJson(req.rawBody);
  const { validateCreate } = await import('./validate.ts');
  const v = validateCreate(parsed);
  if (!v.ok) return json(400, { error: v.error });

  const base = baseUrl(req, config.baseUrl);
  if (!base) return json(500, { error: 'Server base URL is not configured' });

  const token = newToken();
  const now = d.now();
  const bait: BaitRecord = {
    id: rid(),
    ownerHash,
    recipient: v.value.recipient,
    template: v.value.template,
    name: v.value.name,
    tokenHash: sha256(token),
    createdAt: now,
    expiresAt: now + config.tokenTtlDays * DAY_MS,
    revoked: false,
  };

  const email = composeEmail({
    subject: v.value.subject || 'A quick check',
    body: v.value.body || 'Please review this message.',
    linkUrl: `${base}/api/l/${token}`,
  });
  const sent = await d.provider.send({ to: bait.recipient, subject: email.subject, html: email.html, text: email.text });

  if (!sent.ok) {
    // Nothing was dispatched, so no record is kept and no link exists. Report honestly.
    return json(200, { id: bait.id, status: sent.reason === 'unconfigured' ? 'unconfigured' : 'failed', error: sent.error });
  }

  bait.providerId = sent.providerId;
  await d.store.putBait(bait);
  await d.store.setProviderId(bait.id, sent.providerId);
  await d.store.addEvent({ id: rid(), baitId: bait.id, type: 'accepted', at: now, detail: 'Provider accepted the send request' });

  // Remember the outcome so an identical retry doesn't dispatch a second email.
  if (idemScoped) await d.store.idemPut(idemScoped, { id: bait.id, status: 'accepted' });

  return json(200, { id: bait.id, status: 'accepted' });
}

/* -------------------------- GET /api/baits/:id/events -------------------------- */

const toPublic = (e: EventRecord): PublicEvent => ({ id: e.id, at: e.at, type: e.type, detail: e.detail });

export async function listEvents(req: Req, d: Deps): Promise<Res> {
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });
  const secret = bearer(req);
  const bait = await ownedBait(d.store, req.query.id || '', secret || '');
  if (!bait) return GENERIC_404;

  const events = await d.store.listEvents(bait.id);
  // The app timeline surfaces recipient-side signals: link access and interpretation.
  const visible = events.filter((e) => e.type === 'link_access' || e.type === 'interpretation').map(toPublic);
  return json(200, visible);
}

/* -------------------- GET/DELETE /api/baits/:id (status, revoke) -------------------- */

export async function baitStatus(req: Req, d: Deps): Promise<Res> {
  const secret = bearer(req);
  const bait = await ownedBait(d.store, req.query.id || '', secret || '');
  if (!bait) return GENERIC_404;

  if (req.method === 'DELETE') {
    await d.store.deleteBait(bait.id);
    return json(200, { deleted: true });
  }
  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  const events = await d.store.listEvents(bait.id);
  const counts: Record<EventType, number> = { accepted: 0, delivered: 0, bounced: 0, rejected: 0, link_access: 0, interpretation: 0 };
  for (const e of events) counts[e.type]++;
  return json(200, {
    id: bait.id,
    name: bait.name,
    template: bait.template,
    createdAt: bait.createdAt,
    expiresAt: bait.expiresAt,
    expired: d.now() > bait.expiresAt,
    revoked: bait.revoked,
    counts,
  });
}

/* ------------------------------ /api/l/:token (landing) ------------------------------ */

function landingPage(opts: { nonce: string; token: string; done?: boolean }): string {
  const { nonce, token, done } = opts;
  const thanks = done
    ? `<p class="ok">Thanks — your response was recorded.</p>`
    : `<form method="POST" action="/api/l/${encodeURIComponent(token)}">
         <input type="hidden" name="csrf" value="${nonce}">
         <p>If you have a moment: when you received this, what did you think?</p>
         <button name="interpretation" value="expected">I expected it</button>
         <button name="interpretation" value="suspicious">It looked suspicious</button>
         <button name="interpretation" value="unsure">I'm not sure</button>
       </form>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Security awareness exercise</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f1c2e;background:#f6f4fb;margin:0;padding:24px;line-height:1.55}
.card{max-width:520px;margin:32px auto;background:#fff;border-radius:16px;padding:24px;box-shadow:0 8px 30px rgba(31,28,46,.08)}
h1{font-size:20px}button{margin:6px 6px 0 0;padding:10px 14px;border:1px solid #d9d4ea;border-radius:10px;background:#fff;cursor:pointer}
.ok{color:#1f7a53;font-weight:600}.muted{color:#6b6780;font-size:13px}</style></head>
<body><div class="card">
<h1>This was a security-awareness exercise</h1>
<p>You reached this page by opening a link in a message. That message was <strong>not</strong> a real account notice — it was an authorized awareness test set up with the Nazar app by someone who wanted to review online safety together.</p>
<p>Nothing is wrong with your accounts. You were <strong>not</strong> asked for any password, verification code, or payment, and this page does not collect any.</p>
<p class="muted">Opening the link recorded only that it was opened, so the test can be reviewed together afterwards.</p>
${thanks}
</div></body></html>`;
}

export async function landing(req: Req, d: Deps): Promise<Res> {
  const token = req.query.token || '';
  const tokenHash = sha256(token);
  const baitId = token ? await d.store.baitIdByToken(tokenHash) : null;
  const bait = baitId ? await d.store.getBait(baitId) : null;
  const live = !!bait && !bait.revoked && d.now() <= bait.expiresAt;

  if (req.method === 'POST') {
    // CSRF: double-submit cookie must match the posted nonce.
    const form = parseForm(req.rawBody);
    const cookieNonce = getCookie(req.headers['cookie'], 'bait_csrf');
    if (!cookieNonce || !form.csrf || !safeEqual(cookieNonce, form.csrf)) {
      return { status: 403, html: landingPage({ nonce: '', token, done: true }), headers: { 'Content-Type': 'text/html; charset=utf-8' } };
    }
    const choice = form.interpretation;
    if (live && bait && ['expected', 'suspicious', 'unsure'].includes(choice)) {
      await d.store.addEvent({ id: rid(), baitId: bait.id, type: 'interpretation', at: d.now(), detail: `Recipient response: ${choice}` });
    }
    return { status: 200, html: landingPage({ nonce: '', token, done: true }), headers: { 'Content-Type': 'text/html; charset=utf-8' } };
  }

  if (req.method !== 'GET') return json(405, { error: 'Method not allowed' });

  // Record the access for live tokens, under a per-token cap. Same page is returned either way
  // (anti-enumeration): a stranger poking random tokens cannot tell a real one from a fake one.
  if (live && bait) {
    const n = await d.store.bump(`acc:${tokenHash}`, config.retentionDays * 24 * 60 * 60);
    if (n <= config.maxAccessesPerToken) {
      await d.store.addEvent({ id: rid(), baitId: bait.id, type: 'link_access', at: d.now(), detail: 'Recorded link access' });
    }
  }

  const nonce = (d.csrfNonce ?? (() => rid()))();
  return {
    status: 200,
    html: landingPage({ nonce, token }),
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Set-Cookie': `bait_csrf=${nonce}; Path=/api/l/${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Secure; Max-Age=600`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  };
}

/* ------------------------------ POST /api/webhooks/resend ------------------------------ */

const WEBHOOK_MAP: Record<string, EventType> = {
  'email.sent': 'accepted',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.complained': 'rejected',
};

export async function webhook(req: Req, d: Deps): Promise<Res> {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const ok = verifyWebhook({
    secret: config.webhookSecret,
    id: req.headers['svix-id'],
    timestamp: req.headers['svix-timestamp'],
    signatureHeader: req.headers['svix-signature'],
    rawBody: req.rawBody,
    toleranceSec: config.webhookToleranceSec,
    nowSec: Math.floor(d.now() / 1000),
  });
  if (!ok) return json(401, { error: 'Invalid signature' });

  // Idempotency: svix-id is unique per delivery; ignore repeats.
  const fresh = await d.store.markSeen(`wh:${req.headers['svix-id']}`);
  if (!fresh) return json(200, { ok: true, deduped: true });

  const body = parseJson(req.rawBody) as { type?: string; data?: { email_id?: string } } | undefined;
  const type = body?.type && WEBHOOK_MAP[body.type];
  const providerId = body?.data?.email_id;
  if (!type || !providerId) return json(200, { ok: true, ignored: true });

  const baitId = await d.store.baitIdByProvider(providerId);
  if (!baitId) return json(200, { ok: true, ignored: true });

  await d.store.addEvent({ id: rid(), baitId, type, at: d.now(), detail: `Provider event: ${body!.type}` });
  return json(200, { ok: true });
}

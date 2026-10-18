// Server-side Bait Test backend: security-focused unit tests. Run with:
//   node --test --experimental-strip-types tests/baitApi.test.ts
// Env is set before any app module loads so config picks it up; app modules are imported dynamically.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import type { EmailProvider, SendOutcome } from '../api/_lib/provider.ts';
import type { Req } from '../api/_lib/http.ts';

process.env.BAIT_PUBLIC_URL = 'https://test.example';
process.env.BAIT_MAX_CREATES_PER_DAY = '3';
process.env.RESEND_WEBHOOK_SECRET = 'whsec_' + Buffer.from('topsecretkey').toString('base64');

const H = await import('../api/_lib/handlers.ts');
const { _newMemoryStore } = await import('../api/_lib/store.ts');

const NOW = 1_700_000_000_000;
const OWNER = 'owner-secret-abc-1234567890';

function okProvider(capture?: { last?: unknown }): EmailProvider {
  return {
    name: 'stub',
    async send(msg): Promise<SendOutcome> {
      if (capture) capture.last = msg;
      return { ok: true, providerId: 'pid_' + Math.random().toString(36).slice(2) };
    },
  };
}
const unconfiguredProvider: EmailProvider = { name: 'none', async send() { return { ok: false, reason: 'unconfigured' }; } };

function deps(store = _newMemoryStore(), provider = okProvider(), nonce = 'fixed-nonce') {
  return { store, provider, now: () => NOW, csrfNonce: () => nonce };
}
function req(method: string, opts: Partial<Req> = {}): Req {
  return { method, headers: {}, query: {}, rawBody: '', ...opts };
}
const auth = (secret: string) => ({ authorization: `Bearer ${secret}` });
const body = (o: unknown) => JSON.stringify(o);
const validBody = { recipient: 'self@example.com', template: 'security_review', name: 'My test', subject: 'Hi', body: 'Please review.' };

test('create requires an owner credential', async () => {
  const res = await H.createBait(req('POST', { rawBody: body(validBody) }), deps());
  assert.equal(res.status, 401);
});

test('create accepts, records an accepted event, and injects the link into the email', async () => {
  const cap: { last?: any } = {};
  const d = deps(_newMemoryStore(), okProvider(cap));
  const res = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  assert.equal(res.status, 200);
  const j = res.json as { id: string; status: string };
  assert.equal(j.status, 'accepted');
  assert.match(cap.last.html, /https:\/\/test\.example\/api\/l\//);
  assert.match(cap.last.html, /authorized security-awareness exercise/i);
  // The message reassures rather than asking for credentials.
  assert.match(cap.last.text, /never be asked for a password/i);
  const status = await H.baitStatus(req('GET', { headers: auth(OWNER), query: { id: j.id } }), d);
  assert.equal((status.json as any).counts.accepted, 1);
});

test('unconfigured provider never fakes a send and stores nothing', async () => {
  const d = deps(_newMemoryStore(), unconfiguredProvider);
  const res = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  assert.equal((res.json as any).status, 'unconfigured');
  const status = await H.baitStatus(req('GET', { headers: auth(OWNER), query: { id: (res.json as any).id } }), d);
  assert.equal(status.status, 404); // nothing persisted
});

test('create validates recipient and template', async () => {
  const d = deps();
  assert.equal((await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body({ ...validBody, recipient: 'nope' }) }), d)).status, 400);
  assert.equal((await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body({ ...validBody, template: 'evil' }) }), d)).status, 400);
});

test('events: no auth and wrong owner both get a generic 404; the real owner sees them', async () => {
  const d = deps();
  const c = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  const id = (c.json as any).id;
  assert.equal((await H.listEvents(req('GET', { query: { id } }), d)).status, 404);
  assert.equal((await H.listEvents(req('GET', { headers: auth('someone-else-secret-xxxx'), query: { id } }), d)).status, 404);
  const mine = await H.listEvents(req('GET', { headers: auth(OWNER), query: { id } }), d);
  assert.equal(mine.status, 200);
  assert.ok(Array.isArray(mine.json));
});

test('landing records link access for a live token, and is identical for a fake token', async () => {
  const cap: { last?: any } = {};
  const d = deps(_newMemoryStore(), okProvider(cap));
  const c = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  const id = (c.json as any).id;
  const token = /\/api\/l\/([^"'\s]+)/.exec(cap.last.html)![1];

  const real = await H.landing(req('GET', { query: { token } }), d);
  assert.equal(real.status, 200);
  assert.ok(real.headers!['Set-Cookie'].includes('bait_csrf='));
  const afterReal = await H.baitStatus(req('GET', { headers: auth(OWNER), query: { id } }), d);
  assert.equal((afterReal.json as any).counts.link_access, 1);

  // Fake token: records nothing, and the visible page body is identical (anti-enumeration).
  const fake = await H.landing(req('GET', { query: { token: 'totally-made-up' } }), d);
  assert.equal(fake.html!.replace(/totally-made-up/g, token), real.html);

  // A real link access is visible to the owner via the events feed.
  const ev = await H.listEvents(req('GET', { headers: auth(OWNER), query: { id } }), d);
  assert.equal((ev.json as any[]).filter((e) => e.type === 'link_access').length, 1);
});

test('landing POST enforces CSRF double-submit', async () => {
  const d = deps();
  // Missing cookie/nonce -> 403, no interpretation recorded.
  const bad = await H.landing(req('POST', { query: { token: 'x' }, rawBody: 'interpretation=expected' }), d);
  assert.equal(bad.status, 403);
  // Matching cookie + form nonce -> 200 (no event for a fake token, but CSRF passes).
  const good = await H.landing(req('POST', { query: { token: 'x' }, headers: { cookie: 'bait_csrf=n1' }, rawBody: 'csrf=n1&interpretation=expected' }), d);
  assert.equal(good.status, 200);
});

test('webhook rejects forged signatures and records nothing', async () => {
  const d = deps();
  const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: 'pid_x' } });
  const res = await H.webhook(req('POST', { headers: { 'svix-id': 'm1', 'svix-timestamp': String(Math.floor(NOW / 1000)), 'svix-signature': 'v1,deadbeef' }, rawBody: payload }), d);
  assert.equal(res.status, 401);
});

test('webhook with a valid signature records delivery once (idempotent)', async () => {
  const cap: { last?: any } = {};
  const d = deps(_newMemoryStore(), okProvider(cap));
  const c = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  const id = (c.json as any).id;
  const providerId = cap.last ? (await d.store.getBait(id))!.providerId! : '';
  const ts = String(Math.floor(NOW / 1000));
  const payload = JSON.stringify({ type: 'email.delivered', data: { email_id: providerId } });
  const key = Buffer.from('topsecretkey'); // matches whsec_ base64 of 'topsecretkey'
  const sig = 'v1,' + createHmac('sha256', key).update(`m2.${ts}.${payload}`).digest('base64');
  const hdr = { 'svix-id': 'm2', 'svix-timestamp': ts, 'svix-signature': sig };

  const r1 = await H.webhook(req('POST', { headers: hdr, rawBody: payload }), d);
  assert.equal(r1.status, 200);
  const r2 = await H.webhook(req('POST', { headers: hdr, rawBody: payload }), d); // replay
  assert.equal((r2.json as any).deduped, true);

  const status = await H.baitStatus(req('GET', { headers: auth(OWNER), query: { id } }), d);
  assert.equal((status.json as any).counts.delivered, 1);
});

test('per-owner daily create cap returns 429', async () => {
  const d = deps();
  for (let i = 0; i < 3; i++) assert.equal((await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d)).status, 200);
  assert.equal((await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d)).status, 429);
});

test('delete revokes and purges the test', async () => {
  const d = deps();
  const c = await H.createBait(req('POST', { headers: auth(OWNER), rawBody: body(validBody) }), d);
  const id = (c.json as any).id;
  assert.equal((await H.baitStatus(req('DELETE', { headers: auth(OWNER), query: { id } }), d)).status, 200);
  assert.equal((await H.listEvents(req('GET', { headers: auth(OWNER), query: { id } }), d)).status, 404);
});

import type { TemplateId } from './store';

/**
 * Client for the Bait Test backend (the serverless functions under /api). The email provider's
 * secret lives only in server environment variables — never in this bundle. Unless
 * EXPO_PUBLIC_BAIT_API_URL is set at build time, sending is unavailable and the app says so:
 * no email is sent, no link exists, and no link events can be recorded.
 *
 * Contract (see api/ and README):
 *   POST {url}/api/baits               { recipient, template, name, subject, body }
 *     -> { id, status: 'accepted' | 'unconfigured' | 'failed', error? }
 *   GET  {url}/api/baits/{id}/events   -> [{ id, at, type, detail? }]   (owner-scoped)
 * Both carry `Authorization: Bearer <ownerSecret>` — a device-scoped secret, not real auth.
 */
const RAW = process.env.EXPO_PUBLIC_BAIT_API_URL?.replace(/\/$/, '');
// Allow pointing at either the site root or the /api path.
const API = RAW ? (RAW.endsWith('/api') ? RAW : `${RAW}/api`) : undefined;

export const baitServiceConfigured = !!API;

export type SendResult = { ok: true; remoteId: string } | { ok: false; reason: 'unavailable' | 'failed'; error?: string };

export async function sendBaitEmail(payload: {
  recipient: string;
  template: TemplateId;
  name: string;
  subject: string;
  body: string;
  ownerSecret: string;
}): Promise<SendResult> {
  if (!API) return { ok: false, reason: 'unavailable' };
  const { ownerSecret, ...rest } = payload;
  try {
    const res = await fetch(`${API}/baits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ownerSecret}` },
      body: JSON.stringify(rest),
    });
    if (!res.ok) return { ok: false, reason: 'failed', error: `HTTP ${res.status}` };
    const json = (await res.json()) as { id?: string; status?: string; error?: string };
    // The server only ever reports what actually happened. "accepted" means the provider took the
    // send request; it is never a claim of inbox delivery (that arrives later as a webhook event).
    if (json.status === 'accepted' && json.id) return { ok: true, remoteId: json.id };
    if (json.status === 'unconfigured') return { ok: false, reason: 'unavailable', error: json.error };
    return { ok: false, reason: 'failed', error: json.error ?? 'Send was not accepted' };
  } catch (e) {
    return { ok: false, reason: 'failed', error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchLinkEvents(remoteId: string, ownerSecret: string): Promise<{ id: string; at: number; detail?: string }[] | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/baits/${encodeURIComponent(remoteId)}/events`, {
      headers: { Authorization: `Bearer ${ownerSecret}` },
    });
    if (!res.ok) return null;
    const list = (await res.json()) as { id: string; at: number | string; detail?: string }[];
    return list.map((e) => ({ id: String(e.id), at: typeof e.at === 'number' ? e.at : Date.parse(e.at), detail: e.detail }));
  } catch {
    return null;
  }
}

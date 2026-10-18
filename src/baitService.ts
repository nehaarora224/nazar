import type { TemplateId } from './store';

/**
 * Client for an optional bait-email service. Nazar has no server of its own, so unless
 * EXPO_PUBLIC_BAIT_API_URL is set at build time, sending is unavailable and the app says so:
 * no email is sent, no link exists, and no link events can be recorded.
 *
 * Expected contract (see README):
 *   POST {url}/baits            { recipient, template, name, subject, body } -> { id }
 *   GET  {url}/baits/{id}/events                                         -> [{ id, at, detail? }]
 */
const API = process.env.EXPO_PUBLIC_BAIT_API_URL?.replace(/\/$/, '');

export const baitServiceConfigured = !!API;

export type SendResult = { ok: true; remoteId: string } | { ok: false; reason: 'unavailable' | 'failed'; error?: string };

export async function sendBaitEmail(payload: { recipient: string; template: TemplateId; name: string; subject: string; body: string }): Promise<SendResult> {
  if (!API) return { ok: false, reason: 'unavailable' };
  try {
    const res = await fetch(`${API}/baits`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return { ok: false, reason: 'failed', error: `HTTP ${res.status}` };
    const json = (await res.json()) as { id?: string };
    return json.id ? { ok: true, remoteId: json.id } : { ok: false, reason: 'failed', error: 'No id returned' };
  } catch (e) {
    return { ok: false, reason: 'failed', error: e instanceof Error ? e.message : String(e) };
  }
}

export async function fetchLinkEvents(remoteId: string): Promise<{ id: string; at: number; detail?: string }[] | null> {
  if (!API) return null;
  try {
    const res = await fetch(`${API}/baits/${encodeURIComponent(remoteId)}/events`);
    if (!res.ok) return null;
    const list = (await res.json()) as { id: string; at: number | string; detail?: string }[];
    return list.map((e) => ({ id: String(e.id), at: typeof e.at === 'number' ? e.at : Date.parse(e.at), detail: e.detail }));
  } catch {
    return null;
  }
}

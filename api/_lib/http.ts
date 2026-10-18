import { randomBytes } from 'node:crypto';

// A transport-neutral request/response shape so the handlers can be unit-tested without a
// running server. The Vercel route files adapt (req, res) to and from these.

export type Req = {
  method: string;
  headers: Record<string, string | undefined>;
  query: Record<string, string | undefined>;
  rawBody: string;
};

export type Res = {
  status: number;
  json?: unknown;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
};

export const rid = (): string => randomBytes(9).toString('base64url');

export const json = (status: number, body: unknown, headers?: Record<string, string>): Res => ({ status, json: body, headers });

export function parseJson(raw: string): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/** Parse application/x-www-form-urlencoded into a flat record. */
export function parseForm(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const [k, v = ''] = pair.split('=');
    out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
  }
  return out;
}

export function getCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return undefined;
}

/** Owner secret from `Authorization: Bearer <secret>`. */
export function bearer(req: Req): string | null {
  const h = req.headers['authorization'] || req.headers['Authorization'];
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

/** Deployment base URL, from config or the forwarded host. */
export function baseUrl(req: Req, configured: string): string {
  if (configured) return configured;
  const host = req.headers['x-forwarded-host'] || req.headers['host'];
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return host ? `${proto}://${host}` : '';
}

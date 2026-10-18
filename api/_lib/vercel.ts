import { getProvider } from './provider.ts';
import { getStore } from './store.ts';
import type { Deps } from './handlers.ts';
import type { Req, Res } from './http.ts';

// Adapters between Vercel's Web-standard (Request -> Response) functions and our transport-neutral
// handlers. Using the Web signature gives us the exact raw request body (request.text()), which the
// webhook signature check needs — a re-serialized JSON body would not match the signature.

export async function toReq(request: Request): Promise<{ req: Req; url: URL }> {
  const url = new URL(request.url);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  const rawBody = request.method === 'GET' || request.method === 'HEAD' ? '' : await request.text();
  return { req: { method: request.method, headers, query, rawBody }, url };
}

export function toResponse(res: Res): Response {
  const headers = new Headers(res.headers);
  if (res.html != null) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'text/html; charset=utf-8');
    return new Response(res.html, { status: res.status, headers });
  }
  if (res.text != null) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'text/plain; charset=utf-8');
    return new Response(res.text, { status: res.status, headers });
  }
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(res.json ?? null), { status: res.status, headers });
}

export const deps = (): Deps => ({ store: getStore(), provider: getProvider(), now: () => Date.now() });

/** Last non-empty path segment (e.g. the `[id]` or `[token]` value). */
export function lastSegment(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '');
}

/** Segment before the final one (e.g. the bait id in /api/baits/:id/events). */
export function secondLastSegment(url: URL): string {
  const parts = url.pathname.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 2] || '');
}

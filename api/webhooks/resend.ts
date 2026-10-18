import { webhook } from '../_lib/handlers.ts';
import { deps, toReq, toResponse } from '../_lib/vercel.ts';

// POST /api/webhooks/resend — Resend delivery events. Signature-verified and de-duplicated.
export default async function handler(request: Request): Promise<Response> {
  const { req } = await toReq(request);
  return toResponse(await webhook(req, deps()));
}

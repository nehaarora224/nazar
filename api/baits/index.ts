import { createBait } from '../_lib/handlers.ts';
import { deps, toReq, toResponse } from '../_lib/vercel.ts';

// POST /api/baits — create an authorized Bait Test and dispatch the email.
export default async function handler(request: Request): Promise<Response> {
  const { req } = await toReq(request);
  return toResponse(await createBait(req, deps()));
}

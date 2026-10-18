import { landing } from '../_lib/handlers.ts';
import { deps, lastSegment, toReq, toResponse } from '../_lib/vercel.ts';

// GET /api/l/:token — the authorized-exercise landing page (records a link access).
// POST /api/l/:token — the recipient's interpretation (CSRF-protected).
export default async function handler(request: Request): Promise<Response> {
  const { req, url } = await toReq(request);
  req.query.token = lastSegment(url);
  return toResponse(await landing(req, deps()));
}

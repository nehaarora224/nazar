import { baitStatus } from '../../_lib/handlers.ts';
import { deps, lastSegment, toReq, toResponse } from '../../_lib/vercel.ts';

// GET /api/baits/:id — status + event counts. DELETE /api/baits/:id — revoke and purge.
export default async function handler(request: Request): Promise<Response> {
  const { req, url } = await toReq(request);
  req.query.id = lastSegment(url);
  return toResponse(await baitStatus(req, deps()));
}

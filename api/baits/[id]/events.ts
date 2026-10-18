import { listEvents } from '../../_lib/handlers.ts';
import { deps, secondLastSegment, toReq, toResponse } from '../../_lib/vercel.ts';

// GET /api/baits/:id/events — recipient-side events (link access, interpretation) for an owned test.
export default async function handler(request: Request): Promise<Response> {
  const { req, url } = await toReq(request);
  req.query.id = secondLastSegment(url); // .../baits/<id>/events
  return toResponse(await listEvents(req, deps()));
}

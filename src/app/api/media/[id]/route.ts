// Public: an image uploaded through the CMS (rigwire.media). Ids are random uuids and the bytes never change,
// so the response is cached for a year by browsers and Vercel's CDN.
import { getMedia } from '@/lib/studio/media';
import { UUID_RE } from '@/lib/worldwide/detail';

export const runtime = 'nodejs';

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return new Response('Not found', { status: 404 });
  const m = await getMedia(id);
  if (!m) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(m.bytes), {
    headers: {
      'Content-Type': m.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

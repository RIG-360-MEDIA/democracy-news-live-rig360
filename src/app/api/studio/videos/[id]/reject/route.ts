// Editorial CMS — reject a video awaiting approval, or delete a published one (/studio/videos): see rejectVideo. Audited
// after-only with the editor's reason (a deleted video cannot be restored: not undoable). A published one also leaves the
// site's Watch band and its story page at once.
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { sql } from '@/lib/db';
import { writeAudit } from '@/lib/studio/audit-log';
import { guardApi } from '@/lib/studio/guard';
import { videoIdSchema, videoRejectSchema } from '@/lib/studio/input-schemas';
import { rejectVideo, youtubeConfigured } from '@/lib/youtube/client';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;
  const id = videoIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return fail('400', 'Invalid video id', 400);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }
  const body = videoRejectSchema.safeParse(raw);
  if (!body.success) return fail('400', 'A reason (up to 500 characters) is required', 400);
  if (!youtubeConfigured()) return fail('503', 'YouTube is not connected', 503);
  const videoId = id.data;

  let video: { title: string; storyId?: string; published: boolean; deleted: boolean };
  try {
    video = await rejectVideo(videoId);
  } catch (e) {
    console.error('[studio/videos/reject] YouTube failed', { videoId, error: e });
    const msg = e instanceof Error ? e.message : 'YouTube reject failed';
    return fail(/not awaiting approval/i.test(msg) ? '409' : '502', msg, /not awaiting approval/i.test(msg) ? 409 : 502);
  }
  if (video.published) {
    revalidateTag(CACHE_TAGS.anchorVideos);
    if (video.storyId) revalidatePath(`/long-read/${video.storyId}`);
  }
  const entry = { actor: guard.editor.id, action: 'video_reject', storyId: video.storyId ?? null, before: null,
                  after: { videoId, title: video.title, reason: body.data.reason, published: video.published,
                          deletedFromYouTube: video.deleted } };
  try {
    await sql.begin((tx) => writeAudit(tx, entry));
  } catch (e) {
    console.error('[studio/videos/reject] audit failed after delete', { videoId, error: e });
    return fail('500', 'Deleted on YouTube, but the audit row could not be written', 500);
  }
  return NextResponse.json({ ok: true, data: { videoId }, error: null });
}

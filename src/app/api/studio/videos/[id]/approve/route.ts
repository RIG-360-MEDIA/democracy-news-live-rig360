// Editorial CMS — approve an Anchor Studio video (/studio/videos): public on YouTube + "Video Bulletin" playlist = on the
// site. The write is on YouTube; our DB records it in the audit ledger (after-only: not undoable).
import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { sql } from '@/lib/db';
import { writeAudit } from '@/lib/studio/audit-log';
import { guardApi } from '@/lib/studio/guard';
import { videoIdSchema } from '@/lib/studio/input-schemas';
import { approveVideo, youtubeConfigured } from '@/lib/youtube/client';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;
  const parsed = videoIdSchema.safeParse((await ctx.params).id);
  if (!parsed.success) return fail('400', 'Invalid video id', 400);
  if (!youtubeConfigured()) return fail('503', 'YouTube is not connected', 503);
  const videoId = parsed.data;

  let video: { title: string; storyId?: string };
  try {
    video = await approveVideo(videoId);
  } catch (e) {
    console.error('[studio/videos/approve] YouTube failed', { videoId, error: e });
    const msg = e instanceof Error ? e.message : 'YouTube approve failed';
    return fail(/not awaiting approval/i.test(msg) ? '409' : '502', msg, /not awaiting approval/i.test(msg) ? 409 : 502);
  }
  // The site first (the video IS public now), then the ledger: a failed audit write must not leave the site stale.
  // Only the video list and this story's page - never the story DATA cache (Neon) of every story.
  revalidateTag(CACHE_TAGS.anchorVideos);
  if (video.storyId) revalidatePath(`/long-read/${video.storyId}`);
  const entry = { actor: guard.editor.id, action: 'video_approve', storyId: video.storyId ?? null, before: null,
                  after: { videoId, title: video.title, url: `https://www.youtube.com/watch?v=${videoId}` } };
  try {
    await sql.begin((tx) => writeAudit(tx, entry));
  } catch (e) {
    // The video IS public now; only the ledger row failed. Say so rather than pretend nothing happened.
    console.error('[studio/videos/approve] audit failed after approve', { videoId, error: e });
    return fail('500', 'Approved on YouTube, but the audit row could not be written', 500);
  }
  return NextResponse.json({ ok: true, data: { videoId, storyId: video.storyId ?? null }, error: null });
}

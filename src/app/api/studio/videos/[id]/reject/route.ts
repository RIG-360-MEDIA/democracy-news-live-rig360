// Editorial CMS — reject an Anchor Studio video (/studio/videos): it is deleted from YouTube (it was only ever unlisted,
// never on the site). Audited after-only with the editor's reason (a deleted video cannot be restored: not undoable).
import { NextResponse } from 'next/server';

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

  let video: { title: string; storyId?: string };
  try {
    video = await rejectVideo(videoId);
  } catch (e) {
    console.error('[studio/videos/reject] YouTube failed', { videoId, error: e });
    return fail('502', e instanceof Error ? e.message : 'YouTube reject failed', 502);
  }
  const entry = { actor: guard.editor.id, action: 'video_reject', storyId: video.storyId ?? null, before: null,
                  after: { videoId, title: video.title, reason: body.data.reason } };
  try {
    await sql.begin((tx) => writeAudit(tx, entry));
  } catch (e) {
    console.error('[studio/videos/reject] audit failed after delete', { videoId, error: e });
    return fail('500', 'Deleted on YouTube, but the audit row could not be written', 500);
  }
  return NextResponse.json({ ok: true, data: { videoId }, error: null });
}

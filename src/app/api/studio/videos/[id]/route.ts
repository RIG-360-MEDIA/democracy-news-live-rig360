// Editorial CMS — edit an Anchor Studio video's YouTube title / description (/studio/videos, before or after approval).
// The write is on YouTube; the audit row is after-only (previous text kept inside `after.previous`), so the History /
// Audit "undo" never offers to roll a YouTube edit back.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { sql } from '@/lib/db';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { writeAudit } from '@/lib/studio/audit-log';
import { guardApi } from '@/lib/studio/guard';
import { videoEditSchema, videoIdSchema } from '@/lib/studio/input-schemas';
import { editVideo, youtubeConfigured } from '@/lib/youtube/client';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
  const body = videoEditSchema.safeParse(raw);
  if (!body.success) return fail('400', body.error.issues[0]?.message ?? 'Invalid title or description', 400);
  if (!youtubeConfigured()) return fail('503', 'YouTube is not connected', 503);
  const videoId = id.data;

  let r: Awaited<ReturnType<typeof editVideo>>;
  try {
    r = await editVideo(videoId, body.data.title, body.data.description);
  } catch (e) {
    console.error('[studio/videos/edit] YouTube failed', { videoId, error: e });
    return fail('502', e instanceof Error ? e.message : 'YouTube edit failed', 502);
  }
  const entry = { actor: guard.editor.id, action: 'video_edit', storyId: r.storyId ?? null, before: null,
                  after: { videoId, title: body.data.title, description: body.data.description, previous: r.before } };
  try {
    await sql.begin((tx) => writeAudit(tx, entry));
  } catch (e) {
    console.error('[studio/videos/edit] audit failed after edit', { videoId, error: e });
    return fail('500', 'Saved on YouTube, but the audit row could not be written', 500);
  }
  revalidateTag(CACHE_TAGS.frontPage);                              // the Watch band shows the title (if already published)
  if (r.storyId) revalidateStoryPage(r.storyId);
  return NextResponse.json({ ok: true, data: { videoId, storyId: r.storyId ?? null }, error: null });
}

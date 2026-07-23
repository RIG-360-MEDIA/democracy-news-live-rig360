// RigWire Studio — YouTube clip search (GET). Read-only over
// public.youtube_clips_v2 via sqlAnalytics; returns timestamped clip embeds for
// the editor's Embeds tab. Never writes. Envelope per .claude/rules/api-conventions.md.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sqlAnalytics } from '@/lib/db';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

const querySchema = z.object({ q: z.string().trim().min(2).max(120) });

interface Row {
  video_title: string | null;
  channel_name: string | null;
  embed_url: string;
  clip_start_seconds: number | null;
  clip_end_seconds: number | null;
  transcript_segment: string | null;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function GET(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);

  const parsed = querySchema.safeParse({ q: new URL(req.url).searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('400', 'Query `q` must be 2–120 characters', 400);

  const like = `%${parsed.data.q}%`;
  try {
    const rows = (await sqlAnalytics`
      SELECT video_title, channel_name, embed_url,
             clip_start_seconds, clip_end_seconds, transcript_segment
      FROM public.youtube_clips_v2
      WHERE video_title ILIKE ${like}
         OR channel_name ILIKE ${like}
         OR transcript_segment ILIKE ${like}
      ORDER BY video_published_at DESC NULLS LAST
      LIMIT 20
    `) as unknown as Row[];

    const data = rows.map((r) => ({
      videoTitle: r.video_title ?? '(untitled)',
      channelName: r.channel_name ?? 'Unknown channel',
      embedUrl: r.embed_url,
      startSeconds: r.clip_start_seconds ?? null,
      endSeconds: r.clip_end_seconds ?? null,
      transcriptSegment: r.transcript_segment ?? null,
    }));

    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Embed search failed', 500);
  }
}

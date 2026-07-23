// RigWire Studio — corpus media search (GET). Read-only over public.articles
// via sqlAnalytics; returns candidate images (each license-labelled) for the
// editor's media picker. Never writes. Envelope per .claude/rules/api-conventions.md.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sqlAnalytics } from '@/lib/db';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

const querySchema = z.object({ q: z.string().trim().min(2).max(120) });

interface Row {
  url: string;
  title: string | null;
  source: string | null;
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
      SELECT DISTINCT ON (a.thumbnail_url)
             a.thumbnail_url AS url, a.title, coalesce(s.name, '') AS source
      FROM public.articles a
      LEFT JOIN public.sources s ON s.id = a.source_id
      WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
        AND a.title ILIKE ${like}
      ORDER BY a.thumbnail_url, a.published_at DESC NULLS LAST
      LIMIT 24
    `) as unknown as Row[];

    const data = rows.map((r) => ({
      url: r.url,
      title: r.title ?? '(untitled article)',
      source: r.source || 'Unknown',
      license: `${r.source || 'Unknown'} — editorial corpus (verify rights)`,
    }));

    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Media search failed', 500);
  }
}

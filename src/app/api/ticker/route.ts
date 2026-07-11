// Breaking-news ticker feed — freshest raw articles (not clustered stories) as they land.
import { NextResponse } from 'next/server';

import { sqlAnalytics } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface TickerRow {
  id: string;
  title: string;
  topic: string | null;
  country: string | null;
  published_at: Date | string | null;
  breaking: boolean | null;
}

export interface TickerItem {
  id: string;
  title: string;
  topic: string | null;
  country: string | null;
  ago: string;
  breaking: boolean;
}

function relTime(ts: Date | string | null): string {
  if (!ts) return '';
  const secs = Math.max(0, Math.round((Date.now() - new Date(ts).getTime()) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export async function GET() {
  try {
    const rows = (await sqlAnalytics`
      SELECT id, title, topic_category AS topic, source_country AS country,
             published_at, register_is_breaking AS breaking
      FROM articles
      WHERE published_at > now() - interval '24 hours'
        AND title IS NOT NULL AND length(title) > 14
        AND language_iso = 'en'
        AND is_duplicate IS NOT TRUE
      ORDER BY register_is_breaking DESC NULLS LAST, published_at DESC
      LIMIT 30
    `) as unknown as TickerRow[];

    const data: TickerItem[] = rows.map((r) => ({
      id: r.id,
      title: r.title.replace(/\s+/g, ' ').trim(),
      topic: r.topic,
      country: r.country,
      ago: relTime(r.published_at),
      breaking: !!r.breaking,
    }));

    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: '500', message: e instanceof Error ? e.message : 'ticker failed' } },
      { status: 500 },
    );
  }
}

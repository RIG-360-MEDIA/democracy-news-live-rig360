// Freshness probe for monitoring (DNL program P03 S03.07 / P09): what the reader cache currently
// holds — newest published story time, ticker size, build. Reads through the same tagged cache as
// the front page, so polling it does not wake Neon between publishes.
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { sqlAnalytics } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Freshness {
  newest_story_at: string | null;
  stories_24h: number;
  ticker_count: number;
}

async function loadFreshness(): Promise<Freshness> {
  const [row] = (await sqlAnalytics`
    SELECT
      (SELECT max(updated_at) FROM analytics.story_generated_v8
        WHERE status LIKE 'PUBLISHABLE%') AS newest_story_at,
      (SELECT count(*)::int FROM analytics.story_generated_v8
        WHERE status LIKE 'PUBLISHABLE%' AND updated_at > now() - interval '24 hours') AS stories_24h,
      (SELECT count(*)::int FROM articles
        WHERE published_at > now() - interval '24 hours' AND published_at <= now() + interval '1 hour'
          AND language_iso = 'en' AND is_duplicate IS NOT TRUE) AS ticker_count
  `) as unknown as { newest_story_at: Date | null; stories_24h: number; ticker_count: number }[];
  return {
    newest_story_at: row?.newest_story_at ? new Date(row.newest_story_at).toISOString() : null,
    stories_24h: row?.stories_24h ?? 0,
    ticker_count: row?.ticker_count ?? 0,
  };
}

const getCachedFreshness = unstable_cache(loadFreshness, ['reader-freshness'], {
  revalidate: READER_CACHE_TTL,
  tags: [CACHE_TAGS.frontPage, CACHE_TAGS.ticker],
});

export async function GET() {
  const build_sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7);
  try {
    const f = await getCachedFreshness();
    return NextResponse.json(
      { ok: true, ...f, build_sha, checked_at: new Date().toISOString() },
      { headers: { 'Cache-Control': 'public, s-maxage=60' } },
    );
  } catch (e: unknown) {
    console.error('[health/freshness] failed:', e);
    return NextResponse.json({ ok: false, build_sha }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}

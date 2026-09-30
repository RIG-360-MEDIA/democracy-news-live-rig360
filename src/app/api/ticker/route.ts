// Breaking-news ticker feed — freshest raw articles (not clustered stories) as they land.
//
// Cached (DNL program P06 D-2): every open reader tab polls this every 45 s. It used to be
// force-dynamic with no cache, so each poll queried Neon and kept its free-tier compute awake.
// Now the DB read sits in the Data Cache (tag `reader-ticker`, refreshed by /api/revalidate after
// each hourly publish) and the response is CDN-cacheable for 5 min. Relative times ("12m ago") are
// computed per request from the cached timestamps so they stay accurate.
import { unstable_cache } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
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

// `language_iso = 'en'` is source-level metadata and is frequently mislabeled, so headlines in
// Devanagari / Bengali / Tamil / Telugu / Arabic / Hebrew / CJK / Hangul / Cyrillic / Thai still
// leak into the breaking strip. Reject any title that carries characters from a non-Latin script
// block. Accented Latin (café, José, Łódź) is intentionally allowed — that IS English/roman text.
const NON_LATIN_SCRIPT =
  /[Ѐ-ӿԀ-ԯ֐-׿؀-ۿ܀-ݏऀ-ॿঀ-৿਀-੿઀-૿଀-୿஀-௿ఀ-౿ಀ-೿ഀ-ൿ฀-๿ᄀ-ᇿ぀-ヿ㄰-㆏㐀-䶿一-鿿가-힯]/;

function isEnglishTitle(title: string): boolean {
  return !NON_LATIN_SCRIPT.test(title);
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

async function loadTickerRows(): Promise<TickerRow[]> {
  const rows = (await sqlAnalytics`
    SELECT id, title, topic_category AS topic, source_country AS country,
           published_at, register_is_breaking AS breaking
    FROM articles
    WHERE published_at > now() - interval '24 hours'
      AND published_at <= now() + interval '1 hour'
      AND title IS NOT NULL AND length(title) > 14
      AND language_iso = 'en'
      AND is_duplicate IS NOT TRUE
    ORDER BY register_is_breaking DESC NULLS LAST, published_at DESC
    LIMIT 30
  `) as unknown as TickerRow[];
  // plain JSON-safe objects for the Data Cache
  return rows.map((r) => ({ ...r, published_at: r.published_at ? new Date(r.published_at).toISOString() : null }));
}

const getCachedTickerRows = unstable_cache(loadTickerRows, ['reader-ticker'], {
  revalidate: READER_CACHE_TTL,
  tags: [CACHE_TAGS.ticker],
});

export async function GET() {
  try {
    const rows = await getCachedTickerRows();
    const data: TickerItem[] = rows
      .map((r) => ({
        id: r.id,
        title: r.title.replace(/\s+/g, ' ').trim(),
        topic: r.topic,
        country: r.country,
        ago: relTime(r.published_at),
        breaking: !!r.breaking,
      }))
      .filter((it) => isEnglishTitle(it.title)); // English-only breaking strip (script guard, not just metadata)

    return NextResponse.json(
      { ok: true, data, error: null },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } },
    );
  } catch (e: unknown) {
    // Never leak DB error text to the client; log it server-side.
    console.error('[ticker] load failed:', e);
    return NextResponse.json(
      { ok: false, data: null, error: { code: '503', message: 'ticker temporarily unavailable' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

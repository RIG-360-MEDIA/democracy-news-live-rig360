// Shared Data-Cache tags + TTL for the public reader.
//
// The reader pages (/long-read and /long-read/[slug]) stay `force-dynamic` but
// wrap their Neon reads in `unstable_cache` under these tags, so the DB is hit
// at most once per TTL instead of on every request — Neon's free tier meters
// monthly compute-hours, and force-dynamic per-request querying was the cost
// driver. Studio write routes call `revalidateTag` with these tags so an
// editor's publish/pin/edit still reflects immediately, not after the TTL.
//
// Quiet mode (DNL program P03/P06 D-2, 2026-09-30): the box publishes to Neon once an hour and then
// POSTs /api/revalidate, so reader caches refresh right after new data lands and visitors never
// wake Neon in between. The TTL is only the safety net if that call is missed.

export const CACHE_TAGS = {
  frontPage: 'reader-front-page',
  storyDetail: 'reader-story-detail',
  ticker: 'reader-ticker',
} as const;

// Public names the box's publish job may ask to revalidate → internal tags.
export const REVALIDATE_TAGS: Record<string, string> = {
  frontpage: CACHE_TAGS.frontPage,
  story: CACHE_TAGS.storyDetail,
  ticker: CACHE_TAGS.ticker,
};

function ttlFromEnv(): number {
  const raw = Number(process.env.READER_CACHE_TTL_SECONDS);
  // 30 min until REVALIDATE_SECRET is configured in Vercel (OA-2): hourly publish + 30-min TTL keeps
  // SC1 (newest story ≤ 2 h) without revalidation; still ≤ 2 Neon wakes/hour from visitor traffic.
  return Number.isFinite(raw) && raw >= 60 && raw <= 86_400 ? raw : 1_800;
}

// Seconds the reader's Neon reads may be served from cache before refetch (default 30 min);
// /api/revalidate refreshes sooner whenever new data lands.
export const READER_CACHE_TTL = ttlFromEnv();

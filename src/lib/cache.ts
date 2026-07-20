// Shared Data-Cache tags + TTL for the public reader.
//
// The reader pages (/long-read and /long-read/[slug]) stay `force-dynamic` but
// wrap their Neon reads in `unstable_cache` under these tags, so the DB is hit
// at most once per TTL instead of on every request — Neon's free tier meters
// monthly compute-hours, and force-dynamic per-request querying was the cost
// driver. Studio write routes call `revalidateTag` with these tags so an
// editor's publish/pin/edit still reflects immediately, not after the TTL.

export const CACHE_TAGS = {
  frontPage: 'reader-front-page',
  storyDetail: 'reader-story-detail',
} as const;

// Seconds the reader's Neon reads may be served from cache before refetch.
// The box→Neon sync only lands new data every ~20 min, so a 10-min cache is still
// fresher than the underlying data changes — and a longer TTL means visitor traffic
// wakes Neon's (compute-metered) endpoint far less often. Editor writes bust the
// cache immediately via revalidateTag, so publish/pin/edit still reflect at once.
export const READER_CACHE_TTL = 600;

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { getFrontPage } from '@/lib/worldwide/ranking';
import { recentVideos } from '@/lib/worldwide/recent-videos';
import { LongReadPage } from '@/components/long-read/long-read-page';
import { getAnchorVideos } from '@/lib/worldwide/anchor-videos';

// ISR: the front page is rendered once and served from Vercel's CDN until the box's hourly
// /api/revalidate (or an editor write) purges CACHE_TAGS.frontPage, which is attached to this page
// through the unstable_cache reads below. It was force-dynamic, so every visit (readers, crawlers,
// every old-site URL redirected here) re-rendered on the server: 15 Nov 2026 the Hobby team was
// paused for Fast Origin Transfer (12.75/10 GB) + Active CPU. scripts/check-cache.mjs (postbuild)
// fails the build if this page stops being ISR. The build renders it once, so the build needs the DB.
// Must be a literal (Next reads it statically); keep in step with READER_CACHE_TTL's 1800 s default.
export const revalidate = 1800;

// Neon read in the Data Cache; refreshes at most every READER_CACHE_TTL; editor writes and the
// box's publish bust it via revalidateTag.
const getCachedFrontPage = unstable_cache(
  (scope: string) => getFrontPage(scope),
  ['reader-front-page'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.frontPage] },
);

// Resilience (P06 D-3): a second copy of the front page under a tag the hourly publish never
// revalidates. unstable_cache serves it stale and refreshes in the background, keeping the old
// value if the refresh fails — so right after a revalidation, a Neon outage still shows readers
// the last good edition instead of an error page.
const getLastGoodFrontPage = unstable_cache(
  (scope: string) => getFrontPage(scope),
  ['reader-front-page-lastgood'],
  { revalidate: READER_CACHE_TTL, tags: ['reader-front-page-lastgood'] },
);

export const metadata = {
  title: 'Democracy News Live',
  description: 'The whole world, gathered into one read — every region’s biggest story today.',
};

// The world edition only: reading ?scope= would make the page dynamic again, and no reader UI
// links to a scoped edition (ScopeFilter is not rendered). /api/worldwide?scope= still serves them.
export default async function Page() {
  const key = 'world';
  let data;
  try {
    data = await getCachedFrontPage(key);
    await getLastGoodFrontPage(key); // keep the fallback copy warm (cache hit almost always)
  } catch (err) {
    console.error('[front-page] live read failed, serving last good edition:', err);
    data = await getLastGoodFrontPage(key); // throws only if no copy exists → error.tsx
  }
  // Watch band: Anchor Studio's daily news videos (the YouTube "Video Bulletin" playlist), last 30 days only (E6).
  const videos = await getAnchorVideos().catch(() => []);
  return <LongReadPage data={data} videos={recentVideos(videos, Date.now())} />;
}

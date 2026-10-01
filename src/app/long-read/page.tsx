import { unstable_cache } from 'next/cache';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { getFrontPage } from '@/lib/worldwide/ranking';
import { apiScope } from '@/lib/worldwide/to-view';
import { recentVideos } from '@/lib/worldwide/recent-videos';
import { LongReadPage } from '@/components/long-read/long-read-page';
import { videos } from '@/components/long-read/videos-data';

// SSR against the live _v8 keeper (read-only). force-dynamic so a build without DB
// connectivity doesn't try to statically render this page.
export const dynamic = 'force-dynamic';

// Cache the Neon read in the Data Cache (keyed by scope) so this force-dynamic
// page doesn't re-query on every visitor — Neon free tier meters compute-hours.
// Refreshes at most every READER_CACHE_TTL; editor writes bust it via revalidateTag.
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

function resolveScope(raw: string | undefined): string {
  const key = (raw ?? 'world').toLowerCase();
  if (key === 'world') return 'world';
  if (/^[a-z]{2}$/.test(key)) return apiScope(key);
  return 'world';
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope } = await searchParams;
  const key = resolveScope(scope);
  let data;
  try {
    data = await getCachedFrontPage(key);
    await getLastGoodFrontPage(key); // keep the fallback copy warm (cache hit almost always)
  } catch (err) {
    console.error('[front-page] live read failed, serving last good edition:', err);
    data = await getLastGoodFrontPage(key); // throws only if no copy exists → error.tsx
  }
  // Watch rail: only clips from the last 30 days, decided here on the server (E6).
  return <LongReadPage data={data} videos={recentVideos(videos, Date.now())} />;
}

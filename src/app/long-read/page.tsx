import { unstable_cache } from 'next/cache';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { getFrontPage } from '@/lib/worldwide/ranking';
import { apiScope } from '@/lib/worldwide/to-view';
import { LongReadPage } from '@/components/long-read/long-read-page';

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
  const data = await getCachedFrontPage(resolveScope(scope));
  return <LongReadPage data={data} />;
}

// /sitemap.xml (P06 D-4): front page + published stories of the last 30 days. Read through the
// front-page cache tag, so crawlers don't wake Neon between hourly publishes.
import type { MetadataRoute } from 'next';
import { unstable_cache } from 'next/cache';

import { BRAND } from '@/lib/brand';
import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { sqlAnalytics } from '@/lib/db';

export const dynamic = 'force-dynamic';

const getStoryUrls = unstable_cache(
  async () => {
    const rows = (await sqlAnalytics`
      SELECT g.story_id::text AS id, g.updated_at
      FROM analytics.story_generated_v8 g
      JOIN analytics.story_clusters_v8 sc ON sc.story_id = g.story_id
      WHERE g.status LIKE 'PUBLISHABLE%' AND g.strategy <> 'stub'
        AND g.updated_at > now() - interval '30 days'
        AND sc.redirected_to IS NULL AND sc.suppression_reason IS NULL
      ORDER BY g.updated_at DESC
      LIMIT 2000
    `) as unknown as { id: string; updated_at: Date }[];
    return rows.map((r) => ({ id: r.id, updated: new Date(r.updated_at).toISOString() }));
  },
  ['reader-sitemap'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.frontPage] },
);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BRAND.siteUrl;
  let stories: { id: string; updated: string }[] = [];
  try {
    stories = await getStoryUrls();
  } catch (err) {
    console.error('[sitemap] story list failed:', err);
  }
  return [
    { url: `${base}/`, changeFrequency: 'hourly', priority: 1 },
    ...stories.map((s) => ({
      url: `${base}/long-read/${s.id}`,
      lastModified: s.updated,
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
  ];
}

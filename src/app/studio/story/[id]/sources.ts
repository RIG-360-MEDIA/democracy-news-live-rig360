// Server-only loader for the Sources tab: the generated cluster's member
// articles (the evidence a story was built from). Read-only via sqlAnalytics.
// A Door B draft's evidence would be loaded via /api/studio/draft/[id]; this is
// the fallback used for every generated/clustered story.

import { sqlAnalytics } from '@/lib/db';

import type { SourceItem } from '@/components/studio/editor/types';

interface MemberRow {
  id: string;
  title: string | null;
  url: string | null;
  source: string | null;
  tier: number | null;
  published_at: string | Date | null;
  thumbnail: string | null;
}

/** Member articles of a story's cluster, newest first. Empty on any miss. */
export async function loadClusterSources(storyId: string, limit = 60): Promise<SourceItem[]> {
  const rows = (await sqlAnalytics`
    SELECT DISTINCT a.id, a.title, a.url, coalesce(s.name, '') AS source,
           a.source_tier AS tier, a.published_at, a.thumbnail_url AS thumbnail
    FROM analytics.story_cluster_members_v8 m
    JOIN public.articles a ON a.id = m.article_id
    LEFT JOIN public.sources s ON s.id = a.source_id
    WHERE m.story_id = ${storyId}
    ORDER BY a.published_at DESC NULLS LAST
    LIMIT ${limit}
  `) as unknown as MemberRow[];

  return rows.map((r) => ({
    id: r.id,
    title: r.title ?? '',
    url: r.url ?? '',
    source: r.source || 'Unknown',
    tier: r.tier ?? null,
    publishedAt: r.published_at ? new Date(r.published_at).toISOString() : null,
    thumbnail: r.thumbnail ?? null,
  }));
}

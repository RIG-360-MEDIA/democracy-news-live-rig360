// Editorial CMS — Coming-up queue: surfaceable clusters ranked but not yet promoted (E4).
// Read-only view over analytics; overrides/promotion happen elsewhere (the override layer).

import { sqlAnalytics } from '@/lib/db';

/** A cluster in the wire queue: ranked, surfaceable, awaiting an editor's promotion. */
export interface QueueItem {
  storyId: string;
  title: string;
  topic: string;
  country: string;
  image: string | null;
  importance: number;
  articleCount: number;
  sources: number;
  generated: boolean; // has a publishable, non-stub generated body
  status: string; // generator status, or 'UNGENERATED'
}

interface QueueRow {
  story_id: string;
  representative_title: string | null;
  topic: string | null;
  subject_country: string | null;
  image: string | null;
  importance: string | number | null;
  article_count: number | null;
  independent_source_count: number | null;
  generated: boolean | null;
  gen_status: string | null;
}

/** Surfaceable clusters from the last 24h, ranked by importance, annotated with generation state. */
export async function getQueue(limit = 50): Promise<QueueItem[]> {
  const rows = (await sqlAnalytics`
    SELECT sc.story_id,
           sc.representative_title,
           sc.topic,
           coalesce(nullif(sc.subject_country, ''), 'XX') AS subject_country,
           a.thumbnail_url AS image,
           round(sc.importance_score, 1) AS importance,
           sc.article_count,
           sc.independent_source_count,
           (g.story_id IS NOT NULL) AS generated,
           g.status AS gen_status
    FROM analytics.story_clusters_v8 sc
    LEFT JOIN articles a ON a.id = sc.representative_article_id
    LEFT JOIN analytics.story_generated_v8 g
      ON g.story_id = sc.story_id
     AND g.status = 'PUBLISHABLE'
     AND g.strategy <> 'stub'
     AND g.body IS NOT NULL
    WHERE sc.redirected_to IS NULL
      AND sc.suppression_reason IS NULL
      AND sc.representative_title IS NOT NULL
      AND sc.independent_source_count >= 2
      AND sc.article_count >= 3
      AND sc.last_seen_at > now() - interval '24 hours'
    ORDER BY sc.importance_score DESC NULLS LAST
    LIMIT ${limit}
  `) as unknown as QueueRow[];

  return rows.map(
    (r): QueueItem => ({
      storyId: r.story_id,
      title: r.representative_title || '(untitled)',
      topic: (r.topic || 'OTHER').toUpperCase(),
      country: r.subject_country || 'XX',
      image: r.image,
      importance: Number(r.importance ?? 0),
      articleCount: r.article_count ?? 0,
      sources: r.independent_source_count ?? 0,
      generated: !!r.generated,
      status: r.gen_status || 'UNGENERATED',
    }),
  );
}

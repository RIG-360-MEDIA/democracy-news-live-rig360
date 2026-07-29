// Editorial CMS — single-story loader for the inline Story Editor (epic 002, E3).
// Reads the generated row (analytics, read-only) and merges the editorial override
// (rigwire) so the editor sees generated originals, the override, and the effective
// (edited-wins) content side by side. No writes here — edits go through the API routes.

import { sqlAnalytics } from '@/lib/db';

import { getOverrides } from './overrides';
import type { EditorialOverride } from './types';

interface GenEditRow {
  story_id: string;
  headline: string | null;
  deck: string | null;
  body: string | null;
  topic: string | null;
  country: string | null;
  status: string | null;
  word_count: number | null;
  image: string | null;
}

export interface StoryForEdit {
  storyId: string;
  generated: {
    headline: string;
    deck: string;
    body: string;
    topic: string;
    country: string;
    status: string;
    wordCount: number;
    image: string | null;
  };
  override: EditorialOverride | null;
  effective: {
    headline: string;
    deck: string;
    body: string;
    image: string | null;
  };
}

/**
 * Load one story for the editor: generated content + cluster topic/country from
 * analytics, plus the editorial override from rigwire. Falls back to the cluster's
 * representative content when the story has no generated row yet, and returns null
 * only when neither exists. `effective` applies edited_* over generated.
 */
export async function getStoryForEdit(storyId: string): Promise<StoryForEdit | null> {
  const rows = (await sqlAnalytics`
    SELECT g.story_id, g.headline, g.deck, g.body, g.topic,
           coalesce(nullif(sc.subject_country, ''), 'XX') AS country,
           g.status, g.word_count, a.thumbnail_url AS image
    FROM analytics.story_generated_v8 g
    LEFT JOIN analytics.story_clusters_v8 sc ON sc.story_id = g.story_id
    LEFT JOIN articles a ON a.id = sc.representative_article_id
    WHERE g.story_id = ${storyId}
    ORDER BY g.updated_at DESC
    LIMIT 1
  `) as unknown as GenEditRow[];

  // A cluster on the page may have no generated row yet — fresh/provisional clusters, and the lead of
  // an event hub, are shown to readers via the cluster's representative title + article photo. Without
  // this fallback, "Edit" dead-ends on those rows ("Story not found"). Surface the representative
  // content as the generated base (no body/deck yet); editorial overrides still layer on top.
  const row =
    rows[0] ??
    (
      (await sqlAnalytics`
        SELECT sc.story_id, sc.representative_title AS headline, NULL AS deck, NULL AS body, sc.topic,
               coalesce(nullif(sc.subject_country, ''), 'XX') AS country,
               sc.status, 0 AS word_count, a.thumbnail_url AS image
        FROM analytics.story_clusters_v8 sc
        LEFT JOIN articles a ON a.id = sc.representative_article_id
        WHERE sc.story_id = ${storyId}
        LIMIT 1
      `) as unknown as GenEditRow[]
    )[0];

  if (!row) return null;

  const override = (await getOverrides([storyId])).get(storyId) ?? null;

  const generated = {
    headline: row.headline ?? '',
    deck: row.deck ?? '',
    body: row.body ?? '',
    topic: (row.topic ?? 'OTHER').toUpperCase(),
    country: row.country ?? 'XX',
    status: row.status ?? 'UNKNOWN',
    wordCount: row.word_count ?? 0,
    image: row.image ?? null,
  };

  const effective = {
    headline: override?.editedHeadline ?? generated.headline,
    deck: override?.editedDek ?? generated.deck,
    body: override?.editedBody ?? generated.body,
    image: override?.editedImage ?? generated.image,
  };

  return { storyId, generated, override, effective };
}

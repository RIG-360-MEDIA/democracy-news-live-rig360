// Editorial CMS — Desk feed: generated stories with editorial overrides applied (epic 002).

import { sqlAnalytics } from '@/lib/db';

import { getOverrides } from './overrides';
import type { DeskState, DeskStory, OverrideAction } from './types';

/** The one true state readers get: explicit editor decisions win; otherwise follow the machine. */
function deskState(genStatus: string, action: OverrideAction | undefined): DeskState {
  if (action === 'killed') return 'hidden';
  if (action === 'pinned') return 'top';
  if (action === 'live') return 'live'; // editor Published (force-surfaced, even if machine held it)
  return /^PUBLISHABLE/i.test(genStatus) ? 'live' : 'held'; // no editor decision → follow the machine
}

interface GenRow {
  story_id: string;
  headline: string | null;
  deck: string | null;
  topic: string | null;
  country: string | null;
  image: string | null;
  word_count: number | null;
  status: string | null;
  importance: string | number | null;
  updated_at: string | Date;
}

/** The feed as an editor sees it: publishable/held generated stories + overrides applied. */
export async function getDeskFeed(limit = 120): Promise<DeskStory[]> {
  const rows = (await sqlAnalytics`
    SELECT g.story_id, g.headline, g.deck, g.topic,
           coalesce(nullif(sc.subject_country, ''), 'XX') AS country,
           CASE WHEN ic.clean IS FALSE THEN NULL ELSE a.thumbnail_url END AS image,
           g.word_count, g.status, round(sc.importance_score, 1) AS importance, g.updated_at
    FROM analytics.story_generated_v8 g
    JOIN analytics.story_clusters_v8 sc ON sc.story_id = g.story_id
    LEFT JOIN articles a ON a.id = sc.representative_article_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    WHERE g.updated_at > now() - interval '48 hours'
      AND g.strategy <> 'stub'
      AND g.body IS NOT NULL
      -- hide parse-fail garbage rows (unparsed JSON body / '(parse-fail)' headline) from the Desk too
      AND g.headline NOT ILIKE '%(parse-fail)%'
      AND left(btrim(g.body), 1) <> '{'
    -- Desk sorts newest-generated first so editors see the freshest stories at
    -- the top (was importance_score DESC, which floated old high-scoring stories up).
    ORDER BY g.updated_at DESC
    LIMIT ${limit}
  `) as unknown as GenRow[];

  const ov = await getOverrides(rows.map((r) => r.story_id));

  return rows.map((r): DeskStory => {
    const o = ov.get(r.story_id);
    const base = Number(r.importance ?? 0);
    const action: OverrideAction = o?.action ?? 'held'; // 'held' = no editor decision → follow machine
    const edited = !!(o && (o.editedHeadline || o.editedDek || o.editedBody || o.editedImage));
    return {
      storyId: r.story_id,
      headline: o?.editedHeadline || r.headline || '(untitled)',
      dek: o?.editedDek ?? r.deck,
      topic: (r.topic || 'OTHER').toUpperCase(),
      country: r.country || 'XX',
      image: o?.editedImage ?? r.image,
      wordCount: r.word_count ?? 0,
      status: r.status || 'UNKNOWN',
      importance: base,
      effectiveImportance: base + (o?.importanceDelta ?? 0),
      updatedAt: new Date(r.updated_at).toISOString(),
      state: deskState(r.status || '', o?.action),
      action,
      pinnedRank: o?.pinnedRank ?? null,
      humanLocked: o?.humanLocked ?? false,
      edited,
      reason: o?.reason ?? null,
    };
  });
}

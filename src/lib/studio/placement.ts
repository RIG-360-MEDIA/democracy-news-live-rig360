// Editorial CMS — projected front-page placement for a story (Newsroom next-up + publish toast).
//
// Best-effort projection: mirrors the reader ranking's topic→section map and orders by
// importance_score within a section. Read-only via sqlAnalytics. The true reader order is computed
// by worldwide/ranking.ts (recency-decayed, diversity-capped); this approximates *where a story
// would land* so an editor sees a stable "→ Politics #4" before promoting it. Next-up and the
// publish toast both call through here, so they always agree on the number they show.

import { sqlAnalytics } from '@/lib/db';

export interface Placement {
  /** Canonical section token (e.g. 'POLITICS'), matching ranking.ts SECTION_TOPICS. */
  section: string;
  /** 1-based position within that section. */
  position: number;
}

// Mirrors worldwide/ranking.ts TOPIC_TO_SECTION. That module is read-only and does not export the
// map, so this is a deliberate small copy (code-style rule 1: two copies of 15 lines beat one wrong
// abstraction that couples Newsroom projection to the reader ranking's internals).
const TOPIC_TO_SECTION: Record<string, string | null> = {
  POLITICS: 'POLITICS', GOVERNANCE: 'POLITICS',
  SPORTS: 'SPORTS',
  SECURITY: 'SECURITY',
  ENVIRONMENT: 'ENVIRONMENT', AGRICULTURE: 'ENVIRONMENT',
  HEALTH: 'HEALTH',
  BUSINESS: 'BUSINESS', INFRASTRUCTURE: 'BUSINESS',
  FINANCE: 'FINANCE',
  LEGAL: 'LEGAL',
  TECHNOLOGY: 'TECHNOLOGY', SCIENCE: 'TECHNOLOGY', TECH: 'TECHNOLOGY',
  CULTURE: 'SOCIETY', SOCIETY: 'SOCIETY', SOCIAL: 'SOCIETY',
  INTERNATIONAL: null, OTHER: null,
};

function sectionOf(topic: string): string | null {
  return TOPIC_TO_SECTION[topic.toUpperCase()] ?? null;
}

interface TopicImp {
  topic: string;
  imp: number;
}

interface PoolRow {
  id: string;
  topic: string | null;
  imp: string | number | null;
}

/** All currently-publishable stories (id, topic, importance) in the reader window — the pool that
 *  determines each section's ordering. One query, shared by both projection entry points below. */
async function loadPool(): Promise<PoolRow[]> {
  return (await sqlAnalytics`
    SELECT DISTINCT ON (g.story_id)
           g.story_id AS id,
           coalesce(nullif(g.topic, ''), nullif(sc.topic, ''), 'OTHER') AS topic,
           sc.importance_score AS imp
    FROM analytics.story_generated_v8 g
    JOIN analytics.story_clusters_v8 sc ON sc.story_id = g.story_id
    WHERE g.status LIKE 'PUBLISHABLE%'
      AND g.strategy <> 'stub'
      AND g.body IS NOT NULL
      AND sc.last_seen_at > now() - interval '7 days'
    ORDER BY g.story_id, g.updated_at DESC
  `) as unknown as PoolRow[];
}

/** Topic + importance for the requested stories — works for held/ungenerated clusters too (the
 *  target may not be in the publishable pool yet, but it still has a cluster importance). */
async function loadTargets(storyIds: string[]): Promise<Map<string, TopicImp>> {
  const rows = (await sqlAnalytics`
    SELECT DISTINCT ON (sc.story_id)
           sc.story_id AS id,
           coalesce(nullif(g.topic, ''), nullif(sc.topic, ''), 'OTHER') AS topic,
           sc.importance_score AS imp
    FROM analytics.story_clusters_v8 sc
    LEFT JOIN analytics.story_generated_v8 g ON g.story_id = sc.story_id
    WHERE sc.story_id = ANY(${storyIds})
    ORDER BY sc.story_id, g.updated_at DESC NULLS LAST
  `) as unknown as PoolRow[];
  const m = new Map<string, TopicImp>();
  for (const r of rows) m.set(r.id, { topic: r.topic ?? 'OTHER', imp: Number(r.imp ?? 0) });
  return m;
}

/** Project placements for many stories at once (Newsroom next-up + live lanes). */
export async function projectPlacements(
  storyIds: ReadonlyArray<string>,
): Promise<Map<string, Placement | null>> {
  const out = new Map<string, Placement | null>();
  if (storyIds.length === 0) return out;

  const ids = [...new Set(storyIds)];
  const [pool, targets] = await Promise.all([loadPool(), loadTargets(ids)]);

  // Pre-index the pool by section so each story is an O(section) count, not O(pool).
  const bySection = new Map<string, number[]>();
  for (const r of pool) {
    const section = sectionOf(r.topic ?? 'OTHER');
    if (!section) continue;
    const list = bySection.get(section) ?? [];
    list.push(Number(r.imp ?? 0));
    bySection.set(section, list);
  }

  for (const id of ids) {
    const tgt = targets.get(id);
    if (!tgt) {
      out.set(id, null);
      continue;
    }
    const section = sectionOf(tgt.topic);
    if (!section) {
      out.set(id, null);
      continue;
    }
    const imps = bySection.get(section) ?? [];
    // Position = 1 + how many *other* pool stories in this section outrank it.
    const higher = imps.filter((v) => v > tgt.imp).length;
    out.set(id, { section, position: higher + 1 });
  }
  return out;
}

/** Project the front-page placement of a single story (publish toast). Shares loadPool/loadTargets
 *  with projectPlacements so the toast and the next-up lane never disagree. */
export async function projectPlacement(storyId: string): Promise<Placement | null> {
  const map = await projectPlacements([storyId]);
  return map.get(storyId) ?? null;
}

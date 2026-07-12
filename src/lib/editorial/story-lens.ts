// src/lib/editorial/story-lens.ts
//
// STEP 3 data layer — the "powerful views" over a merged event, computed from the PRESERVED cluster
// fragments (analytics.story_dedup maps every fragment → its canonical event; fragments are kept
// precisely so we can aggregate them here). Three lenses on one real-world event:
//
//   • timeline()     — every article across all fragments, in publish order (the story over time).
//   • bias()         — coverage split by source political lean (Ground-News-style left/right spread).
//   • perspectives() — the distinct outlets covering it, each with lean + a sample article.
//
// A "canonical event" = the canonical story_id plus every fragment story_id that story_dedup folds into
// it. NOTE ON DATA SOURCE: these read analytics.* + public.* (fragments, members, articles, sources).
// The standalone CMS points its analytics client at the BOX (full fidelity); the DNL read-mirror on
// Neon carries only a bounded window, so run these against the box for complete coverage.

import { sqlAnalytics } from '@/lib/db';

// The fragment set for an event: the canonical id + everything story_dedup folds into it.
const FRAG_CTE = (canonicalId: string) => sqlAnalytics`
  WITH canon AS (SELECT ${canonicalId}::uuid AS cid),
  frag AS (
    SELECT cid AS story_id FROM canon
    UNION
    SELECT d.story_id FROM analytics.story_dedup d, canon WHERE d.canonical_story_id = canon.cid
  ),
  arts AS (
    SELECT DISTINCT a.id, a.title, a.published_at, a.source_id, a.url
    FROM analytics.story_cluster_members_v8 m
    JOIN frag f ON f.story_id = m.story_id
    JOIN public.articles a ON a.id = m.article_id
  )`;

export type Lean = 'left' | 'center' | 'right' | 'state' | 'unknown';
const LEAN_SQL = sqlAnalytics`
  CASE WHEN s.political_lean IN ('left','lean-left') THEN 'left'
       WHEN s.political_lean IN ('right','lean-right') THEN 'right'
       WHEN s.political_lean = 'center' THEN 'center'
       WHEN s.political_lean = 'state' THEN 'state'
       ELSE 'unknown' END`;

export interface TimelineEntry { at: string | null; source: string; lean: Lean; title: string; url: string }

/** Every article across the event's fragments, oldest→newest — the story as it developed. */
export async function timeline(canonicalId: string, limit = 200): Promise<TimelineEntry[]> {
  const rows = (await sqlAnalytics`
    ${FRAG_CTE(canonicalId)}
    SELECT arts.published_at AS at, coalesce(s.name,'Unknown') AS source, ${LEAN_SQL} AS lean,
           arts.title, arts.url
    FROM arts LEFT JOIN public.sources s ON s.id = arts.source_id
    ORDER BY arts.published_at ASC NULLS LAST
    LIMIT ${limit}`) as unknown as Array<{ at: string | Date | null; source: string; lean: Lean; title: string; url: string }>;
  return rows.map((r) => ({ at: r.at ? new Date(r.at).toISOString() : null, source: r.source, lean: r.lean, title: r.title, url: r.url }));
}

export interface BiasSplit { left: number; center: number; right: number; state: number; unknown: number; total: number }

/** Coverage split by source lean — the "who is (and isn't) covering this, and from which side" view. */
export async function bias(canonicalId: string): Promise<BiasSplit> {
  const rows = (await sqlAnalytics`
    ${FRAG_CTE(canonicalId)}
    SELECT ${LEAN_SQL} AS lean, count(DISTINCT arts.id)::int AS n
    FROM arts LEFT JOIN public.sources s ON s.id = arts.source_id
    GROUP BY 1`) as unknown as Array<{ lean: Lean; n: number }>;
  const out: BiasSplit = { left: 0, center: 0, right: 0, state: 0, unknown: 0, total: 0 };
  for (const r of rows) { out[r.lean] = r.n; out.total += r.n; }
  return out;
}

export interface Perspective { source: string; lean: Lean; articleCount: number; sampleTitle: string; sampleUrl: string }

/** One row per outlet covering the event — the multi-source perspective list. */
export async function perspectives(canonicalId: string, limit = 40): Promise<Perspective[]> {
  const rows = (await sqlAnalytics`
    ${FRAG_CTE(canonicalId)}
    SELECT coalesce(s.name,'Unknown') AS source, ${LEAN_SQL} AS lean,
           count(*)::int AS n,
           (array_agg(arts.title ORDER BY arts.published_at DESC))[1] AS sample_title,
           (array_agg(arts.url   ORDER BY arts.published_at DESC))[1] AS sample_url
    FROM arts LEFT JOIN public.sources s ON s.id = arts.source_id
    GROUP BY 1, 2
    ORDER BY n DESC
    LIMIT ${limit}`) as unknown as Array<{ source: string; lean: Lean; n: number; sample_title: string; sample_url: string }>;
  return rows.map((r) => ({ source: r.source, lean: r.lean, articleCount: r.n, sampleTitle: r.sample_title, sampleUrl: r.sample_url }));
}

/** The full lens for one event — everything the CMS story-detail view needs in one call. */
export async function storyLens(canonicalId: string) {
  const [tl, bs, ps] = await Promise.all([timeline(canonicalId), bias(canonicalId), perspectives(canonicalId)]);
  return { canonicalId, timeline: tl, bias: bs, perspectives: ps };
}

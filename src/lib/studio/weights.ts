// Editorial CMS — ranking weights data access (epic 002, E5).
// Singleton row rigwire.ranking_weights id=1 holds every knob the reader-side
// ranking build consumes — topic/country weights, the scoring knobs (F11) and the front-page section
// layout (F12). Read-merge-write keeps patches immutable; every write is audited in the same
// transaction (F7).
//
// The row is read as to_jsonb(row) so a column added by a later migration (section_layout, 009) is
// simply absent — not an SQL error — on a database where that migration has not run yet: the reader
// front page keeps rendering with the default layout.

import { sql } from '@/lib/db';

import { DEFAULT_KNOBS } from '@/lib/worldwide/scoring';
import { DEFAULT_SECTION_LAYOUT, resolveSectionLayout } from '@/lib/worldwide/sections';

import { writeAudit, type Snapshot } from './audit-log';
import type { RankingWeights } from './types';

interface WeightsRow {
  topic_weights: Record<string, number> | null;
  country_weights: Record<string, number> | null;
  recency_halflife_h: string | number | null;
  source_weight: string | number | null;
  velocity_weight: string | number | null;
  section_layout?: unknown; // absent until migration 009
  updated_by: string | null;
  updated_at: string | Date;
}

/** Coerce a jsonb weight map (unknown from the driver) into Record<string, number>. */
function toWeightMap(raw: Record<string, number> | null): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function toWeights(r: WeightsRow): RankingWeights {
  return {
    topicWeights: toWeightMap(r.topic_weights),
    countryWeights: toWeightMap(r.country_weights),
    recencyHalflifeH: Number(r.recency_halflife_h ?? DEFAULT_KNOBS.recencyHalflifeH),
    sourceWeight: Number(r.source_weight ?? DEFAULT_KNOBS.sourceWeight),
    velocityWeight: Number(r.velocity_weight ?? DEFAULT_KNOBS.velocityWeight),
    sectionLayout: resolveSectionLayout(r.section_layout),
    updatedBy: r.updated_by ?? 'system',
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const DEFAULTS: RankingWeights = {
  topicWeights: {},
  countryWeights: {},
  ...DEFAULT_KNOBS,
  sectionLayout: DEFAULT_SECTION_LAYOUT,
  updatedBy: 'system',
  updatedAt: new Date(0).toISOString(),
};

/** The singleton ranking weights (id=1), or system defaults if the row is absent. */
export async function getWeights(): Promise<RankingWeights> {
  const rows = (await sql`
    SELECT to_jsonb(w) AS row FROM rigwire.ranking_weights w WHERE id = 1
  `) as unknown as Array<{ row: WeightsRow }>;
  const row = rows[0]?.row;
  return row ? toWeights(row) : DEFAULTS;
}

export type WeightsPatch = Partial<Omit<RankingWeights, 'updatedBy' | 'updatedAt'>>;

/** Audit snapshot: the tunable knobs only (updatedAt/updatedBy live on the audit row itself). */
function snapshot(w: RankingWeights): Snapshot {
  return {
    topicWeights: w.topicWeights,
    countryWeights: w.countryWeights,
    recencyHalflifeH: w.recencyHalflifeH,
    sourceWeight: w.sourceWeight,
    velocityWeight: w.velocityWeight,
    sectionLayout: w.sectionLayout,
  };
}

/** Merge a patch onto the singleton, persist to id=1, stamp the editor, and audit — atomically.
 *  The weights also carry per-section prominence (topicWeights), so this is the section write too. */
export async function setWeights(patch: WeightsPatch, editorId: string): Promise<RankingWeights> {
  return sql.begin(async (tx) => {
    const rows = (await tx`
      SELECT to_jsonb(w) AS row FROM rigwire.ranking_weights w WHERE id = 1 FOR UPDATE
    `) as unknown as Array<{ row: WeightsRow }>;
    const existing = rows[0] ? toWeights(rows[0].row) : DEFAULTS;
    const next: RankingWeights = {
      ...existing,
      ...patch,
      topicWeights: { ...existing.topicWeights, ...(patch.topicWeights ?? {}) },
      countryWeights: { ...existing.countryWeights, ...(patch.countryWeights ?? {}) },
      updatedBy: editorId,
      updatedAt: new Date().toISOString(),
    };
    await tx`
      INSERT INTO rigwire.ranking_weights
        (id, topic_weights, country_weights, recency_halflife_h,
         source_weight, velocity_weight, updated_by, updated_at)
      VALUES (1,
         ${tx.json(next.topicWeights as unknown as Parameters<typeof tx.json>[0])},
         ${tx.json(next.countryWeights as unknown as Parameters<typeof tx.json>[0])},
         ${next.recencyHalflifeH}, ${next.sourceWeight}, ${next.velocityWeight},
         ${next.updatedBy}, now())
      ON CONFLICT (id) DO UPDATE SET
        topic_weights=EXCLUDED.topic_weights, country_weights=EXCLUDED.country_weights,
        recency_halflife_h=EXCLUDED.recency_halflife_h, source_weight=EXCLUDED.source_weight,
        velocity_weight=EXCLUDED.velocity_weight, updated_by=EXCLUDED.updated_by,
        updated_at=now()`;
    // Only touched when the caller saves a layout, so knob/weight saves keep working on a database
    // that has not yet run migration 009 (which adds the column).
    if (patch.sectionLayout !== undefined) {
      await tx`
        UPDATE rigwire.ranking_weights
        SET section_layout = ${tx.json(next.sectionLayout as unknown as Parameters<typeof tx.json>[0])}
        WHERE id = 1`;
    }
    await writeAudit(tx, {
      actor: editorId,
      action: 'weights_update',
      target: 'ranking_weights',
      before: rows[0] ? snapshot(existing) : null,
      after: snapshot(next),
    });
    return next;
  }) as Promise<RankingWeights>;
}

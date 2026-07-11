// Editorial CMS — ranking weights data access (epic 002, E5).
// Singleton row rigwire.ranking_weights id=1 holds every knob the reader-side
// ranking build consumes. Read-merge-write keeps patches immutable.

import { sql } from '@/lib/db';

import type { RankingWeights } from './types';

interface WeightsRow {
  topic_weights: Record<string, number> | null;
  country_weights: Record<string, number> | null;
  recency_halflife_h: string | number | null;
  source_weight: string | number | null;
  velocity_weight: string | number | null;
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
    recencyHalflifeH: Number(r.recency_halflife_h ?? 24),
    sourceWeight: Number(r.source_weight ?? 1),
    velocityWeight: Number(r.velocity_weight ?? 1),
    updatedBy: r.updated_by ?? 'system',
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const DEFAULTS: RankingWeights = {
  topicWeights: {},
  countryWeights: {},
  recencyHalflifeH: 24,
  sourceWeight: 1,
  velocityWeight: 1,
  updatedBy: 'system',
  updatedAt: new Date(0).toISOString(),
};

/** The singleton ranking weights (id=1), or system defaults if the row is absent. */
export async function getWeights(): Promise<RankingWeights> {
  const rows = (await sql`
    SELECT topic_weights, country_weights, recency_halflife_h,
           source_weight, velocity_weight, updated_by, updated_at
    FROM rigwire.ranking_weights
    WHERE id = 1
  `) as unknown as WeightsRow[];
  const row = rows[0];
  return row ? toWeights(row) : DEFAULTS;
}

export type WeightsPatch = Partial<Omit<RankingWeights, 'updatedBy' | 'updatedAt'>>;

/** Merge a patch onto the singleton, persist to id=1, and stamp the editor. */
export async function setWeights(patch: WeightsPatch, editorId: string): Promise<RankingWeights> {
  const existing = await getWeights();
  const next: RankingWeights = {
    ...existing,
    ...patch,
    topicWeights: { ...existing.topicWeights, ...(patch.topicWeights ?? {}) },
    countryWeights: { ...existing.countryWeights, ...(patch.countryWeights ?? {}) },
    updatedBy: editorId,
    updatedAt: new Date().toISOString(),
  };
  await sql`
    INSERT INTO rigwire.ranking_weights
      (id, topic_weights, country_weights, recency_halflife_h,
       source_weight, velocity_weight, updated_by, updated_at)
    VALUES (1,
       ${sql.json(next.topicWeights as unknown as Parameters<typeof sql.json>[0])},
       ${sql.json(next.countryWeights as unknown as Parameters<typeof sql.json>[0])},
       ${next.recencyHalflifeH}, ${next.sourceWeight}, ${next.velocityWeight},
       ${next.updatedBy}, now())
    ON CONFLICT (id) DO UPDATE SET
      topic_weights=EXCLUDED.topic_weights, country_weights=EXCLUDED.country_weights,
      recency_halflife_h=EXCLUDED.recency_halflife_h, source_weight=EXCLUDED.source_weight,
      velocity_weight=EXCLUDED.velocity_weight, updated_by=EXCLUDED.updated_by,
      updated_at=now()`;
  return next;
}

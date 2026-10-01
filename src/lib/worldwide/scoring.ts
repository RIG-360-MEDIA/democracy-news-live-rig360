// Worldwide importance scoring with the editor ranking knobs (F11). Pure — no DB, no clock reads.
//
// importance = ( sourceWeight   · ln(1 + independent sources)          — breadth
//              + 0.5            · ln(1 + min(facts, 15))                — substance
//              + tier bonus     (tier-1 source 1.0 · tier-2 0.3)        — scoop quality
//              + velocityWeight · VELOCITY_COEF · ln(1 + articles/hour) — how fast the cluster grows )
//            × recency gate   (0.03 + 0.97 · 2^(−age / recencyHalflifeH))
//            × pile demotion  (0.25 for a HELD multi-event stub)
//            × sport demotion (0.4)
//
// The knobs live in rigwire.ranking_weights (Studio → Ranking). They are clamped to safe bounds here,
// so a bad stored value can degrade ranking quality but never break or invert it.

import type { RankingWeights } from '@/lib/studio/types';

export interface ScoreInput {
  independentSources: number;
  facts: number;
  /** Representative article's source tier (1 best); null → treated as tier 2. */
  repTier: number | null;
  articleCount: number;
  /** Seconds since the cluster was last seen (clamped ≥ 0). */
  ageSeconds: number;
  /** Hours between the cluster's first and last article (velocity denominator, floored at 1h). */
  spanHours: number;
  /** A confirmed multi-event pile (Guard-C SEVERAL → HELD stub). */
  pileDemoted: boolean;
  topic: string;
}

export type ScoringKnobs = Pick<RankingWeights, 'recencyHalflifeH' | 'sourceWeight' | 'velocityWeight'>;

/** Defaults = today's front page, exactly (migration 009 writes the same values and column defaults):
 *  - half-life 16.6355h = 24·ln2 — the pre-F11 SQL's 24h e-fold decay, as a true half-life;
 *  - velocity 0 — the old scorer had no velocity term, so velocity is opt-in. */
export const DEFAULT_KNOBS: ScoringKnobs = {
  recencyHalflifeH: 16.6355,
  sourceWeight: 1,
  velocityWeight: 0,
};

export const KNOB_BOUNDS = {
  recencyHalflifeH: { min: 1, max: 168 },
  sourceWeight: { min: 0, max: 3 },
  velocityWeight: { min: 0, max: 3 },
} as const;

const VELOCITY_COEF = 0.25;
const FACTS_CAP = 15;
const RECENCY_FLOOR = 0.03;

function clampKnob(value: unknown, key: keyof typeof KNOB_BOUNDS): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_KNOBS[key];
  const { min, max } = KNOB_BOUNDS[key];
  return Math.min(max, Math.max(min, n));
}

/** Knobs from a (possibly partial / malformed) weights row, with defaults and bounds applied. */
export function normalizeKnobs(w: Partial<ScoringKnobs> | null | undefined): ScoringKnobs {
  return {
    recencyHalflifeH: clampKnob(w?.recencyHalflifeH, 'recencyHalflifeH'),
    sourceWeight: clampKnob(w?.sourceWeight, 'sourceWeight'),
    velocityWeight: clampKnob(w?.velocityWeight, 'velocityWeight'),
  };
}

function tierBonus(tier: number | null): number {
  const t = tier ?? 2;
  if (t === 1) return 1.0;
  if (t === 2) return 0.3;
  return 0;
}

/** Importance of one story under the given knobs (rounded to 2 dp like the SQL it replaces). */
export function scoreStory(s: ScoreInput, knobs: ScoringKnobs): number {
  const k = normalizeKnobs(knobs);
  const articlesPerHour = Math.max(0, s.articleCount) / Math.max(1, s.spanHours);
  const base =
    k.sourceWeight * Math.log(1 + Math.max(0, s.independentSources)) +
    0.5 * Math.log(1 + Math.min(Math.max(0, s.facts), FACTS_CAP)) +
    tierBonus(s.repTier) +
    k.velocityWeight * VELOCITY_COEF * Math.log(1 + articlesPerHour);
  const ageH = Math.max(0, s.ageSeconds) / 3600;
  const recency = RECENCY_FLOOR + (1 - RECENCY_FLOOR) * Math.pow(2, -ageH / k.recencyHalflifeH);
  const pile = s.pileDemoted ? 0.25 : 1;
  const sport = s.topic.toUpperCase() === 'SPORTS' ? 0.4 : 1;
  return Math.round(base * recency * pile * sport * 100) / 100;
}

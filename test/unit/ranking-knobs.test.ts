// F11 — the Studio ranking knobs (recency half-life, source weight, velocity weight) actually change
// the front-page order. A fixed fixture is ranked under default knobs, then each knob is moved alone
// and the order must change in the expected direction.
import { describe, expect, it } from 'vitest';

import { DEFAULT_KNOBS, normalizeKnobs, scoreStory, type ScoreInput, type ScoringKnobs } from '@/lib/worldwide/scoring';

const H = 3600;

const base: ScoreInput = {
  independentSources: 4,
  facts: 5,
  repTier: 2,
  articleCount: 6,
  ageSeconds: 2 * H,
  spanHours: 12,
  pileDemoted: false,
  topic: 'POLITICS',
};

/** Fixed fixture: each story wins on exactly one dimension. */
const FIXTURE: Record<string, ScoreInput> = {
  // broad but older: 30 sources, last seen 14h ago
  broad: { ...base, independentSources: 30, ageSeconds: 14 * H },
  // fresh but narrow: 2 sources, seen 10 min ago
  fresh: { ...base, independentSources: 2, ageSeconds: 600 },
  // breaking: 2 sources but 90 articles in 1.5h, seen 4h ago
  surging: { ...base, independentSources: 2, articleCount: 90, spanHours: 1.5, ageSeconds: 4 * H },
};

function order(knobs: ScoringKnobs): string[] {
  return Object.entries(FIXTURE)
    .map(([id, s]) => ({ id, score: scoreStory(s, knobs) }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.id);
}

describe('F11 ranking knobs change the order of a fixed fixture', () => {
  const baseline = order(DEFAULT_KNOBS);

  it('recency half-life: a longer half-life lets the broad-but-older story overtake the fresh one', () => {
    const short = order({ ...DEFAULT_KNOBS, recencyHalflifeH: 4 });
    const long = order({ ...DEFAULT_KNOBS, recencyHalflifeH: 120 });
    expect(short.indexOf('fresh')).toBeLessThan(short.indexOf('broad'));
    expect(long.indexOf('broad')).toBeLessThan(long.indexOf('fresh'));
    expect(short).not.toEqual(long);
  });

  it('source weight: weighting breadth up moves the 30-source story to the top', () => {
    const low = order({ ...DEFAULT_KNOBS, sourceWeight: 0 });
    const high = order({ ...DEFAULT_KNOBS, sourceWeight: 3 });
    expect(high[0]).toBe('broad');
    expect(low[0]).not.toBe('broad');
    expect(low).not.toEqual(high);
  });

  it('velocity weight: rewarding growth lifts the surging cluster above the fresh one', () => {
    const off = order({ ...DEFAULT_KNOBS, velocityWeight: 0 });
    const on = order({ ...DEFAULT_KNOBS, velocityWeight: 3 });
    expect(off.indexOf('fresh')).toBeLessThan(off.indexOf('surging'));
    expect(on.indexOf('surging')).toBeLessThan(on.indexOf('fresh'));
  });

  it('every knob is live: moving any single one away from default changes some score', () => {
    const s = FIXTURE.surging;
    const d = scoreStory(s, DEFAULT_KNOBS);
    expect(scoreStory(s, { ...DEFAULT_KNOBS, recencyHalflifeH: 2 })).not.toBe(d);
    expect(scoreStory(s, { ...DEFAULT_KNOBS, sourceWeight: 2 })).not.toBe(d);
    expect(scoreStory(s, { ...DEFAULT_KNOBS, velocityWeight: 2 })).not.toBe(d);
    expect(baseline).toHaveLength(3);
  });
});

describe('F11 knob safety', () => {
  it('clamps out-of-range values and falls back to defaults for garbage', () => {
    expect(normalizeKnobs({ recencyHalflifeH: 0, sourceWeight: 99, velocityWeight: -1 })).toEqual({
      recencyHalflifeH: 1,
      sourceWeight: 3,
      velocityWeight: 0,
    });
    expect(normalizeKnobs({ recencyHalflifeH: Number.NaN })).toEqual(DEFAULT_KNOBS);
    expect(normalizeKnobs(null)).toEqual(DEFAULT_KNOBS);
  });

  it('at velocity 0 the default knobs reproduce the pre-F11 SQL score (24h e-fold decay)', () => {
    const s = { ...base, ageSeconds: 30 * H };
    const sql =
      (Math.log(1 + 4) + 0.5 * Math.log(1 + 5) + 0.3) * (0.03 + 0.97 * Math.exp(-30 / 24));
    expect(scoreStory(s, { ...DEFAULT_KNOBS, velocityWeight: 0 })).toBeCloseTo(sql, 2);
  });

  it('keeps the sport and pile demotions', () => {
    const plain = scoreStory(base, DEFAULT_KNOBS);
    expect(scoreStory({ ...base, topic: 'SPORTS' }, DEFAULT_KNOBS)).toBeCloseTo(plain * 0.4, 1);
    expect(scoreStory({ ...base, pileDemoted: true }, DEFAULT_KNOBS)).toBeCloseTo(plain * 0.25, 1);
  });
});

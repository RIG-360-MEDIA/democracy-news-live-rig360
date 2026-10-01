// F11 fix — CMS manual stories store importance on the editor's 0–100 scale; automated stories score
// ~0.5–3. Mapped as a percentile of the automated pool, a manual story at 40 lands mid-pool and one at
// 100 near the top — but never above a pinned rank-1 lead.
import { describe, expect, it } from 'vitest';

import { rankWithOverrides } from '@/lib/worldwide/editorial-rank';
import { editorImportanceToPool, FALLBACK_POOL_RANGE, placeManualCards } from '@/lib/worldwide/manual-importance';

import type { EditorialOverride } from '@/lib/studio/types';
import type { StoryCard } from '@/lib/worldwide/types';

function card(id: string, importance: number): StoryCard {
  return {
    id, title: `Story ${id}`, deck: null, image: null, hasArticle: true, topic: 'OTHER', country: 'XX',
    importance, independentSources: 1, articleCount: 1, facts: 0, lastSeenAt: new Date(0).toISOString(),
    freshnessSeconds: 60, isScoop: false, dominantEntity: null,
  };
}

// A realistic automated pool: ten generated stories scored 0.5 … 2.9.
const AUTOMATED = [0.5, 0.7, 0.9, 1.1, 1.3, 1.6, 1.9, 2.2, 2.6, 2.9].map((imp, i) => card(`auto-${i}`, imp));
const NEUTRAL = { topicWeights: {}, countryWeights: {} };
const NOW = Date.parse('2026-10-01T12:00:00Z');

function pinnedLead(storyId: string): EditorialOverride {
  return {
    storyId, action: 'pinned', pinnedRank: 1, pinnedUntil: '2026-10-01T20:00:00Z', importanceDelta: 0,
    sectionOverride: null, humanLocked: false, editedHeadline: null, editedDek: null, editedBody: null,
    editedTags: null, editedImage: null, editorId: 'e', reason: null, updatedAt: new Date(0).toISOString(),
  };
}

describe('editorImportanceToPool', () => {
  const pool = AUTOMATED.map((c) => c.importance);

  it('reads 0–100 as a percentile of the automated pool (0 → weakest, 100 → strongest, never above)', () => {
    expect(editorImportanceToPool(0, pool)).toBe(0.5);
    expect(editorImportanceToPool(100, pool)).toBe(2.9);
    expect(editorImportanceToPool(40, pool)).toBeCloseTo(1.1 + (1.3 - 1.1) * 0.6, 5); // pos 3.6 of 0..9
  });

  it('clamps out-of-range and garbage values; an empty pool maps linearly onto the fallback range', () => {
    expect(editorImportanceToPool(250, pool)).toBe(2.9);
    expect(editorImportanceToPool(-5, pool)).toBe(0.5);
    expect(editorImportanceToPool(Number.NaN, pool)).toBe(0.5);
    expect(editorImportanceToPool(100, [])).toBe(FALLBACK_POOL_RANGE.max);
    expect(editorImportanceToPool(0, [])).toBe(FALLBACK_POOL_RANGE.min);
  });

  it('does not mutate the stored manual cards', () => {
    const manual = [card('m', 40)];
    const placed = placeManualCards(manual, AUTOMATED);
    expect(manual[0].importance).toBe(40);
    expect(placed[0].importance).toBeLessThan(3);
  });
});

describe('manual stories rank inside the pool, not above it', () => {
  const manual = placeManualCards([card('manual-40', 40), card('manual-100', 100)], AUTOMATED);

  it('a manual story at 40 lands mid-pool; one at 100 near the top', () => {
    const order = rankWithOverrides([...AUTOMATED, ...manual], new Map(), NEUTRAL, NOW).map((c) => c.id);
    const at40 = order.indexOf('manual-40');
    expect(at40).toBeGreaterThan(3);
    expect(at40).toBeLessThan(order.length - 3);
    expect(order.indexOf('manual-100')).toBeLessThanOrEqual(1); // ties the strongest automated story
  });

  it('the old raw behaviour is gone: a 40 no longer outranks every generated story', () => {
    const order = rankWithOverrides([...AUTOMATED, ...manual], new Map(), NEUTRAL, NOW).map((c) => c.id);
    expect(order[0]).not.toBe('manual-40');
  });

  it('a manual 100 never beats a pinned rank-1 lead, even a weak one', () => {
    const overrides = new Map([['auto-0', pinnedLead('auto-0')]]);
    const order = rankWithOverrides([...AUTOMATED, ...manual], overrides, NEUTRAL, NOW).map((c) => c.id);
    expect(order[0]).toBe('auto-0');
    expect(order.indexOf('manual-100')).toBeLessThanOrEqual(2);
  });
});

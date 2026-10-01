// Editorial overrides win on read (epic 002) — the pure pool-ranking step of getFrontPage.
// Empty overrides + neutral weights ⇒ the pool order is pure automation.
//
//   killed → hide everywhere · edited_* → replace headline/deck/image · importance_delta → re-rank ·
//   active pin → +10000 boost (leads Top Stories; expired pins don't, F10) ·
//   topic/country weights → multiplier on importance.
//
// Pure: returns new cards sorted by importance (desc); inputs are never mutated.

import { isPinActive } from '@/lib/studio/pins';
import type { EditorialOverride, RankingWeights } from '@/lib/studio/types';

import { sectionOf } from './sections';

import type { StoryCard } from './types';

const PIN_BOOST = 10000;

/** An editor decision that force-surfaces a story past the machine's HOLD and publish buffer:
 *  explicitly Published ('live'), or pinned with the pin still active. An EXPIRED pin forces nothing —
 *  it behaves exactly like a story the editor never touched (review fix, F10). */
export function isForceSurfaced(o: EditorialOverride | null | undefined, nowMs: number): boolean {
  return o?.action === 'live' || isPinActive(o, nowMs);
}

/** Ids whose override force-surfaces them (see isForceSurfaced). */
export function forcedStoryIds(overrides: ReadonlyMap<string, EditorialOverride>, nowMs: number): string[] {
  return [...overrides.values()].filter((o) => isForceSurfaced(o, nowMs)).map((o) => o.storyId);
}

export function rankWithOverrides(
  pool: ReadonlyArray<StoryCard>,
  overrides: ReadonlyMap<string, EditorialOverride>,
  weights: Pick<RankingWeights, 'topicWeights' | 'countryWeights'>,
  nowMs: number,
): StoryCard[] {
  const tw = weights.topicWeights;
  const cw = weights.countryWeights;
  return pool
    .filter((c) => overrides.get(c.id)?.action !== 'killed')
    .map((c) => {
      const o = overrides.get(c.id);
      // editor ranking knobs: per-section topic weight × per-country weight (default 1 → no change)
      const section = sectionOf(c.topic);
      const wMul = (section ? tw[section] ?? 1 : 1) * (cw[c.country] ?? 1);
      // An expired pin (F10) no longer forces rank — the story stays Published, the machine orders it.
      const pinned = isPinActive(o, nowMs);
      const pinBoost = pinned ? PIN_BOOST - (o?.pinnedRank ?? 1) : 0;
      const importance = c.importance * wMul + (o?.importanceDelta ?? 0) + pinBoost;
      if (importance === c.importance && !o?.editedHeadline && !o?.editedDek && !o?.editedImage) return c;
      return {
        ...c,
        image: o?.editedImage ?? c.image,
        title: o?.editedHeadline ?? c.title,
        deck: o?.editedDek ?? c.deck,
        importance,
        pinned,
      };
    })
    .sort((a, b) => b.importance - a.importance);
}

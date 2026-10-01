// Editorial pins — expiry + the one-story-per-rank rule (F10). Pure, client-safe (no DB imports).
//
// A pin is never forever: every pin carries `pinnedUntil` (set when it is pinned; PIN_TTL_HOURS
// later). After that the story still counts as editor-Published (force-surfaced) but loses its
// forced rank, so the machine ranking takes over again. A pin with no expiry (a row written before
// migration 008) is treated as active; migration 008 back-fills an expiry onto those.

import type { EditorialOverride } from './types';

export const PIN_TTL_HOURS = 12;

/** Most Top Stories slots an editor can pin in one reorder (matches ranking.ts TOP_STORIES_MAX). */
export const MAX_REORDER = 12;

/** ISO expiry for a pin written at `nowMs`. */
export function pinExpiry(nowMs: number): string {
  return new Date(nowMs + PIN_TTL_HOURS * 3600_000).toISOString();
}

type PinFields = Pick<EditorialOverride, 'action' | 'pinnedRank' | 'pinnedUntil'>;

/** True while the override is a pin that has not yet expired. */
export function isPinActive(o: PinFields | null | undefined, nowMs: number): boolean {
  if (!o || o.action !== 'pinned') return false;
  if (!o.pinnedUntil) return true;
  return new Date(o.pinnedUntil).getTime() > nowMs;
}

export interface ReorderPlan {
  /** Stories that lose their pin (held a pin but are not in the new order). */
  unpin: string[];
  /** The new pins: order[i] → rank i+1. Exactly one rank 1. */
  pin: Array<{ storyId: string; rank: number }>;
}

/** Validate a requested Top Stories order; returns an error message or null. */
export function validateOrder(order: ReadonlyArray<string>): string | null {
  if (order.length === 0) return 'order must list at least one story';
  if (order.length > MAX_REORDER) return `order may list at most ${MAX_REORDER} stories`;
  if (new Set(order).size !== order.length) return 'order lists a story more than once';
  return null;
}

/**
 * A reorder REPLACES the whole pin set: every currently pinned story not in the new order is
 * unpinned, and the new order is pinned 1..n. So ranks are unique, there is exactly one rank-1 lead,
 * and no pin from an older arrangement lingers.
 */
export function planReorder(order: ReadonlyArray<string>, currentlyPinned: ReadonlyArray<string>): ReorderPlan {
  const next = new Set(order);
  return {
    unpin: currentlyPinned.filter((id) => !next.has(id)),
    pin: order.map((storyId, i) => ({ storyId, rank: i + 1 })),
  };
}

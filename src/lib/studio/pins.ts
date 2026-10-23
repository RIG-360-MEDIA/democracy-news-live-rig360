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
 * A reorder pins ONLY the stories the editor dragged (`moved`) plus those already pinned, each at its
 * slot in the new order (rank = position + 1, so ranks stay unique). Every other story in the list is
 * left to the machine ranking - it is NOT frozen (2026-10-23: a reorder used to pin all 12 for 12 h,
 * so no fresh story could reach Top Stories). A pinned story no longer in the order is unpinned.
 * `moved` omitted (an older client) = the whole order, the old behaviour.
 */
export function planReorder(
  order: ReadonlyArray<string>,
  currentlyPinned: ReadonlyArray<string>,
  moved: ReadonlyArray<string> = order,
): ReorderPlan {
  const next = new Set(order);
  const keep = new Set([...moved, ...currentlyPinned]);
  return {
    unpin: currentlyPinned.filter((id) => !next.has(id)),
    pin: order.flatMap((storyId, i) => (keep.has(storyId) ? [{ storyId, rank: i + 1 }] : [])),
  };
}

/**
 * Put pinned stories at their exact slot (rank 1 = first) and fill every other slot with `auto` in its
 * own order. A rank past the end lands at the end. Pure; used by the ranking and the reader page.
 */
export function slotByRank<T extends object>(pinned: ReadonlyArray<T>, auto: ReadonlyArray<T>): T[] {
  const rank = (c: T): number => (c as { pinnedRank?: number | null }).pinnedRank ?? 1;   // hubs are never pinned
  const out = [...auto];
  for (const p of [...pinned].sort((a, b) => rank(a) - rank(b))) out.splice(Math.min(Math.max(rank(p) - 1, 0), out.length), 0, p);
  return out;
}

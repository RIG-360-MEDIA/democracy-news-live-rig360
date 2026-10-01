// Editorial CMS — Top Stories drag-reorder as ONE transaction (F10).
//
// The /curate overlay used to commit a reorder as N sequential single pins: a failure half-way left
// the page in a mixed old/new order, and every pin lived forever. Now the whole new order is written
// in a single sql.begin: current pins not in the new order are unpinned, the order is pinned 1..n with
// a fresh expiry, and every row change is audited on the same transaction. Any failure (including the
// audit insert, or migration 008's one-pin-per-rank constraint at commit) rolls all of it back.
//
// Two guards against a STALE client (a tab loaded before someone else changed the page):
//   - a killed story in the order is refused — a reorder must never resurrect it;
//   - `expectedPinToken` (from pinSetToken() when the page was rendered) must still match the current
//     pin set, else the reorder is refused and the editor reloads.
// Both throw ReorderConflictError → HTTP 409.
import { createHash } from 'node:crypto';

import { sql } from '@/lib/db';

import { writeOverride } from './overrides';
import { planReorder, validateOrder } from './pins';
import type { EditorialOverride } from './types';

export interface ReorderResult {
  pinned: Array<{ storyId: string; rank: number }>;
  unpinned: string[];
  /** The pin-set token after this reorder — the client sends it with its next reorder. */
  pinToken: string;
}

export class ReorderConflictError extends Error {}

interface PinRow {
  story_id: string;
  pinned_rank: number | null;
}

/** Opaque fingerprint of the current pin set (every action='pinned' row, expired or not). */
export function pinSetToken(pins: ReadonlyArray<PinRow>): string {
  const canonical = pins
    .map((p) => `${p.story_id}:${p.pinned_rank ?? 1}`)
    .sort()
    .join(',');
  return createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 32);
}

/** The token for an overrides map as read by a page (getOverrides()). */
export function pinSetTokenOf(overrides: ReadonlyMap<string, EditorialOverride>): string {
  return pinSetToken(
    [...overrides.values()]
      .filter((o) => o.action === 'pinned')
      .map((o) => ({ story_id: o.storyId, pinned_rank: o.pinnedRank })),
  );
}

export async function reorderTopStories(
  order: ReadonlyArray<string>,
  editorId: string,
  expectedPinToken?: string,
): Promise<ReorderResult> {
  const invalid = validateOrder(order);
  if (invalid) throw new RangeError(invalid);
  return sql.begin(async (tx) => {
    const rows = (await tx`
      SELECT story_id, action, pinned_rank FROM rigwire.editorial_overrides
      WHERE action = 'pinned' OR story_id = ANY(${[...order]}) FOR UPDATE
    `) as unknown as Array<PinRow & { action: string }>;
    const killed = rows.filter((r) => r.action === 'killed').map((r) => r.story_id);
    if (killed.length > 0) {
      throw new ReorderConflictError('A story in this order was killed since the page loaded — reload and try again.');
    }
    const pinned = rows.filter((r) => r.action === 'pinned');
    if (expectedPinToken !== undefined && expectedPinToken !== pinSetToken(pinned)) {
      throw new ReorderConflictError('The top stories changed since the page loaded — reload and try again.');
    }
    const plan = planReorder(order, pinned.map((r) => r.story_id));
    for (const storyId of plan.unpin) {
      // eslint-disable-next-line no-await-in-loop -- sequential on one transaction by design.
      await writeOverride(tx, storyId, { action: 'live', pinnedRank: null }, editorId, 'unpin', { displace: false });
    }
    for (const { storyId, rank } of plan.pin) {
      // eslint-disable-next-line no-await-in-loop -- sequential on one transaction by design.
      await writeOverride(tx, storyId, { action: 'pinned', pinnedRank: rank }, editorId, 'reorder', { displace: false });
    }
    const pinToken = pinSetToken(plan.pin.map((p) => ({ story_id: p.storyId, pinned_rank: p.rank })));
    return { pinned: plan.pin, unpinned: plan.unpin, pinToken };
  }) as Promise<ReorderResult>;
}

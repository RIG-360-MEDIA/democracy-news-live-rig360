// Editorial CMS — the ONE writer for the append-only rigwire.editorial_audit ledger (F7).
//
// Every Studio write records who did what to which target, with before/after snapshots, INSIDE the
// same transaction as the write itself: callers open `sql.begin(tx => …)`, perform the write on `tx`,
// then call writeAudit(tx, …). Either both rows land or neither does — there is no "write succeeded
// but the audit was lost" state.
//
// Story-scoped actions (overrides, manual stories, Door B publishes) set `storyId` (the uuid column).
// Config-scoped actions (sources, weights/sections, users) have no story: `storyId` is null and the
// target is recorded inside the snapshots as `target` (e.g. "source:<uuid>", "user:<uuid>",
// "ranking_weights"), so the ledger is still self-describing without a schema change.

import type { TransactionSql } from 'postgres';

/** Config-scoped audit actions added by F7 (story override actions keep their historic names). */
export const CONFIG_AUDIT_ACTIONS = [
  'source_lean',
  'weights_update',
  'manual_create',
  'manual_edit',
  'manual_unpublish',
  'manual_republish',
  'manual_delete',
  'user_create',
  'user_role',
  'user_reset_link',
] as const;

/** Admin-scope configuration actions (M2): shown only to admins in the audit listing. Story-scoped
 *  rows — overrides, manual_create, doorb_publish — stay visible to every editor. */
export const ADMIN_SCOPE_AUDIT_ACTIONS: readonly string[] = [
  'source_lean',
  'weights_update',
  'user_create',
  'user_role',
  'user_reset_link',
];

/** Actions written by applyOverride (overrides.ts): their `before` is an override snapshot, so they
 *  are the only rows a History-tab revert may restore (L3). */
export const OVERRIDE_AUDIT_ACTIONS: readonly string[] = [
  'publish',
  'unpublish',
  'unpin',
  'kill',
  'revive',
  'pin',
  'reorder',
  'boost',
  'suppress',
  'lock',
  'unlock',
  'edit',
  'undo',
  'revert',
];

export type Snapshot = Record<string, unknown>;

export interface AuditEntry {
  actor: string;
  action: string;
  /** The story row this action concerns (uuid), or null for config-scoped actions. */
  storyId?: string | null;
  /** Non-story target, e.g. "source:<uuid>". Stamped into both snapshots. */
  target?: string;
  before: Snapshot | null;
  after: Snapshot | null;
}

function stamp(snapshot: Snapshot | null, target: string | undefined): Snapshot | null {
  if (snapshot === null) return null;
  return target ? { target, ...snapshot } : snapshot;
}

type JsonArg = Parameters<TransactionSql['json']>[0];

/** Append one audit row on the caller's transaction. Throws (rolling the write back) on failure. */
export async function writeAudit(tx: TransactionSql, entry: AuditEntry): Promise<void> {
  if (!entry.actor) throw new Error('writeAudit: actor is required');
  if (!entry.action) throw new Error('writeAudit: action is required');
  const before = stamp(entry.before, entry.target);
  const after = stamp(entry.after, entry.target);
  await tx`
    INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
    VALUES (${entry.storyId ?? null}, ${entry.actor}, ${entry.action},
            ${before ? tx.json(before as unknown as JsonArg) : null},
            ${after ? tx.json(after as unknown as JsonArg) : null})`;
}

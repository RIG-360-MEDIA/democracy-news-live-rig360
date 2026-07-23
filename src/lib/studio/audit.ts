// Editorial CMS — Audit log data access (epic 002).
//
// Read-only listing of the append-only rigwire.editorial_audit ledger with
// parameterized filters, plus a one-step undo that restores an entry's `before`
// snapshot via applyOverride — which itself appends a fresh 'undo' audit row, so
// the log stays append-only and every revert is itself auditable.
//
// NOTE: the audit table's timestamp column is `at` (migration 002), NOT
// `created_at`. Verified against migrations/002_editorial_cms.sql and the two
// writers (overrides.ts logAudit, draft/[id]/publish route).

import { sql } from '@/lib/db';

import { applyOverride } from './overrides';
import type { EditorialOverride } from './types';

/** The Door B publish record stored in `after` for action 'doorb_publish'. */
export interface DoorBPublishRecord {
  job_id?: string;
  version?: number;
  flags_summary?: unknown;
}

/** One row of the editorial audit ledger, camelCased and ISO-normalised.
 *  - `before` is always the prior override snapshot (or null on first touch).
 *  - `after` is the resulting override for editorial actions, or a
 *    DoorBPublishRecord for action 'doorb_publish'. */
export interface AuditRow {
  id: number;
  storyId: string | null;
  editorId: string;
  action: string;
  before: EditorialOverride | null;
  after: EditorialOverride | DoorBPublishRecord | null;
  at: string;
}

export interface AuditFilters {
  editor?: string;
  action?: string;
  storyId?: string;
  from?: string; // ISO lower bound on `at` (inclusive)
  to?: string; // ISO upper bound on `at` (inclusive)
  limit: number;
  offset: number;
}

interface AuditDbRow {
  id: string | number;
  story_id: string | null;
  editor_id: string;
  action: string;
  before: EditorialOverride | null;
  after: EditorialOverride | DoorBPublishRecord | null;
  at: string | Date;
}

function toRow(r: AuditDbRow): AuditRow {
  return {
    id: Number(r.id),
    storyId: r.story_id,
    editorId: r.editor_id,
    action: r.action,
    before: r.before,
    after: r.after,
    at: new Date(r.at).toISOString(),
  };
}

/** List audit rows, reverse-chronological, filtered and paginated. All filters
 *  are optional; every value is bound as a parameter (no string interpolation). */
export async function listAudit(filters: AuditFilters): Promise<AuditRow[]> {
  const { editor, action, storyId, from, to, limit, offset } = filters;
  const rows = (await sql`
    SELECT id, story_id, editor_id, action, before, after, at
    FROM rigwire.editorial_audit
    WHERE ${editor ? sql`editor_id = ${editor}` : sql`TRUE`}
      AND ${action ? sql`action = ${action}` : sql`TRUE`}
      AND ${storyId ? sql`story_id = ${storyId}` : sql`TRUE`}
      AND ${from ? sql`at >= ${from}` : sql`TRUE`}
      AND ${to ? sql`at <= ${to}` : sql`TRUE`}
    ORDER BY at DESC
    LIMIT ${limit} OFFSET ${offset}
  `) as unknown as AuditDbRow[];
  return rows.map(toRow);
}

/** Fetch a single audit entry by id (for the undo action), or null if absent. */
export async function getAuditEntry(id: number): Promise<AuditRow | null> {
  const rows = (await sql`
    SELECT id, story_id, editor_id, action, before, after, at
    FROM rigwire.editorial_audit
    WHERE id = ${id}
    LIMIT 1
  `) as unknown as AuditDbRow[];
  const r = rows[0];
  return r ? toRow(r) : null;
}

/** True when an entry carries a full override snapshot we can restore. Door B
 *  publishes and first-touch rows (before === null) have nothing to revert to. */
export function isUndoable(entry: AuditRow): entry is AuditRow & {
  storyId: string;
  before: EditorialOverride;
} {
  return (
    entry.action !== 'doorb_publish' &&
    entry.storyId !== null &&
    entry.before !== null &&
    typeof entry.before === 'object' &&
    'storyId' in entry.before
  );
}

/** The override patch that re-applies a prior snapshot (identity/timestamp fields
 *  are supplied fresh by applyOverride, so they are excluded here). */
function toPatch(before: EditorialOverride) {
  return {
    action: before.action,
    pinnedRank: before.pinnedRank,
    importanceDelta: before.importanceDelta,
    sectionOverride: before.sectionOverride,
    humanLocked: before.humanLocked,
    editedHeadline: before.editedHeadline,
    editedDek: before.editedDek,
    editedBody: before.editedBody,
    editedTags: before.editedTags,
    editedImage: before.editedImage,
    reason: before.reason,
  };
}

/** Revert one audit entry by re-applying its `before` snapshot. Appends a new
 *  'undo' audit row (via applyOverride). Throws if the entry is not undoable. */
export async function undoAudit(entry: AuditRow, editorId: string): Promise<EditorialOverride> {
  if (!isUndoable(entry)) {
    throw new Error('This audit entry carries no prior state to restore.');
  }
  return applyOverride(entry.storyId, toPatch(entry.before), editorId, 'undo');
}

// Editorial CMS — override layer data access (epic 002).
// Editors never touch story_generated_v8; every decision is an override row here,
// and every write is logged to editorial_audit in the SAME transaction. Read-merge-write keeps
// patches immutable.

import type { TransactionSql } from 'postgres';

import { sql } from '@/lib/db';

import { writeAudit, type Snapshot } from './audit-log';
import { MAX_REORDER, pinExpiry } from './pins';
import type { EditorialOverride, OverrideAction } from './types';

interface OverrideRow {
  story_id: string;
  action: OverrideAction;
  pinned_rank: number | null;
  pinned_until?: string | Date | null; // absent until migration 008 is applied
  importance_delta: string | number;
  section_override: string | null;
  human_locked: boolean;
  edited_headline: string | null;
  edited_dek: string | null;
  edited_body: string | null;
  edited_tags: string[] | null;
  edited_image: string | null;
  editor_id: string;
  reason: string | null;
  updated_at: string | Date;
}

function toOverride(r: OverrideRow): EditorialOverride {
  return {
    storyId: r.story_id,
    action: r.action,
    pinnedRank: r.pinned_rank,
    pinnedUntil: r.pinned_until ? new Date(r.pinned_until).toISOString() : null,
    importanceDelta: Number(r.importance_delta),
    sectionOverride: r.section_override,
    humanLocked: r.human_locked,
    editedHeadline: r.edited_headline,
    editedDek: r.edited_dek,
    editedBody: r.edited_body,
    editedTags: r.edited_tags,
    editedImage: r.edited_image,
    editorId: r.editor_id,
    reason: r.reason,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

// action 'held' = "no explicit editor visibility decision → follow the machine". Only an explicit
// Publish (→ 'live') or Make-top (→ 'pinned') force-surfaces a story the generator held back.
const DEFAULTS = (storyId: string): EditorialOverride => ({
  storyId,
  action: 'held',
  pinnedRank: null,
  pinnedUntil: null,
  importanceDelta: 0,
  sectionOverride: null,
  humanLocked: false,
  editedHeadline: null,
  editedDek: null,
  editedBody: null,
  editedTags: null,
  editedImage: null,
  editorId: 'system',
  reason: null,
  updatedAt: new Date().toISOString(),
});

/** All overrides (or just the given stories) as a map keyed by story_id. */
export async function getOverrides(storyIds?: string[]): Promise<Map<string, EditorialOverride>> {
  const rows = (storyIds && storyIds.length
    ? await sql`SELECT * FROM rigwire.editorial_overrides WHERE story_id = ANY(${storyIds})`
    : await sql`SELECT * FROM rigwire.editorial_overrides`) as unknown as OverrideRow[];
  const m = new Map<string, EditorialOverride>();
  for (const r of rows) m.set(r.story_id, toOverride(r));
  return m;
}

export type OverridePatch = Partial<Omit<EditorialOverride, 'storyId' | 'editorId' | 'updatedAt'>>;

const asSnapshot = (o: EditorialOverride | null): Snapshot | null => o as unknown as Snapshot | null;

/** The pin fields of the merged row. A pinned row ALWAYS has a rank (default 1) and an expiry
 *  (migration 008's CHECKs): a (re)pin gets a fresh expiry; any other edit of a pinned story (boost,
 *  lock, headline…) keeps the existing one; leaving pinned state clears it. */
function pinFields(existing: EditorialOverride | null, patch: OverridePatch, merged: EditorialOverride, nowMs: number) {
  if (merged.action !== 'pinned') return { pinnedUntil: null };
  const pinnedRank = merged.pinnedRank ?? 1;
  const repinned = patch.action === 'pinned' || patch.pinnedRank !== undefined || existing?.action !== 'pinned';
  const kept = patch.pinnedUntil !== undefined ? patch.pinnedUntil : repinned ? null : merged.pinnedUntil;
  return { pinnedRank, pinnedUntil: kept ?? pinExpiry(nowMs) };
}

interface WriteOptions {
  /** Unpin any OTHER story holding the rank this write pins (default true). A bulk reorder replaces
   *  the whole pin set itself, so it opts out. */
  displace?: boolean;
}

/** Merge a patch onto a story's override (create if absent), persist, and audit — on the caller's
 *  transaction. The prior row is read FOR UPDATE so the audit `before` is exact. When the result is a
 *  pin, whoever else held that rank is unpinned (and audited) first: one story per rank, one lead. */
export async function writeOverride(
  tx: TransactionSql,
  storyId: string,
  patch: OverridePatch,
  editorId: string,
  auditAction: string,
  opts: WriteOptions = {},
): Promise<EditorialOverride> {
  const rows = (await tx`
    SELECT * FROM rigwire.editorial_overrides WHERE story_id = ${storyId} FOR UPDATE
  `) as unknown as OverrideRow[];
  const existing = rows[0] ? toOverride(rows[0]) : null;
  const merged: EditorialOverride = { ...(existing ?? DEFAULTS(storyId)), ...patch };
  const next: EditorialOverride = {
    ...merged,
    ...pinFields(existing, patch, merged, Date.now()),
    storyId,
    editorId,
    updatedAt: new Date().toISOString(),
  };
  if (next.action === 'pinned' && (opts.displace ?? true)) {
    await displaceRank(tx, storyId, next.pinnedRank ?? 1, editorId);
  }
  await tx`
    INSERT INTO rigwire.editorial_overrides
      (story_id, action, pinned_rank, pinned_until, importance_delta, section_override, human_locked,
       edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason, updated_at)
    VALUES (${next.storyId}, ${next.action}, ${next.pinnedRank}, ${next.pinnedUntil}, ${next.importanceDelta},
       ${next.sectionOverride}, ${next.humanLocked}, ${next.editedHeadline}, ${next.editedDek},
       ${next.editedBody}, ${next.editedTags}, ${next.editedImage}, ${next.editorId}, ${next.reason}, now())
    ON CONFLICT (story_id) DO UPDATE SET
      action=EXCLUDED.action, pinned_rank=EXCLUDED.pinned_rank, pinned_until=EXCLUDED.pinned_until,
      importance_delta=EXCLUDED.importance_delta,
      section_override=EXCLUDED.section_override, human_locked=EXCLUDED.human_locked,
      edited_headline=EXCLUDED.edited_headline, edited_dek=EXCLUDED.edited_dek,
      edited_body=EXCLUDED.edited_body, edited_tags=EXCLUDED.edited_tags, edited_image=EXCLUDED.edited_image,
      editor_id=EXCLUDED.editor_id, reason=EXCLUDED.reason, updated_at=now()`;
  await writeAudit(tx, {
    actor: editorId,
    action: auditAction,
    storyId,
    before: asSnapshot(existing),
    after: asSnapshot(next),
  });
  return next;
}

/** Unpin every other story pinned at `rank` (audited as 'unpin'), so the new pin holds it alone. */
async function displaceRank(tx: TransactionSql, storyId: string, rank: number, editorId: string): Promise<void> {
  const holders = (await tx`
    SELECT story_id FROM rigwire.editorial_overrides
    WHERE action = 'pinned' AND coalesce(pinned_rank, 1) = ${rank} AND story_id <> ${storyId}
    FOR UPDATE
  `) as unknown as Array<{ story_id: string }>;
  for (const h of holders) {
    // eslint-disable-next-line no-await-in-loop -- sequential on one transaction by design.
    await writeOverride(tx, h.story_id, { action: 'live', pinnedRank: null }, editorId, 'unpin', { displace: false });
  }
}

/** Merge a patch onto a story's override in its own transaction (see writeOverride). */
export async function applyOverride(
  storyId: string,
  patch: OverridePatch,
  editorId: string,
  auditAction: string,
): Promise<EditorialOverride> {
  return sql.begin((tx) => writeOverride(tx, storyId, patch, editorId, auditAction)) as Promise<EditorialOverride>;
}

/** A pin rank an editor may set: an integer within Top Stories. */
export function assertRank(rank: number): number {
  if (!Number.isInteger(rank) || rank < 1 || rank > MAX_REORDER) {
    throw new RangeError(`rank must be an integer from 1 to ${MAX_REORDER}`);
  }
  return rank;
}

// ── Named editorial actions (each is reversible) ──

// Publish — surface for readers, overriding the machine's HELD decision. The editor takes
// responsibility for the content; the reader force-surfaces action 'live'/'pinned' stories.
export const publishStory = (id: string, editor: string) =>
  applyOverride(id, { action: 'live', pinnedRank: null }, editor, 'publish');

// Unpublish — hide from readers everywhere.
export const unpublishStory = (id: string, editor: string, reason?: string) =>
  applyOverride(id, { action: 'killed', reason: reason ?? null }, editor, 'unpublish');

// Remove-from-top — keep published, drop the pin.
export const unpinStory = (id: string, editor: string) =>
  applyOverride(id, { action: 'live', pinnedRank: null }, editor, 'unpin');

export const killStory = (id: string, editor: string, reason?: string) =>
  applyOverride(id, { action: 'killed', reason: reason ?? null }, editor, 'kill');

export const reviveStory = (id: string, editor: string) =>
  applyOverride(id, { action: 'live', pinnedRank: null }, editor, 'revive');

export const pinStory = (id: string, editor: string, rank: number) =>
  applyOverride(id, { action: 'pinned', pinnedRank: assertRank(rank) }, editor, 'pin');

export const boostStory = (id: string, editor: string, delta: number) =>
  applyOverride(id, { importanceDelta: delta }, editor, delta >= 0 ? 'boost' : 'suppress');

export const lockStory = (id: string, editor: string, locked: boolean) =>
  applyOverride(id, { humanLocked: locked }, editor, locked ? 'lock' : 'unlock');

/** Inline edit — always locks the story so the pipeline can't overwrite the edit.
 *  `image`: pass a URL to replace the thumbnail/hero, or '' to clear back to the machine's image. */
export const editStory = (
  id: string,
  editor: string,
  fields: { headline?: string; dek?: string; body?: string; tags?: string[]; image?: string },
) => {
  // Only include keys the caller actually sent. A key set to `undefined` here would be spread onto the
  // merged override and reach the INSERT as an SQL bind, and the postgres driver rejects undefined
  // ("UNDEFINED_VALUE"). Omitting absent keys makes the spread a true "leave as-is" for partial edits.
  const patch: OverridePatch = { humanLocked: true };
  if (fields.headline !== undefined) patch.editedHeadline = fields.headline;
  if (fields.dek !== undefined) patch.editedDek = fields.dek;
  if (fields.body !== undefined) patch.editedBody = fields.body;
  if (fields.tags !== undefined) patch.editedTags = fields.tags;
  // '' means "clear the override" → back to the machine's image; absent means "leave as-is".
  if (fields.image !== undefined) patch.editedImage = fields.image.trim() || null;
  return applyOverride(id, patch, editor, 'edit');
};

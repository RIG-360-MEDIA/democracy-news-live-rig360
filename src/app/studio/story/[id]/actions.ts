'use server';

// Server actions for the editor's History tab: read this story's editorial
// audit trail, and perform an audited REVERT. Revert re-applies the chosen
// entry's `before` snapshot through applyOverride — a new audited action — so
// nothing is destroyed and the invariant (generated tables never written) holds.

import { revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache';
import { sql } from '@/lib/db';
import { applyOverride, type OverridePatch } from '@/lib/studio/overrides';
import { requireEditor } from '@/lib/studio/session';
import type { EditorialOverride } from '@/lib/studio/types';

import type { HistoryEntry } from '@/components/studio/editor/types';

interface AuditRow {
  id: number;
  action: string;
  editor_id: string;
  at: string | Date;
  before: EditorialOverride | null;
  after: EditorialOverride | null;
}

/** This story's audit trail, newest first. Throws if the caller is not an editor. */
export async function loadHistory(storyId: string): Promise<HistoryEntry[]> {
  const guard = await requireEditor();
  if (!guard.ok) throw new Error('Editor access required');

  const rows = (await sql`
    SELECT id, action, editor_id, at, before, after
    FROM rigwire.editorial_audit
    WHERE story_id = ${storyId}
    ORDER BY at DESC
    LIMIT 100
  `) as unknown as AuditRow[];

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    editorId: r.editor_id,
    at: new Date(r.at).toISOString(),
    before: r.before,
    after: r.after,
  }));
}

/** The patch that restores a story to `snapshot` (or clears all edits when null). */
function restorePatch(snapshot: EditorialOverride | null): OverridePatch {
  if (!snapshot) {
    return {
      action: 'held',
      pinnedRank: null,
      importanceDelta: 0,
      sectionOverride: null,
      humanLocked: false,
      editedHeadline: null,
      editedDek: null,
      editedBody: null,
      editedTags: null,
      editedImage: null,
      reason: null,
    };
  }
  return {
    action: snapshot.action,
    pinnedRank: snapshot.pinnedRank,
    importanceDelta: snapshot.importanceDelta,
    sectionOverride: snapshot.sectionOverride,
    humanLocked: snapshot.humanLocked,
    editedHeadline: snapshot.editedHeadline,
    editedDek: snapshot.editedDek,
    editedBody: snapshot.editedBody,
    editedTags: snapshot.editedTags,
    editedImage: snapshot.editedImage,
    reason: snapshot.reason,
  };
}

/** Revert the story to the `before` state of the given audit entry. Audited. */
export async function revert(
  storyId: string,
  auditId: number,
): Promise<{ ok: boolean; message?: string }> {
  const guard = await requireEditor();
  if (!guard.ok) return { ok: false, message: 'Editor access required' };

  const rows = (await sql`
    SELECT before FROM rigwire.editorial_audit
    WHERE id = ${auditId} AND story_id = ${storyId}
    LIMIT 1
  `) as unknown as Array<{ before: EditorialOverride | null }>;

  if (rows.length === 0) return { ok: false, message: 'Audit entry not found' };

  try {
    await applyOverride(storyId, restorePatch(rows[0].before), guard.editor.id, 'revert');
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateTag(CACHE_TAGS.storyDetail);
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Revert failed' };
  }
}

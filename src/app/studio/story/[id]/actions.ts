'use server';

// Server actions for the editor's History tab: read this story's editorial
// audit trail, and perform an audited REVERT. Revert re-applies the chosen
// entry's `before` snapshot through applyOverride — a new audited action — so
// nothing is destroyed and the invariant (generated tables never written) holds.

import { revalidateTag } from 'next/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';

import { CACHE_TAGS } from '@/lib/cache';
import { z } from 'zod';

import { sql } from '@/lib/db';
import { OVERRIDE_AUDIT_ACTIONS } from '@/lib/studio/audit-log';
import { storyIdSchema } from '@/lib/studio/input-schemas';
import { applyOverride, type OverridePatch } from '@/lib/studio/overrides';
import { requireRole } from '@/lib/studio/session';
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

const auditIdSchema = z.number().int().positive();

/** This story's audit trail, newest first. Throws if the caller is not an editor or the id is not a
 *  uuid (L3 — a malformed id never reaches the DB). */
export async function loadHistory(storyId: string): Promise<HistoryEntry[]> {
  const guard = await requireRole('editor');
  if (!guard.ok) throw new Error('Editor access required');
  if (!storyIdSchema.safeParse(storyId).success) throw new Error('Invalid story id');

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

/** Revert the story to the `before` state of the given audit entry. Audited. Only rows written by
 *  applyOverride (override actions) can be reverted — never manual_create, Door B or config rows (L3). */
export async function revert(
  storyId: string,
  auditId: number,
): Promise<{ ok: boolean; message?: string }> {
  const guard = await requireRole('editor');
  if (!guard.ok) return { ok: false, message: 'Editor access required' };
  if (!storyIdSchema.safeParse(storyId).success || !auditIdSchema.safeParse(auditId).success) {
    return { ok: false, message: 'Invalid revert request' };
  }

  try {
    const rows = (await sql`
      SELECT action, before FROM rigwire.editorial_audit
      WHERE id = ${auditId} AND story_id = ${storyId}
      LIMIT 1
    `) as unknown as Array<{ action: string; before: EditorialOverride | null }>;

    if (rows.length === 0) return { ok: false, message: 'Audit entry not found' };
    if (!OVERRIDE_AUDIT_ACTIONS.includes(rows[0].action)) {
      return { ok: false, message: 'Only editorial changes can be reverted' };
    }

    await applyOverride(storyId, restorePatch(rows[0].before), guard.editor.id, 'revert');
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(storyId);
    return { ok: true };
  } catch (e: unknown) {
    console.error('[studio/revert] failed', { editor: guard.editor.id, storyId, auditId, error: e });
    return { ok: false, message: 'Revert failed' };
  }
}

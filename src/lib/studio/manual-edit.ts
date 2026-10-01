// Editorial CMS — edit / unpublish / republish / delete a manual story (F9).
//
// Nothing is hard-deleted: rigwire.manual_stories.status carries the lifecycle and the row is kept.
//   PUBLISHABLE  — live (the reader mappers surface only status LIKE 'PUBLISHABLE%')
//   UNPUBLISHED  — pulled from the site by an editor; can be republished
//   DELETED      — removed by an admin; hidden from the Studio list too, and no longer editable
// Every change reads the row FOR UPDATE and writes its audit row (before/after snapshot) on the SAME
// transaction as the UPDATE (F7).

import { createHash } from 'node:crypto';

import { sql } from '@/lib/db';

import { writeAudit, type Snapshot } from './audit-log';
import type { ManualTopic } from './topics';

export const MANUAL_STATUSES = ['PUBLISHABLE', 'UNPUBLISHED', 'DELETED'] as const;
export type ManualStatus = (typeof MANUAL_STATUSES)[number];

/** Editable fields; each is optional — absent means "leave as is". */
export interface ManualStoryPatch {
  headline?: string;
  dek?: string | null;
  body?: string;
  topic?: ManualTopic;
  country?: string | null;
  imageUrl?: string | null;
  importance?: number;
}

interface Row {
  id: string;
  headline: string;
  dek: string | null;
  body: string;
  topic: string;
  country: string | null;
  image_url: string | null;
  importance: string | number;
  status: string;
}

export class ManualStoryError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
  ) {
    super(message);
  }
}

/** Audit snapshot. Like manual_create (L2), the body is recorded as length + sha256, not copied into
 *  the append-only ledger — enough to prove an edit changed it. */
function snapshot(r: Row): Snapshot {
  return {
    headline: r.headline,
    dek: r.dek,
    bodyLength: r.body.length,
    bodySha256: createHash('sha256').update(r.body, 'utf8').digest('hex'),
    topic: r.topic,
    country: r.country,
    imageUrl: r.image_url,
    importance: Number(r.importance),
    status: r.status,
  };
}

function merge(r: Row, patch: ManualStoryPatch, status: string): Row {
  return {
    ...r,
    headline: patch.headline ?? r.headline,
    dek: patch.dek !== undefined ? patch.dek : r.dek,
    body: patch.body ?? r.body,
    topic: patch.topic ?? r.topic,
    country: patch.country !== undefined ? patch.country : r.country,
    image_url: patch.imageUrl !== undefined ? patch.imageUrl : r.image_url,
    importance: patch.importance ?? Number(r.importance),
    status,
  };
}

/** The audit action for a real change (no-ops never reach here): a pure status flip is named for the flip; anything else is an edit. */
function actionFor(before: Row, patch: ManualStoryPatch, status: string): string {
  const edited = Object.values(patch).some((v) => v !== undefined);
  if (edited || status === before.status) return 'manual_edit';
  if (status === 'DELETED') return 'manual_delete';
  return status === 'UNPUBLISHED' ? 'manual_unpublish' : 'manual_republish';
}

/**
 * Apply an edit and/or a status change to one manual story, atomically with its audit row.
 * Throws ManualStoryError(404) when the story does not exist, (409) when it was deleted.
 */
export async function changeManualStory(
  id: string,
  patch: ManualStoryPatch,
  status: ManualStatus | undefined,
  editorId: string,
): Promise<{ id: string; status: string; action: string }> {
  return sql.begin(async (tx) => {
    const rows = (await tx`
      SELECT id::text AS id, headline, dek, body, topic, country, image_url, importance, status
      FROM rigwire.manual_stories WHERE id = ${id} FOR UPDATE
    `) as unknown as Row[];
    const before = rows[0];
    if (!before) throw new ManualStoryError('Manual story not found', 404);
    if (before.status === 'DELETED') throw new ManualStoryError('This story was deleted and can no longer be changed', 409);
    const nextStatus = status ?? before.status;
    const after = merge(before, patch, nextStatus);
    // Nothing actually changes (same status, same field values) → no write, no audit row.
    if (JSON.stringify(snapshot(after)) === JSON.stringify(snapshot(before))) {
      return { id, status: before.status, action: 'noop' };
    }
    await tx`
      UPDATE rigwire.manual_stories
      SET headline = ${after.headline}, dek = ${after.dek}, body = ${after.body}, topic = ${after.topic},
          country = ${after.country}, image_url = ${after.image_url}, importance = ${Number(after.importance)},
          status = ${after.status}, updated_at = now()
      WHERE id = ${id}`;
    const action = actionFor(before, patch, nextStatus);
    await writeAudit(tx, { actor: editorId, action, storyId: id, before: snapshot(before), after: snapshot(after) });
    return { id, status: after.status, action };
  }) as Promise<{ id: string; status: string; action: string }>;
}

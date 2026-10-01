// Editorial CMS — Door B (AI-assisted draft) publish handoff (E7/dispatch).
//
// createManualStory() (./manual.ts) always lands a row as whatever
// rigwire.manual_stories.status defaults to and has no concept of a source
// draft job — it's built for the hand-authored E6 flow. Door B needs the row
// explicitly PUBLISHABLE and tagged with its draft_job_id for idempotency, so
// this is a sibling insert path rather than a change to manual.ts.
//
// Requires migrations/006_draft_publish.sql (adds manual_stories.draft_job_id).

import { sql } from '@/lib/db';

import { writeAudit } from './audit-log';

export interface PublishableManualStoryInput {
  headline: string;
  dek: string | null;
  body: string;
  /** Free text from the box's FinalizePayload — not constrained to MANUAL_TOPICS. */
  topic: string;
  country: string | null;
  imageUrl: string | null;
  importance: number;
  draftJobId: string;
}

/** What the Door B publish records in the audit `after` (surfaced by the Audit page). */
export interface DoorBAuditRecord {
  job_id: string;
  version: number;
  flags_summary: unknown;
}

/**
 * Insert a Door-B-generated story as PUBLISHABLE, auditing it ('doorb_publish') in the SAME
 * transaction. Idempotent per draftJobId: if a row for this job already exists (a retried publish
 * click, or the confirm-publish round-trip to the box failing after the Neon write landed), returns
 * the existing row's id and writes nothing (the original publish was audited with it).
 */
export async function createPublishableManualStory(
  fields: PublishableManualStoryInput,
  editorId: string,
  audit: DoorBAuditRecord,
): Promise<string> {
  return sql.begin(async (tx) => {
    const existing = (await tx`
      SELECT id FROM rigwire.manual_stories WHERE draft_job_id = ${fields.draftJobId}
    `) as unknown as Array<{ id: string }>;
    if (existing.length > 0) return existing[0].id;

    const rows = (await tx`
      INSERT INTO rigwire.manual_stories
        (headline, dek, body, topic, country, image_url, importance, editor_id, status, draft_job_id)
      VALUES (${fields.headline}, ${fields.dek}, ${fields.body}, ${fields.topic},
              ${fields.country}, ${fields.imageUrl}, ${fields.importance}, ${editorId},
              'PUBLISHABLE', ${fields.draftJobId})
      RETURNING id
    `) as unknown as Array<{ id: string }>;
    const id = rows[0].id;
    await writeAudit(tx, {
      actor: editorId,
      action: 'doorb_publish',
      storyId: id,
      before: null,
      after: { ...audit },
    });
    return id;
  }) as Promise<string>;
}

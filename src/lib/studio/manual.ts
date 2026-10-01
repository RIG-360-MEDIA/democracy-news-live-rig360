// Editorial CMS — manual story authoring (E6).
// Editors hand-write stories that bypass the generator; they land in
// rigwire.manual_stories and are injected into the feed alongside generated ones.

import { createHash } from 'node:crypto';

import { sql } from '@/lib/db';

import { writeAudit } from './audit-log';

import { MANUAL_TOPICS } from './topics';

import type { ManualStory } from './types';
import type { ManualTopic } from './topics';

// Re-export the client-safe topic constants so existing server-side importers
// (create/page.tsx, the create API route) keep resolving them from here.
export { MANUAL_TOPICS };
export type { ManualTopic };

/** Fields an editor supplies when authoring a manual story. */
export interface ManualStoryInput {
  headline: string;
  dek: string | null;
  body: string;
  topic: ManualTopic;
  country: string | null;
  imageUrl: string | null;
  importance: number;
}

interface ManualStoryRow {
  id: string;
  headline: string;
  dek: string | null;
  body: string;
  topic: string;
  country: string | null;
  image_url: string | null;
  status: string;
  importance: string | number;
  editor_id: string;
  created_at: string | Date;
}

function toManualStory(r: ManualStoryRow): ManualStory {
  return {
    id: r.id,
    headline: r.headline,
    dek: r.dek,
    body: r.body,
    topic: r.topic,
    country: r.country,
    imageUrl: r.image_url,
    status: r.status,
    importance: Number(r.importance),
    editorId: r.editor_id,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

/** The audit `after` for a manual story (L2): every field except the body, which is recorded as its
 *  length + sha256 — enough to prove what was published without copying the full text into the
 *  append-only ledger (the story row itself holds the body). */
function auditSnapshot(fields: ManualStoryInput): Record<string, unknown> {
  const { body, ...rest } = fields;
  return {
    ...rest,
    bodyLength: body.length,
    bodySha256: createHash('sha256').update(body, 'utf8').digest('hex'),
    status: 'PUBLISHABLE',
  };
}

/** Insert a hand-authored story and return its new id. The insert and its 'manual_create' audit
 *  row share one transaction. */
export async function createManualStory(
  fields: ManualStoryInput,
  editorId: string,
): Promise<string> {
  return sql.begin(async (tx) => {
    const rows = (await tx`
      INSERT INTO rigwire.manual_stories
        (headline, dek, body, topic, country, image_url, importance, editor_id, status)
      VALUES (${fields.headline}, ${fields.dek}, ${fields.body}, ${fields.topic},
              ${fields.country}, ${fields.imageUrl}, ${fields.importance}, ${editorId},
              -- Set explicitly, not left to the column default: manualStoryCards (manual-feed.ts)
              -- only surfaces rows matching status LIKE 'PUBLISHABLE%', so a changed default would
              -- silently make every new manual story invisible.
              'PUBLISHABLE')
      RETURNING id
    `) as unknown as Array<{ id: string }>;
    const id = rows[0].id;
    await writeAudit(tx, {
      actor: editorId,
      action: 'manual_create',
      storyId: id,
      before: null,
      after: auditSnapshot(fields),
    });
    return id;
  }) as Promise<string>;
}

/** Most recently authored manual stories (live and unpublished), newest first. */
export async function listManualStories(limit = 30): Promise<ManualStory[]> {
  const rows = (await sql`
    SELECT id, headline, dek, body, topic, country, image_url, status,
           importance, editor_id, created_at
    FROM rigwire.manual_stories
    WHERE status <> 'DELETED' -- soft-deleted rows are kept for the record, not listed (F9)
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as unknown as ManualStoryRow[];

  return rows.map(toManualStory);
}

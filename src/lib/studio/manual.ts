// Editorial CMS — manual story authoring (E6).
// Editors hand-write stories that bypass the generator; they land in
// rigwire.manual_stories and are injected into the feed alongside generated ones.

import { sql } from '@/lib/db';

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

/** Insert a hand-authored story and return its new id. */
export async function createManualStory(
  fields: ManualStoryInput,
  editorId: string,
): Promise<string> {
  const rows = (await sql`
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

  return rows[0].id;
}

/** Most recently authored manual stories, newest first. */
export async function listManualStories(limit = 30): Promise<ManualStory[]> {
  const rows = (await sql`
    SELECT id, headline, dek, body, topic, country, image_url, status,
           importance, editor_id, created_at
    FROM rigwire.manual_stories
    ORDER BY created_at DESC
    LIMIT ${limit}
  `) as unknown as ManualStoryRow[];

  return rows.map(toManualStory);
}

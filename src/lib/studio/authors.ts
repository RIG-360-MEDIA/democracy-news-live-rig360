// Per-story authors (migration 011, rigwire.story_authors). Read by the reader (cards + story page) and written
// by the CMS (Create form, Recently created, story editor). Every write is audited ('authors_edit') in the same
// transaction. Reads never fail a page: before the migration, or on any error, every story keeps the house byline.
import type { TransactionSql } from 'postgres';

import { sql } from '@/lib/db';

import { writeAudit } from './audit-log';
import { cleanAuthors } from './authors-text';

/** storyId -> authors for the ids that have them. Empty map on any error. */
export async function getAuthorsMap(ids: ReadonlyArray<string>): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  try {
    const rows = (await sql`
      SELECT story_id::text AS id, authors FROM rigwire.story_authors WHERE story_id = ANY(${[...ids]}::uuid[])
    `) as unknown as Array<{ id: string; authors: string }>;
    return new Map(rows.map((r) => [r.id, r.authors]));
  } catch (e) {
    console.error('[authors] read failed - house byline shown', { error: e instanceof Error ? e.message : e });
    return new Map();
  }
}

export async function getAuthors(id: string): Promise<string | null> {
  return (await getAuthorsMap([id])).get(id) ?? null;
}

/** Set (or clear, with '') a story's authors on an open transaction, audited. Returns the stored value. */
export async function setAuthorsTx(tx: TransactionSql, storyId: string, raw: string, editorId: string): Promise<string> {
  const authors = cleanAuthors(raw);
  const prev = (await tx`SELECT authors FROM rigwire.story_authors WHERE story_id = ${storyId} FOR UPDATE`) as unknown as Array<{ authors: string }>;
  const before = prev[0]?.authors ?? '';
  if (before === authors) return authors;
  if (authors) {
    await tx`
      INSERT INTO rigwire.story_authors (story_id, authors, editor_id) VALUES (${storyId}, ${authors}, ${editorId})
      ON CONFLICT (story_id) DO UPDATE SET authors = EXCLUDED.authors, editor_id = EXCLUDED.editor_id, updated_at = now()`;
  } else {
    await tx`DELETE FROM rigwire.story_authors WHERE story_id = ${storyId}`;
  }
  await writeAudit(tx, { actor: editorId, action: 'authors_edit', storyId, before: { authors: before }, after: { authors } });
  return authors;
}

export async function setAuthors(storyId: string, raw: string, editorId: string): Promise<string> {
  return sql.begin((tx) => setAuthorsTx(tx, storyId, raw, editorId)) as Promise<string>;
}

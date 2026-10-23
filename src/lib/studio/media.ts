// CMS-uploaded images (migration 010): stored in rigwire.media, served by GET /api/media/<id>.
// The type is read from the file's own first bytes, never from the name or the browser's claim.
import { sql } from '@/lib/db';

import { sniffImageType } from './image-type';

export const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

export class MediaError extends Error {}

/** Store one image; returns its public path (/api/media/<id>). */
export async function saveMedia(bytes: Uint8Array, originalName: string | null, editorId: string): Promise<string> {
  if (bytes.length === 0) throw new MediaError('The file is empty');
  if (bytes.length > MAX_MEDIA_BYTES) throw new MediaError('Images must be 8 MB or smaller');
  const type = sniffImageType(bytes);
  if (!type) throw new MediaError('Only JPEG, PNG, WebP or GIF images can be uploaded');
  const rows = (await sql`
    INSERT INTO rigwire.media (content_type, bytes, size_bytes, original_name, editor_id)
    VALUES (${type}, ${Buffer.from(bytes)}, ${bytes.length}, ${originalName?.slice(0, 200) ?? null}, ${editorId})
    RETURNING id::text AS id
  `) as unknown as Array<{ id: string }>;
  return `/api/media/${rows[0].id}`;
}

export async function getMedia(id: string): Promise<{ type: string; bytes: Buffer } | null> {
  const rows = (await sql`SELECT content_type, bytes FROM rigwire.media WHERE id = ${id}`) as unknown as Array<{
    content_type: string;
    bytes: Buffer;
  }>;
  return rows[0] ? { type: rows[0].content_type, bytes: rows[0].bytes } : null;
}

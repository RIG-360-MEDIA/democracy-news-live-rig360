// Editorial CMS — live/held provenance for Newsroom rows: who acted, when, and time-on-site.
//
// Joins the current override (rigwire.editorial_overrides) with an aggregate of the append-only log
// (rigwire.editorial_audit) so a row can show "published 3h ago by alice · edited by bob". Read-only
// via `sql`. Machine-surfaced stories have neither an override nor an audit row — they simply return
// no entry, and the caller falls back to the story's generation time.

import { sql } from '@/lib/db';

export interface LiveMeta {
  storyId: string;
  /** Current override owner — who last acted on the story (null if machine-only). */
  editorId: string | null;
  /** Current override action ('live' | 'pinned' | 'killed' | 'held'). */
  action: string | null;
  /** When the override was last written (proxy for held/killed time). */
  updatedAt: string | null;
  /** First time an editor put the story on the site (publish/pin/revive), from the audit log. */
  liveSince: string | null;
  /** now − liveSince, in whole seconds (null if never editor-published). */
  timeOnSiteSeconds: number | null;
  /** Editor who first published/pinned it (falls back to the override owner). */
  publishedBy: string | null;
  /** Most recent inline edit, if any. */
  editedBy: string | null;
  editedAt: string | null;
}

interface MetaRow {
  story_id: string;
  editor_id: string | null;
  action: string | null;
  updated_at: string | Date | null;
  first_live_at: string | Date | null;
  live_by: string | null;
  last_edit_at: string | Date | null;
  edited_by: string | null;
}

const iso = (v: string | Date | null): string | null =>
  v ? new Date(v).toISOString() : null;

/** Provenance for the given stories, keyed by story_id. Missing key = machine-surfaced (no editor). */
export async function liveMeta(storyIds: ReadonlyArray<string>): Promise<Map<string, LiveMeta>> {
  const out = new Map<string, LiveMeta>();
  if (storyIds.length === 0) return out;
  const ids = [...new Set(storyIds)];

  const rows = (await sql`
    SELECT o.story_id,
           o.editor_id,
           o.action,
           o.updated_at,
           a.first_live_at,
           a.live_by,
           a.last_edit_at,
           a.edited_by
    FROM rigwire.editorial_overrides o
    LEFT JOIN (
      SELECT story_id,
             min(at) FILTER (WHERE action IN ('publish', 'pin', 'revive')) AS first_live_at,
             (array_agg(editor_id ORDER BY at ASC)
                FILTER (WHERE action IN ('publish', 'pin', 'revive')))[1] AS live_by,
             max(at) FILTER (WHERE action = 'edit') AS last_edit_at,
             (array_agg(editor_id ORDER BY at DESC)
                FILTER (WHERE action = 'edit'))[1] AS edited_by
      FROM rigwire.editorial_audit
      WHERE story_id = ANY(${ids})
      GROUP BY story_id
    ) a ON a.story_id = o.story_id
    WHERE o.story_id = ANY(${ids})
  `) as unknown as MetaRow[];

  const now = Date.now();
  for (const r of rows) {
    const liveSince = iso(r.first_live_at);
    out.set(r.story_id, {
      storyId: r.story_id,
      editorId: r.editor_id,
      action: r.action,
      updatedAt: iso(r.updated_at),
      liveSince,
      timeOnSiteSeconds: liveSince
        ? Math.max(0, Math.floor((now - new Date(liveSince).getTime()) / 1000))
        : null,
      publishedBy: r.live_by ?? (r.action === 'live' || r.action === 'pinned' ? r.editor_id : null),
      editedBy: r.edited_by,
      editedAt: iso(r.last_edit_at),
    });
  }
  return out;
}

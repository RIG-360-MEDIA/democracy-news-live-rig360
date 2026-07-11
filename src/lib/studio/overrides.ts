// Editorial CMS — override layer data access (epic 002).
// Editors never touch story_generated_v8; every decision is an override row here,
// and every write is logged to editorial_audit. Read-merge-write keeps patches immutable.

import { sql } from '@/lib/db';

import type { EditorialOverride, OverrideAction } from './types';

interface OverrideRow {
  story_id: string;
  action: OverrideAction;
  pinned_rank: number | null;
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

async function logAudit(
  storyId: string,
  editorId: string,
  action: string,
  before: EditorialOverride | null,
  after: EditorialOverride,
): Promise<void> {
  await sql`
    INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
    VALUES (${storyId}, ${editorId}, ${action},
            ${before ? sql.json(before as unknown as Parameters<typeof sql.json>[0]) : null}, ${sql.json(after as unknown as Parameters<typeof sql.json>[0])})`;
}

/** Merge a patch onto a story's override (create if absent), persist, and audit. */
export async function applyOverride(
  storyId: string,
  patch: OverridePatch,
  editorId: string,
  auditAction: string,
): Promise<EditorialOverride> {
  const existing = (await getOverrides([storyId])).get(storyId) ?? null;
  const next: EditorialOverride = {
    ...(existing ?? DEFAULTS(storyId)),
    ...patch,
    storyId,
    editorId,
    updatedAt: new Date().toISOString(),
  };
  await sql`
    INSERT INTO rigwire.editorial_overrides
      (story_id, action, pinned_rank, importance_delta, section_override, human_locked,
       edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason, updated_at)
    VALUES (${next.storyId}, ${next.action}, ${next.pinnedRank}, ${next.importanceDelta},
       ${next.sectionOverride}, ${next.humanLocked}, ${next.editedHeadline}, ${next.editedDek},
       ${next.editedBody}, ${next.editedTags}, ${next.editedImage}, ${next.editorId}, ${next.reason}, now())
    ON CONFLICT (story_id) DO UPDATE SET
      action=EXCLUDED.action, pinned_rank=EXCLUDED.pinned_rank, importance_delta=EXCLUDED.importance_delta,
      section_override=EXCLUDED.section_override, human_locked=EXCLUDED.human_locked,
      edited_headline=EXCLUDED.edited_headline, edited_dek=EXCLUDED.edited_dek,
      edited_body=EXCLUDED.edited_body, edited_tags=EXCLUDED.edited_tags, edited_image=EXCLUDED.edited_image,
      editor_id=EXCLUDED.editor_id, reason=EXCLUDED.reason, updated_at=now()`;
  await logAudit(storyId, editorId, auditAction, existing, next);
  return next;
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
  applyOverride(id, { action: 'pinned', pinnedRank: rank }, editor, 'pin');

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
) =>
  applyOverride(
    id,
    {
      humanLocked: true,
      editedHeadline: fields.headline ?? undefined,
      editedDek: fields.dek ?? undefined,
      editedBody: fields.body ?? undefined,
      editedTags: fields.tags ?? undefined,
      // '' means "clear the override" → back to the machine's image; undefined means "leave as-is".
      editedImage: fields.image === undefined ? undefined : fields.image.trim() || null,
    },
    editor,
    'edit',
  );

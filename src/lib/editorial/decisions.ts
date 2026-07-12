// src/lib/editorial/decisions.ts
//
// Canonical, product-namespaced editorial CONTROL-PLANE accessor (migration 005).
//
// EVERY Rig Wire product reads/writes its editorial decisions through this one module, keyed by
// (product, content_id):  DNL, OSINT desk, Windlass, Ask-RIG …
//
// DNL today still writes via the legacy rigwire.editorial_overrides path (a DB trigger mirrors those
// into editorial.decisions, product='dnl'), so nothing in the live app changed. NEW products — and the
// standalone CMS (step 2) — use THIS module directly. Audit + reversibility are enforced by the DB
// trigger on editorial.decisions (every write snapshots before/after into editorial.audit).

import { sql } from '@/lib/db';

export type DecisionAction = 'live' | 'killed' | 'pinned' | 'held';

export interface Decision {
  product: string;
  contentId: string;
  action: DecisionAction;
  pinnedRank: number | null;
  importanceDelta: number;
  sectionOverride: string | null;
  humanLocked: boolean;
  editedHeadline: string | null;
  editedDek: string | null;
  editedBody: string | null;
  editedTags: string[] | null;
  editedImage: string | null;
  payload: Record<string, unknown>;
  editorId: string;
  reason: string | null;
  updatedAt: string;
}

interface Row {
  product: string;
  content_id: string;
  action: DecisionAction;
  pinned_rank: number | null;
  importance_delta: string | number;
  section_override: string | null;
  human_locked: boolean;
  edited_headline: string | null;
  edited_dek: string | null;
  edited_body: string | null;
  edited_tags: string[] | null;
  edited_image: string | null;
  payload: Record<string, unknown> | null;
  editor_id: string;
  reason: string | null;
  updated_at: string | Date;
}

function toDecision(r: Row): Decision {
  return {
    product: r.product,
    contentId: r.content_id,
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
    payload: r.payload ?? {},
    editorId: r.editor_id,
    reason: r.reason,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

const DEFAULTS = (product: string, contentId: string): Decision => ({
  product, contentId, action: 'held', pinnedRank: null, importanceDelta: 0,
  sectionOverride: null, humanLocked: false, editedHeadline: null, editedDek: null,
  editedBody: null, editedTags: null, editedImage: null, payload: {}, editorId: 'system',
  reason: null, updatedAt: new Date().toISOString(),
});

/** All decisions for a product (optionally a subset of content ids), keyed by content_id. */
export async function getDecisions(product: string, contentIds?: string[]): Promise<Map<string, Decision>> {
  const rows = (contentIds && contentIds.length
    ? await sql`SELECT * FROM editorial.decisions WHERE product = ${product} AND content_id = ANY(${contentIds})`
    : await sql`SELECT * FROM editorial.decisions WHERE product = ${product}`) as unknown as Row[];
  const m = new Map<string, Decision>();
  for (const r of rows) m.set(r.content_id, toDecision(r));
  return m;
}

export type DecisionPatch = Partial<Omit<Decision, 'product' | 'contentId' | 'updatedAt'>>;

/** Merge a patch onto a content's decision (create if absent) and persist. The DB trigger writes the
 *  audit (before/after) automatically, so any state is reversible from editorial.audit. */
export async function applyDecision(
  product: string,
  contentId: string,
  patch: DecisionPatch,
  editorId: string,
): Promise<Decision> {
  const existing = (await getDecisions(product, [contentId])).get(contentId) ?? DEFAULTS(product, contentId);
  const next: Decision = { ...existing, ...patch, product, contentId, editorId, updatedAt: new Date().toISOString() };
  await sql`
    INSERT INTO editorial.decisions
      (product, content_id, action, pinned_rank, importance_delta, section_override, human_locked,
       edited_headline, edited_dek, edited_body, edited_tags, edited_image, payload, editor_id, reason, updated_at)
    VALUES (${next.product}, ${next.contentId}, ${next.action}, ${next.pinnedRank}, ${next.importanceDelta},
       ${next.sectionOverride}, ${next.humanLocked}, ${next.editedHeadline}, ${next.editedDek}, ${next.editedBody},
       ${next.editedTags}, ${next.editedImage}, ${sql.json(next.payload as Parameters<typeof sql.json>[0])},
       ${next.editorId}, ${next.reason}, now())
    ON CONFLICT (product, content_id) DO UPDATE SET
      action=EXCLUDED.action, pinned_rank=EXCLUDED.pinned_rank, importance_delta=EXCLUDED.importance_delta,
      section_override=EXCLUDED.section_override, human_locked=EXCLUDED.human_locked,
      edited_headline=EXCLUDED.edited_headline, edited_dek=EXCLUDED.edited_dek, edited_body=EXCLUDED.edited_body,
      edited_tags=EXCLUDED.edited_tags, edited_image=EXCLUDED.edited_image, payload=EXCLUDED.payload,
      editor_id=EXCLUDED.editor_id, reason=EXCLUDED.reason, updated_at=now()`;
  return next;
}

// ── Named, reversible actions any product can call ──
export const publishContent = (p: string, id: string, editor: string) =>
  applyDecision(p, id, { action: 'live', pinnedRank: null }, editor);
export const killContent = (p: string, id: string, editor: string, reason?: string) =>
  applyDecision(p, id, { action: 'killed', reason: reason ?? null }, editor);
export const reviveContent = (p: string, id: string, editor: string) =>
  applyDecision(p, id, { action: 'live', pinnedRank: null }, editor);
export const pinContent = (p: string, id: string, editor: string, rank: number) =>
  applyDecision(p, id, { action: 'pinned', pinnedRank: rank }, editor);
export const lockContent = (p: string, id: string, editor: string, locked: boolean) =>
  applyDecision(p, id, { humanLocked: locked }, editor);

/** Full history for a piece of content (newest first) — powers the audit view + one-click revert. */
export async function decisionHistory(product: string, contentId: string): Promise<Array<{ action: string; before: unknown; after: unknown; at: string; editorId: string }>> {
  const rows = (await sql`
    SELECT action, before, after, at, editor_id FROM editorial.audit
    WHERE product = ${product} AND content_id = ${contentId} ORDER BY at DESC`) as unknown as Array<{ action: string; before: unknown; after: unknown; at: string | Date; editor_id: string }>;
  return rows.map((r) => ({ action: r.action, before: r.before, after: r.after, at: new Date(r.at).toISOString(), editorId: r.editor_id }));
}

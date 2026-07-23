// Editorial CMS — Audit log read + one-step undo (epic 002).
//
// GET  /api/studio/audit   → paginated, filtered audit ledger (zod-validated).
// POST /api/studio/audit   → { id } reverts that entry (restores before), which
//                            appends its own 'undo' audit row.
// Both are editor-gated and speak the standard { ok, data, error } envelope.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CACHE_TAGS } from '@/lib/cache';
import { getAuditEntry, isUndoable, listAudit, undoAudit } from '@/lib/studio/audit';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

function guardMessage(status: 401 | 403): string {
  return status === 401 ? 'Not authenticated' : 'Editor access required';
}

const filterSchema = z.object({
  editor: z.string().trim().min(1).optional(),
  action: z.string().trim().min(1).optional(),
  storyId: z.string().trim().min(1).optional(),
  from: z.string().trim().min(1).optional(),
  to: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function GET(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guardMessage(guard.status), guard.status);

  const params = new URL(req.url).searchParams;
  const parsed = filterSchema.safeParse({
    editor: params.get('editor') ?? undefined,
    action: params.get('action') ?? undefined,
    storyId: params.get('storyId') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
    limit: params.get('limit') ?? undefined,
    offset: params.get('offset') ?? undefined,
  });
  if (!parsed.success) return fail('400', 'Invalid filters', 400);

  try {
    const rows = await listAudit(parsed.data);
    return NextResponse.json({ ok: true, data: rows, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Failed to load audit log', 500);
  }
}

const undoSchema = z.object({ id: z.coerce.number().int().positive() });

export async function POST(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guardMessage(guard.status), guard.status);
  const editorId = guard.editor.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const parsed = undoSchema.safeParse(body);
  if (!parsed.success) return fail('400', 'A numeric audit entry id is required', 400);

  const entry = await getAuditEntry(parsed.data.id);
  if (!entry) return fail('404', 'Audit entry not found', 404);
  if (!isUndoable(entry)) return fail('422', 'This entry carries no prior state to restore', 422);

  try {
    const restored = await undoAudit(entry, editorId);
    // The revert changes what readers see — bust the front-page cache now.
    revalidateTag(CACHE_TAGS.frontPage);
    return NextResponse.json({
      ok: true,
      data: { storyId: restored.storyId, action: restored.action },
      error: null,
    });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Undo failed', 500);
  }
}

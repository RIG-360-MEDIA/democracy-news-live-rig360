// Editorial CMS — Door B (AI-assisted draft) single-job bundle.
// GET returns the full review bundle (draft + evidence + flags + images);
// PATCH saves an editor's in-review edits (headline/dek/beats).

import { NextResponse } from 'next/server';

import { DispatchError, getJob, saveEdit } from '@/lib/dispatch/client';
import { saveEditRequestSchema } from '@/lib/dispatch/types';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, data: null, error: { code, message, details } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteContext) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  const { id: jobId } = await params;
  if (!jobId) return fail('400', 'Job id is required', 400);

  try {
    const bundle = await getJob(jobId, guard.editor.id);
    return NextResponse.json({ ok: true, data: bundle, error: null });
  } catch (e: unknown) {
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Fetching the draft failed', 500);
  }
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  const { id: jobId } = await params;
  if (!jobId) return fail('400', 'Job id is required', 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const parsed = saveEditRequestSchema.safeParse(body);
  if (!parsed.success) return fail('400', 'Invalid edit payload', 400, parsed.error.flatten());

  try {
    const bundle = await saveEdit(jobId, parsed.data, guard.editor.id);
    return NextResponse.json({ ok: true, data: bundle, error: null });
  } catch (e: unknown) {
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Saving the edit failed', 500);
  }
}

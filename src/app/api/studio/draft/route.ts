// Editorial CMS — Door B (AI-assisted draft) job intake + polling.
// POST creates a draftsmith job on the box; GET polls status for one or more
// job ids (the review list / in-flight tray).

import { NextResponse } from 'next/server';

import { createJob, DispatchError, listJobs } from '@/lib/dispatch/client';
import { createJobRequestSchema } from '@/lib/dispatch/types';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, data: null, error: { code, message, details } }, { status });
}

export async function POST(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const parsed = createJobRequestSchema.safeParse(body);
  if (!parsed.success) {
    return fail('400', 'Invalid draft-job request', 400, parsed.error.flatten());
  }

  try {
    const status = await createJob(parsed.data, guard.editor.id);
    return NextResponse.json({ ok: true, data: status, error: null }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Job creation failed', 500);
  }
}

export async function GET(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  const idsParam = new URL(req.url).searchParams.get('ids');
  const ids = idsParam
    ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  try {
    const statuses = await listJobs(ids, guard.editor.id);
    return NextResponse.json({ ok: true, data: statuses, error: null });
  } catch (e: unknown) {
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Job listing failed', 500);
  }
}

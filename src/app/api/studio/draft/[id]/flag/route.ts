// Editorial CMS — Door B (AI-assisted draft) per-claim flag resolution.
// Deliberately singular: one flag per request. There is no bulk-resolve route
// (mirrors the box's draft_flags_single_resolve trigger — bulk-acknowledge is
// auto-publish in disguise).

import { NextResponse } from 'next/server';

import { DispatchError, resolveFlag } from '@/lib/dispatch/client';
import { resolveFlagRequestSchema } from '@/lib/dispatch/types';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, data: null, error: { code, message, details } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
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

  const record = body as Record<string, unknown>;
  const flagId = typeof record.flag_id === 'string' ? record.flag_id.trim() : '';
  if (!flagId) return fail('400', 'flag_id is required', 400);

  const parsed = resolveFlagRequestSchema.safeParse(body);
  if (!parsed.success) return fail('400', 'Invalid flag-resolution payload', 400, parsed.error.flatten());

  try {
    const flag = await resolveFlag(jobId, flagId, parsed.data, guard.editor.id);
    return NextResponse.json({ ok: true, data: flag, error: null });
  } catch (e: unknown) {
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Resolving the flag failed', 500);
  }
}

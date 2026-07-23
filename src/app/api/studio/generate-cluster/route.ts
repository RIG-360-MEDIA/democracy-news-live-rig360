// Editorial CMS — on-demand cluster generation (Feature 2).
//
// The desk's "Generate" button asks the box to write a pending-gen cluster's story now, then
// routes the editor to the Door B review screen for the returned job. The box generation service
// (Draftsmith) is NOT deployed yet: when BOX_DRAFTSMITH_URL / BOX_DRAFTSMITH_TOKEN are unset we
// return an honest 503 so the button reports "not deployed yet" plainly instead of failing opaquely.

import { NextResponse } from 'next/server';

import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }
  const editorId = guard.editor.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }
  const storyId = typeof body.storyId === 'string' ? body.storyId : '';
  if (!storyId) return fail('400', 'storyId is required', 400);

  const url = process.env.BOX_DRAFTSMITH_URL;
  const token = process.env.BOX_DRAFTSMITH_TOKEN;
  if (!url || !token) {
    return fail('service_unavailable', 'Generation service not deployed yet', 503);
  }

  try {
    const res = await fetch(`${url.replace(/\/+$/, '')}/jobs/from-cluster`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Editor-Id': editorId,
      },
      body: JSON.stringify({ story_id: storyId }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return fail(String(res.status), `Generation service returned HTTP ${res.status}`, 502);
    }
    const data = (await res.json().catch(() => null)) as { job_id?: string } | null;
    return NextResponse.json({ ok: true, data: { job_id: data?.job_id ?? null }, error: null });
  } catch (e: unknown) {
    return fail('502', e instanceof Error ? e.message : 'Could not reach the generation service', 502);
  }
}

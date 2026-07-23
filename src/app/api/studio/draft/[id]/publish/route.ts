// Editorial CMS — Door B (AI-assisted draft) publish.
//
// Flow: finalize on the box (its own verification gate — a 422 there means
// "not ready to publish" and is surfaced to the editor verbatim) → one insert
// into Neon rigwire.manual_stories (PUBLISHABLE, idempotent per job) → one
// editorial_audit row → bust the reader cache → best-effort tell the box it
// published. The box's confirm-publish is nice-to-have only: once the Neon
// row exists the story is live, and we never roll that back because the box
// round-trip failed.

import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { confirmPublished, DispatchError, finalize } from '@/lib/dispatch/client';
import { sql } from '@/lib/db';
import { createPublishableManualStory } from '@/lib/studio/draft-publish';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, data: null, error: { code, message, details } }, { status });
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_req: Request, { params }: RouteContext) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  // The CMS_DEV_EDITOR bypass (session.ts) exists only to verify UI against the
  // box without a real login — it must never be able to publish a live story.
  if (guard.editor.id === 'dev@local') {
    return fail('403', 'The local dev identity cannot publish. Sign in as a real editor.', 403);
  }
  const editorId = guard.editor.id;

  const { id: jobId } = await params;
  if (!jobId) return fail('400', 'Job id is required', 400);

  let payload;
  try {
    payload = await finalize(jobId, editorId);
  } catch (e: unknown) {
    // The box's 422 (e.g. unresolved red flags) is a real editorial signal —
    // surface its code/message/details verbatim rather than flattening to 500.
    if (e instanceof DispatchError) return fail(e.code, e.message, e.status, e.details);
    return fail('500', e instanceof Error ? e.message : 'Finalize failed', 500);
  }

  let storyId: string;
  try {
    storyId = await createPublishableManualStory(
      {
        headline: payload.headline,
        dek: payload.dek,
        body: payload.body_markdown,
        topic: payload.topic,
        country: payload.country,
        imageUrl: payload.image_url,
        importance: payload.importance_suggested,
        draftJobId: payload.job_id,
      },
      editorId,
    );
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Publishing the story failed', 500);
  }

  try {
    await sql`
      INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
      VALUES (
        ${storyId}, ${editorId}, 'doorb_publish', null,
        ${sql.json({
          job_id: payload.job_id,
          version: payload.version,
          flags_summary: payload.flags_summary,
        } as unknown as Parameters<typeof sql.json>[0])}
      )
    `;
  } catch (e: unknown) {
    // Audit is best-effort visibility, not a publish gate — the story already landed.
    console.error(`[doorb_publish] audit insert failed for job=${jobId} story=${storyId}`, e);
  }

  // A new manual story can surface on the front page — bust the reader cache now.
  revalidateTag(CACHE_TAGS.frontPage);

  try {
    await confirmPublished(jobId, storyId, editorId);
  } catch (e: unknown) {
    // Best-effort — never roll back the Neon publish because the box round-trip failed.
    console.error(`[doorb_publish] confirmPublished failed for job=${jobId} story=${storyId}`, e);
  }

  return NextResponse.json({ ok: true, data: { id: storyId }, error: null });
}

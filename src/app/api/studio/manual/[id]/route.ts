// Editorial CMS — change a manual story (F9).
//   PATCH  (editor) — edit fields and/or unpublish / republish  { headline?, dek?, body?, topic?,
//                     country?, image_url?, importance?, status?: 'PUBLISHABLE' | 'UNPUBLISHED' }
//   DELETE (admin)  — soft delete: status DELETED, row kept, hidden everywhere
// Each write is audited in the same transaction (manual-edit.ts).
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { sql } from '@/lib/db';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { setAuthors } from '@/lib/studio/authors';
import { guardApi } from '@/lib/studio/guard';
import { changeManualStory, ManualStoryError, type ManualStatus, type ManualStoryPatch } from '@/lib/studio/manual-edit';
import { manualPatchSchema, storyIdSchema } from '@/lib/studio/input-schemas';

export const runtime = 'nodejs';

interface Ctx {
  params: Promise<{ id: string }>;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

async function apply(id: string, patch: ManualStoryPatch, status: ManualStatus | undefined, editor: string) {
  try {
    const data = await changeManualStory(id, patch, status, editor);
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(id); // unpublish/delete must not survive one more cached view
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    if (e instanceof ManualStoryError) return fail(String(e.status), e.message, e.status);
    console.error('[studio/manual] failed', { editor, id, status, error: e });
    return fail('500', 'Update failed', 500);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;

  const id = storyIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return fail('400', 'Invalid story id', 400);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }
  const parsed = manualPatchSchema.safeParse(raw);
  if (!parsed.success) return fail('400', parsed.error.issues[0]?.message ?? 'Invalid input', 400);

  const { status, image_url, authors, ...fields } = parsed.data;
  const patch: ManualStoryPatch = {
    ...fields,
    ...(image_url !== undefined ? { imageUrl: image_url } : {}),
  };
  if (authors !== undefined) {                     // the byline lives in rigwire.story_authors (audited there)
    try {
      await setAuthors(id.data, authors, guard.editor.id);
    } catch (e) {
      console.error('[studio/manual] authors failed', { id: id.data, error: e });
      return fail('500', 'Saving the authors failed', 500);
    }
    if (status === undefined && Object.values(patch).every((v) => v === undefined)) {
      revalidateStoryPage(id.data);
      revalidateTag(CACHE_TAGS.frontPage);
      return NextResponse.json({ ok: true, data: { id: id.data }, error: null });
    }
  }
  return apply(id.data, patch, status, guard.editor.id);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  // Deleting is irreversible from the UI (the row is kept for the record): a published story - admin only;
  // a DRAFT (never on the site) - any editor, from the Drafts list.
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;

  const id = storyIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return fail('400', 'Invalid story id', 400);
  if (!guard.editor.isAdmin) {
    const rows = (await sql`SELECT status FROM rigwire.manual_stories WHERE id = ${id.data}`) as unknown as Array<{ status: string }>;
    if (rows[0]?.status !== 'DRAFT') return fail('403', 'Only an admin can delete a published story', 403);
  }

  return apply(id.data, {}, 'DELETED', guard.editor.id);
}

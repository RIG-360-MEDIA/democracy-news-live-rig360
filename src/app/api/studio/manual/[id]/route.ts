// Editorial CMS — change a manual story (F9).
//   PATCH  (editor) — edit fields and/or unpublish / republish  { headline?, dek?, body?, topic?,
//                     country?, image_url?, importance?, status?: 'PUBLISHABLE' | 'UNPUBLISHED' }
//   DELETE (admin)  — soft delete: status DELETED, row kept, hidden everywhere
// Each write is audited in the same transaction (manual-edit.ts).
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';
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

  const { status, image_url, ...fields } = parsed.data;
  const patch: ManualStoryPatch = {
    ...fields,
    ...(image_url !== undefined ? { imageUrl: image_url } : {}),
  };
  return apply(id.data, patch, status, guard.editor.id);
}

export async function DELETE(_req: Request, ctx: Ctx) {
  // Deleting is irreversible from the UI (the row is kept for the record) — admin only.
  const guard = await guardApi('admin');
  if (!guard.ok) return guard.response;

  const id = storyIdSchema.safeParse((await ctx.params).id);
  if (!id.success) return fail('400', 'Invalid story id', 400);

  return apply(id.data, {}, 'DELETED', guard.editor.id);
}

// Editorial CMS — commit a Top Stories drag-reorder atomically (F10). Epic 002 `POST /api/studio/reorder`.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CACHE_TAGS } from '@/lib/cache';
import { guardApi } from '@/lib/studio/guard';
import { storyIdSchema } from '@/lib/studio/input-schemas';
import { MAX_REORDER } from '@/lib/studio/pins';
import { CONFLICT_MESSAGE, isWriteConflict } from '@/lib/studio/db-errors';
import { ReorderConflictError, reorderTopStories } from '@/lib/studio/reorder';

export const runtime = 'nodejs';

const bodySchema = z.object({
  order: z
    .array(storyIdSchema)
    .min(1)
    .max(MAX_REORDER)
    .refine((ids) => new Set(ids).size === ids.length, 'order lists a story more than once'),
  /** pinSetToken of the pin set the client loaded; a mismatch means the page is stale → 409. */
  expectedPinToken: z.string().max(64).optional(),
});

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return fail('400', parsed.error.issues[0]?.message ?? 'Invalid order', 400);

  const editor = guard.editor.id;
  try {
    const data = await reorderTopStories(parsed.data.order, editor, parsed.data.expectedPinToken);
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateTag(CACHE_TAGS.storyDetail);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    // Nothing was written: the whole reorder ran in one transaction and rolled back.
    if (e instanceof ReorderConflictError) return fail('409', e.message, 409);
    if (isWriteConflict(e)) return fail('409', CONFLICT_MESSAGE, 409);
    console.error('[studio/reorder] failed', { editor, order: parsed.data.order, error: e });
    return fail('500', 'Reorder failed — nothing was changed', 500);
  }
}

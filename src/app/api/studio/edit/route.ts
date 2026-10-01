// Editorial CMS — inline edit (headline/dek/body/tags). Locks the story. Epic 002.
import { revalidateTag } from 'next/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { editStory } from '@/lib/studio/overrides';
import { guardApi } from '@/lib/studio/guard';
import { editSchema } from '@/lib/studio/input-schemas';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;
  const editor = guard.editor.id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  // L1: uuid story id, length-capped fields, http(s)-only image ('' clears the override).
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message === 'No fields to edit' ? 'No fields to edit' : 'Invalid edit request';
    return fail('400', message, 400);
  }
  const { storyId, ...fields } = parsed.data;

  try {
    const data = await editStory(storyId, editor, fields);
    // Edited headline/deck/image/section changes the reader view — bust the cache now.
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(storyId);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    console.error('[studio/edit] failed', { editor, storyId, fields: Object.keys(fields), error: e });
    return fail('500', 'Edit failed', 500);
  }
}

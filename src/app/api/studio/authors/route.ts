// Editorial CMS — set a story's authors (byline), before or after publishing; '' = back to the house byline.
// { storyId, authors }. Audited ('authors_edit'); the front page and the story page refresh at once.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { CACHE_TAGS } from '@/lib/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { setAuthors } from '@/lib/studio/authors';
import { AUTHORS_MAX } from '@/lib/studio/authors-text';
import { guardApi } from '@/lib/studio/guard';
import { storyIdSchema } from '@/lib/studio/input-schemas';

export const runtime = 'nodejs';

const bodySchema = z.object({ storyId: storyIdSchema, authors: z.string().max(AUTHORS_MAX + 10) }).strict();

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
  const body = bodySchema.safeParse(raw);
  if (!body.success) return fail('400', `Authors must be ${AUTHORS_MAX} characters or fewer`, 400);
  try {
    const authors = await setAuthors(body.data.storyId, body.data.authors, guard.editor.id);
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(body.data.storyId);
    return NextResponse.json({ ok: true, data: { authors }, error: null });
  } catch (e) {
    console.error('[studio/authors] failed', { editor: guard.editor.id, storyId: body.data.storyId, error: e });
    return fail('500', 'Saving the authors failed', 500);
  }
}

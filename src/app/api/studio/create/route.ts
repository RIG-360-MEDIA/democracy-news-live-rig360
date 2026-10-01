// Editorial CMS — author a manual story (E6).
import { revalidateTag } from 'next/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { guardApi } from '@/lib/studio/guard';
import { createSchema } from '@/lib/studio/input-schemas';
import { createManualStory } from '@/lib/studio/manual';

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

  // L1: required headline/body, length caps on every field, http(s)-only image_url, bounded importance.
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'input');
    return fail('400', `Invalid ${field}`, 400);
  }
  const { headline, body, dek, country, image_url: imageUrl, topic, importance } = parsed.data;

  try {
    const id = await createManualStory({ headline, dek, body, topic, country, imageUrl, importance }, editor);
    // A new manual story can surface on the front page — bust the reader cache now.
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(id);
    return NextResponse.json({ ok: true, data: { id }, error: null });
  } catch (e: unknown) {
    console.error('[studio/create] failed', { editor, error: e });
    return fail('500', 'Create failed', 500);
  }
}

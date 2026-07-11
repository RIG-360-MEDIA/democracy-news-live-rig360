// Editorial CMS — inline edit (headline/dek/body/tags). Locks the story. Epic 002.
import { NextResponse } from 'next/server';

import { editStory } from '@/lib/studio/overrides';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  const editor = guard.editor.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const storyId = typeof body.storyId === 'string' ? body.storyId : '';
  if (!storyId) return fail('400', 'storyId is required', 400);

  const fields: { headline?: string; dek?: string; body?: string; tags?: string[]; image?: string } = {};
  if (typeof body.headline === 'string') fields.headline = body.headline;
  if (typeof body.dek === 'string') fields.dek = body.dek;
  if (typeof body.body === 'string') fields.body = body.body;
  if (Array.isArray(body.tags)) fields.tags = body.tags.filter((t): t is string => typeof t === 'string');
  if (typeof body.image === 'string') {
    const url = body.image.trim();
    // Empty clears the override; otherwise require an absolute http(s) image URL.
    if (url && !/^https?:\/\/\S+$/i.test(url)) return fail('400', 'Image must be an http(s) URL', 400);
    fields.image = url;
  }
  if (Object.keys(fields).length === 0) return fail('400', 'No fields to edit', 400);

  try {
    const data = await editStory(storyId, editor, fields);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Edit failed', 500);
  }
}

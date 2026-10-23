// Editorial CMS — upload an image from the editor's computer (Create page). multipart/form-data, field "file".
import { NextResponse } from 'next/server';

import { guardApi } from '@/lib/studio/guard';
import { MediaError, saveMedia } from '@/lib/studio/media';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;
  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get('file');
  } catch {
    return fail('400', 'Expected a file upload', 400);
  }
  if (!(file instanceof Blob)) return fail('400', 'No file attached', 400);
  try {
    const path = await saveMedia(new Uint8Array(await file.arrayBuffer()), (file as File).name ?? null, guard.editor.id);
    return NextResponse.json({ ok: true, data: { path }, error: null });
  } catch (e) {
    if (e instanceof MediaError) return fail('400', e.message, 400);
    console.error('[studio/media/upload] failed', { editor: guard.editor.id, error: e });
    return fail('500', 'Upload failed', 500);
  }
}

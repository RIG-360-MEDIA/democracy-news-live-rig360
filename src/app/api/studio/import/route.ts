// Editorial CMS — read an article document into the Create form (multipart/form-data, field "file").
// .docx / .pdf / .txt / .md -> { headline, dek (strap), body with "## " section headings, imagePath } (see doc-import.ts).
// Nothing is published or saved as a story: the editor checks the fields, then saves a draft or publishes.
import { NextResponse } from 'next/server';

import { assembleFields, docxToBlocks, pdfToBlocks, textToBlocks, type Block } from '@/lib/studio/doc-import';
import { guardApi } from '@/lib/studio/guard';
import { MediaError, saveMedia } from '@/lib/studio/media';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_DOC_BYTES = 20 * 1024 * 1024;

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
  if (file.size > MAX_DOC_BYTES) return fail('400', 'Documents must be 20 MB or smaller', 400);
  const name = ((file as File).name ?? '').toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  const zip = buf.subarray(0, 2).toString('latin1') === 'PK';
  const pdf = buf.subarray(0, 5).toString('latin1') === '%PDF-';

  let blocks: Block[];
  let image: Uint8Array | null = null;
  try {
    if (pdf) blocks = await pdfToBlocks(new Uint8Array(buf));
    else if (zip && name.endsWith('.docx')) ({ blocks, image } = await docxToBlocks(buf));
    else if (/\.(txt|md|markdown)$/.test(name)) blocks = textToBlocks(buf.toString('utf8'));
    else return fail('400', 'Use a Word .docx, a .pdf, or a .txt/.md file (old .doc files: save as .docx first)', 400);
  } catch (e) {
    console.error('[studio/import] could not read', { editor: guard.editor.id, name, error: e });
    return fail('400', 'Could not read this document - is it password-protected or damaged?', 400);
  }
  if (blocks.length === 0) return fail('400', 'No text found (a scanned PDF has no text to read)', 400);

  const fields = assembleFields(blocks);
  let imagePath: string | null = null;
  if (image) {
    try {
      imagePath = await saveMedia(image, `${name} (picture 1)`, guard.editor.id);
    } catch (e) {
      if (!(e instanceof MediaError)) console.error('[studio/import] picture not stored', { error: e });
    }
  }
  return NextResponse.json({ ok: true, data: { ...fields, country: '', imagePath }, error: null });
}

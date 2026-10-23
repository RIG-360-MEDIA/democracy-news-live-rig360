// Import an article document into the Create form (Create page "Import document").
//
// A .docx (mammoth), .pdf (unpdf, with font sizes and line positions) or .txt/.md is turned into BLOCKS
// (title / subtitle / heading / paragraph), then assembleFields() sorts them into the form:
//   headline = the document title (Word "Title" style, the biggest PDF text, or the first short line)
//   strap    = a Word "Subtitle" / all-italic line, else the first SHORT paragraph right after the
//              headline (<= 45 words, not a "CITY:" dateline)
//   body     = every other paragraph, separated by blank lines; real headings (Word Heading 1-6, bigger
//              PDF text, a bold-only line, or a short capitalised line without a full stop) become "## "
//   image    = the first picture inside a .docx (stored as an uploaded image by the API route)
// Topic, country and importance stay with the editor. Pure except the two parsers.

export type Block = { kind: 'title' | 'subtitle' | 'heading' | 'para'; text: string };

export interface ImportedFields {
  headline: string;
  dek: string;
  body: string;
  headings: number;
}

const words = (s: string): number => s.split(/\s+/).filter(Boolean).length;
const clean = (s: string): string => s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim();

/** A short standalone line that reads as a section heading (the reader page uses the same rule). */
export function looksLikeHeading(t: string): boolean {
  return t.length <= 70 && words(t) <= 9 && /^[A-Z'"‘“]/.test(t) && !/[.?!:;,]$/.test(t);
}

const DATELINE = /^[A-Z][A-Z .'-]{2,30}:/;   // "NEW DELHI:" opens the body, it is never the strap

export function assembleFields(blocks: ReadonlyArray<Block>): ImportedFields {
  const bs = blocks.map((b) => ({ ...b, text: clean(b.text) })).filter((b) => b.text);
  let i = 0;
  let headline = '';
  const titleAt = bs.findIndex((b) => b.kind === 'title');
  if (titleAt >= 0) {
    headline = bs[titleAt].text;
    bs.splice(titleAt, 1);
  } else if (bs[0] && (bs[0].kind === 'heading' || words(bs[0].text) <= 20)) {
    headline = bs[0].text;
    i = 1;
  }
  let dek = '';
  const subAt = bs.findIndex((b) => b.kind === 'subtitle');
  if (subAt >= 0) {
    dek = bs[subAt].text;
    bs.splice(subAt, 1);
    if (subAt < i) i -= 1;
  } else {
    const next = bs[i];
    const paras = bs.filter((b) => b.kind === 'para').length;
    if (next && next.kind === 'para' && paras >= 3 && words(next.text) <= 45 && !DATELINE.test(next.text)) {
      dek = next.text;
      i += 1;
    }
  }
  let headings = 0;
  const out: string[] = [];
  for (const b of bs.slice(i)) {
    const t = b.text.replace(/^#+\s*/, '');
    if (b.kind === 'heading' || b.kind === 'title' || (b.kind === 'para' && looksLikeHeading(t) && out.length > 0)) {
      out.push(`## ${t}`);
      headings += 1;
    } else {
      out.push(b.text);
    }
  }
  return { headline, dek, body: out.join('\n\n'), headings };
}

/** .txt / .md: paragraphs are separated by blank lines, or by single line breaks when there are none. */
export function textToBlocks(text: string): Block[] {
  const t = text.replace(/\r\n?/g, '\n');
  const parts = /\n\s*\n/.test(t) ? t.split(/\n\s*\n/) : t.split('\n');
  return parts.map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean).map((p) =>
    /^#\s/.test(p) ? { kind: 'title' as const, text: p.replace(/^#\s+/, '') }
      : /^#{2,6}\s/.test(p) ? { kind: 'heading' as const, text: p.replace(/^#+\s+/, '') }
        : { kind: 'para' as const, text: p.replace(/\*\*/g, '') });
}

const decode = (s: string): string =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');

/** .docx -> blocks + its first picture (bytes), via mammoth's HTML (Title/Subtitle styles mapped). */
export async function docxToBlocks(buf: Buffer): Promise<{ blocks: Block[]; image: Uint8Array | null }> {
  const mammoth = (await import('mammoth')).default;
  let image: Uint8Array | null = null;
  const { value: html } = await mammoth.convertToHtml({ buffer: buf }, {
    styleMap: ["p[style-name='Title'] => h1.title:fresh", "p[style-name='Subtitle'] => p.subtitle:fresh"],
    convertImage: mammoth.images.imgElement(async (img) => {
      if (!image) image = new Uint8Array(await img.readAsBuffer());
      return { src: '' };
    }),
  });
  const blocks: Block[] = [];
  for (const m of html.matchAll(/<(h[1-6]|p|li)([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const [, tag, attrs, inner] = m;
    const text = decode(inner);
    if (!text.trim()) continue;
    const allBold = /^\s*<strong>[\s\S]*<\/strong>\s*$/.test(inner);
    const allItalic = /^\s*<em>[\s\S]*<\/em>\s*$/.test(inner);
    if (/class="title"/.test(attrs)) blocks.push({ kind: 'title', text });
    else if (/class="subtitle"/.test(attrs)) blocks.push({ kind: 'subtitle', text });
    else if (tag === 'h1' && !blocks.some((b) => b.kind === 'title')) blocks.push({ kind: 'title', text });
    else if (tag.startsWith('h') || (allBold && words(text) <= 14)) blocks.push({ kind: 'heading', text });
    else if (allItalic && blocks.length <= 2 && words(text) <= 45) blocks.push({ kind: 'subtitle', text });
    else blocks.push({ kind: 'para', text });
  }
  return { blocks, image };
}

/** .pdf -> blocks from text positions: lines grouped by y, paragraphs split on bigger gaps, bigger text = title/heading. */
export async function pdfToBlocks(buf: Uint8Array): Promise<Block[]> {
  const { getDocumentProxy } = await import('unpdf');
  const pdf = await getDocumentProxy(buf);
  type Line = { y: number; size: number; text: string; page: number };
  const lines: Line[] = [];
  for (let p = 1; p <= Math.min(pdf.numPages, 40); p += 1) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    let cur: Line | null = null;
    for (const it of content.items as Array<{ str?: string; transform?: number[]; height?: number }>) {
      if (!it.str || !it.transform) continue;
      const y = Math.round(it.transform[5]);
      const size = Math.round(Math.abs(it.transform[3]) || it.height || 0);
      if (cur && Math.abs(cur.y - y) <= 2) {
        cur.text += (/\s$/.test(cur.text) || /^\s/.test(it.str) ? '' : ' ') + it.str;
        cur.size = Math.max(cur.size, size);
      } else {
        if (cur) lines.push(cur);
        cur = { y, size, text: it.str, page: p };
      }
    }
    if (cur) lines.push(cur);
  }
  const real = lines.filter((l) => l.text.trim());
  if (real.length === 0) return [];
  const sizes = real.map((l) => l.size).sort((a, b) => a - b);
  const body = sizes[Math.floor(sizes.length / 2)] || 10;
  // the normal line-to-line step INSIDE a paragraph: the lower quartile of gaps between body-size lines
  // (a median over a short article is pulled up by the paragraph and heading gaps)
  const gaps = real.slice(1)
    .map((l, k) => (l.page === real[k].page && l.size === body && real[k].size === body ? real[k].y - l.y : 0))
    .filter((g) => g > 0).sort((a, b) => a - b);
  const lineGap = gaps[Math.floor(gaps.length / 4)] || body * 1.2;
  const maxSize = sizes[sizes.length - 1];
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'para', text: para.join(' ').replace(/-\s+(?=[a-z])/g, '') });
    para = [];
  };
  real.forEach((l, k) => {
    const prev = real[k - 1];
    const gap = prev && prev.page === l.page ? prev.y - l.y : Infinity;
    if (l.size >= body * 1.15) {                                   // bigger text: the title, then headings
      flush();
      const kind = !blocks.some((b) => b.kind === 'title') && l.size >= maxSize - 0.5 && l.page === 1 ? 'title' : 'heading';
      const last = blocks[blocks.length - 1];
      if (last && last.kind !== 'para' && prev && prev.size === l.size && gap <= l.size * 1.6) last.text += ' ' + l.text.trim();   // a wrapped title/heading
      else blocks.push({ kind, text: l.text.trim() });
      return;
    }
    if (gap > lineGap * 1.45) flush();                              // a visible gap starts a new paragraph
    para.push(l.text.trim());
  });
  flush();
  return blocks;
}

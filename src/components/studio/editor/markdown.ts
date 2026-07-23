// Tiny markdown helpers for the story editor — NO rich-text framework. Just
// enough structure to (a) split a body into editable blocks, (b) round-trip
// them immutably, and (c) recognise the editorial youtube-embed marker.
//
// Embed marker (editorial convention, greppable, one per line):
//   !youtube[<title>](<embed_url>)

export const YT_MARKER = /^!youtube\[([^\]]*)\]\(([^)]+)\)\s*$/;

/** Split a body into block strings on blank lines. Always returns >= 1 block. */
export function splitBlocks(body: string): ReadonlyArray<string> {
  const blocks = body.replace(/\r\n/g, '\n').split(/\n{2,}/).map((b) => b.trimEnd());
  return blocks.length ? blocks : [''];
}

/** Rejoin blocks into a body. Immutable — inputs are not touched. */
export function joinBlocks(blocks: ReadonlyArray<string>): string {
  return blocks.map((b) => b.trimEnd()).join('\n\n');
}

/** Return a new block list with index `i` replaced. */
export function replaceBlock(blocks: ReadonlyArray<string>, i: number, value: string): string[] {
  return blocks.map((b, idx) => (idx === i ? value : b));
}

/** Return a new block list with `value` inserted after index `i`. */
export function insertBlockAfter(blocks: ReadonlyArray<string>, i: number, value: string): string[] {
  return [...blocks.slice(0, i + 1), value, ...blocks.slice(i + 1)];
}

/** Return a new block list with index `i` removed (never empties the list). */
export function removeBlock(blocks: ReadonlyArray<string>, i: number): string[] {
  const next = blocks.filter((_, idx) => idx !== i);
  return next.length ? next : [''];
}

/** All inline image URLs in a body (markdown `![alt](url)`), in order. */
export function extractImageUrls(body: string): string[] {
  const urls: string[] = [];
  const re = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) urls.push(m[1]);
  return urls;
}

/** Replace the first occurrence of an image URL in the body. Immutable. */
export function replaceImageUrl(body: string, from: string, to: string): string {
  return body.replace(from, to);
}

/** Append a youtube embed marker as its own block. Immutable. */
export function appendEmbed(body: string, embedUrl: string, title: string): string {
  const clean = title.replace(/[[\]()]/g, '').trim();
  return joinBlocks([...splitBlocks(body), `!youtube[${clean}](${embedUrl})`]);
}

/** Remove every block that is a youtube marker for `embedUrl`. Immutable. */
export function removeEmbed(body: string, embedUrl: string): string {
  const kept = splitBlocks(body).filter((b) => {
    const m = b.match(YT_MARKER);
    return !(m && m[2] === embedUrl);
  });
  return joinBlocks(kept.length ? kept : ['']);
}

/** Embed URLs currently present in the body, in order. */
export function embedsInBody(body: string): string[] {
  return splitBlocks(body)
    .map((b) => b.match(YT_MARKER))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[2]);
}

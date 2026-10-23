// A story's authors as typed by an editor: "By A. Writer and B. Writer" -> "A. Writer and B. Writer".
// '' means "no authors set" (the reader shows the house byline). DB-free, so it is unit-testable.
export const AUTHORS_MAX = 200;

export function cleanAuthors(raw: string | null | undefined): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().replace(/^by\s+/i, '').trim().slice(0, AUTHORS_MAX);
}

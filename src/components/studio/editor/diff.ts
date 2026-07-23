// Minimal line-level diff (LCS) for the editor's "view original" toggle. Pure,
// immutable, no dependency. Produces a flat list of rows the UI renders as
// removed (generated) / added (edited) / unchanged lines.

export type DiffKind = 'same' | 'add' | 'del';

export interface DiffRow {
  kind: DiffKind;
  text: string;
}

/** Longest-common-subsequence line diff of `before` → `after`. */
export function diffLines(before: string, after: string): ReadonlyArray<DiffRow> {
  const a = before.replace(/\r\n/g, '\n').split('\n');
  const b = after.replace(/\r\n/g, '\n').split('\n');
  const n = a.length;
  const m = b.length;

  // LCS length table.
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const rows: DiffRow[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ kind: 'same', text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      rows.push({ kind: 'del', text: a[i] });
      i++;
    } else {
      rows.push({ kind: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ kind: 'del', text: a[i++] });
  while (j < m) rows.push({ kind: 'add', text: b[j++] });
  return rows;
}

/** True when any field differs from the generated original. */
export function hasChanges(before: string, after: string): boolean {
  return before.replace(/\r\n/g, '\n') !== after.replace(/\r\n/g, '\n');
}

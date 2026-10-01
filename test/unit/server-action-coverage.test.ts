// M4 — every server-action module anywhere under src/ is either covered by the Studio role matrix
// (test/unit/studio-role-matrix.test.ts, via ./studio/discover.ts) or explicitly allowlisted here as a
// deliberately public / self-authenticating action. A new 'use server' file outside the Studio can't
// ship without a conscious decision.
import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { discoverActionFiles } from './studio/discover';

const SRC_DIR = path.resolve(__dirname, '../../src');

/** Public or self-authenticating action modules (path relative to src/, forward slashes). */
const PUBLIC_ACTION_ALLOWLIST: Record<string, string> = {
  'app/(auth)/signin/actions.ts': 'sign-in: authenticates the caller itself (rate-limited credentials check)',
  'app/(auth)/signup/actions.ts': 'sign-up: public, and refused on DNL unless DNL_ALLOW_SIGNUP=1',
  'app/onboarding/actions.ts': "onboarding: writes only the signed-in reader's own preferences",
  'app/reset-password/actions.ts': 'set-password: authorised by the single-use hashed token',
};

// Same shape as discover.ts: a file-level directive may only be preceded by comments/whitespace.
const FILE_DIRECTIVE = /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*)*\s*['"]use server['"]/;
const ANY_DIRECTIVE = /['"]use server['"]/;

function sourceFiles(): string[] {
  return (fs.readdirSync(SRC_DIR, { recursive: true }) as string[])
    .map((f) => f.split(path.sep).join('/'))
    .filter((rel) => /\.(ts|tsx|js|jsx|mjs)$/.test(rel) && !/\.test\.tsx?$/.test(rel))
    .filter((rel) => fs.statSync(path.join(SRC_DIR, rel)).isFile())
    .sort();
}

const files = sourceFiles();
const read = (rel: string) => fs.readFileSync(path.join(SRC_DIR, rel), 'utf8');
const actionModules = files.filter((rel) => FILE_DIRECTIVE.test(read(rel)));
const matrixCovered = new Set(discoverActionFiles().map((s) => `app/${s.rel}`));

describe('M4 — every server-action module is role-checked or deliberately public', () => {
  it('finds the action modules', () => {
    expect(actionModules.length).toBeGreaterThan(0);
  });

  it('each is covered by the Studio role matrix or on the explicit allowlist', () => {
    const uncovered = actionModules.filter((rel) => !matrixCovered.has(rel) && !(rel in PUBLIC_ACTION_ALLOWLIST));
    expect(uncovered).toEqual([]);
  });

  it('no allowlist entry is stale, and none shadows a Studio module', () => {
    for (const rel of Object.keys(PUBLIC_ACTION_ALLOWLIST)) {
      expect(actionModules, `${rel} is allowlisted but is not a 'use server' module`).toContain(rel);
      expect(matrixCovered.has(rel), `${rel} is a Studio module; declare it in the role matrix instead`).toBe(false);
    }
  });

  it('no file outside the Studio declares an inline server action', () => {
    const inline = files.filter((rel) => {
      const src = read(rel);
      return ANY_DIRECTIVE.test(src) && !FILE_DIRECTIVE.test(src);
    });
    expect(inline).toEqual([]);
  });
});

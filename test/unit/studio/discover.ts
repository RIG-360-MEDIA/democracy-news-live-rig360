// Filesystem discovery of every Studio surface (API routes, pages/layouts, server actions), so the
// role matrix is driven by what exists on disk — not by a hand-kept list that can drift.
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.resolve(__dirname, '../../../src/app');

export interface Surface {
  /** Matrix key (URL path, or "<file>#<export>" for actions before the export is appended). */
  key: string;
  /** Module specifier importable from tests (uses the @ alias). */
  specifier: string;
  /** Path relative to src/app, forward slashes. */
  rel: string;
}

function filesUnder(relDir: string): string[] {
  const abs = path.join(APP_DIR, relDir);
  if (!fs.existsSync(abs)) return [];
  return (fs.readdirSync(abs, { recursive: true }) as string[])
    .map((f) => `${relDir}/${f.split(path.sep).join('/')}`)
    .filter((rel) => fs.statSync(path.join(APP_DIR, rel)).isFile())
    .sort();
}

function surface(rel: string, key: string): Surface {
  return { key, rel, specifier: `@/app/${rel.replace(/\.tsx?$/, '')}` };
}

function urlOf(rel: string): string {
  const dir = path.posix.dirname(rel);
  return `/${dir}`.replace(/\/\([^)]+\)/g, ''); // strip route groups
}

/** Every src/app/api/studio/**\/route.ts. */
export function discoverRoutes(): Surface[] {
  return filesUnder('api/studio')
    .filter((rel) => /\/route\.tsx?$/.test(rel))
    .map((rel) => surface(rel, urlOf(rel)));
}

/** Every Studio page and layout (src/app/studio/** plus the /curate editor surface). */
export function discoverPages(): Surface[] {
  return ['studio', 'curate']
    .flatMap(filesUnder)
    .filter((rel) => /\/(page|layout)\.tsx?$/.test(rel))
    .map((rel) => surface(rel, /\/layout\.tsx?$/.test(rel) ? `${urlOf(rel)} (layout)` : urlOf(rel)));
}

export function readSource(rel: string): string {
  return fs.readFileSync(path.join(APP_DIR, rel), 'utf8');
}

const FILE_DIRECTIVE = /^(?:\s*\/\/[^\n]*\n|\s*\/\*[\s\S]*?\*\/\s*)*\s*['"]use server['"]/;

/** Studio files that are server-action modules (a file-level 'use server' directive). */
export function discoverActionFiles(): Surface[] {
  return ['studio', 'curate']
    .flatMap(filesUnder)
    .filter((rel) => /\.tsx?$/.test(rel) && FILE_DIRECTIVE.test(readSource(rel)))
    .map((rel) => surface(rel, rel));
}

/** Studio files declaring an INLINE server action ('use server' inside a function body). */
export function discoverInlineActions(): string[] {
  return ['studio', 'curate']
    .flatMap(filesUnder)
    .filter((rel) => /\.tsx?$/.test(rel))
    .filter((rel) => {
      const src = readSource(rel);
      return /['"]use server['"]/.test(src) && !FILE_DIRECTIVE.test(src);
    });
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/* ═════════════════════════════════════════════════════════════════
   WORLDWIDE — scope filter data
   The scope switch lets the reader narrow the generic global edition to
   a single nation. Region is by SUBJECT (what a story is *about*), not
   the source's country — see worldwide-build-spec §2.

   ⚠️ MOCK (v1 shell): this nation list is a placeholder for the UI.
   In production it is driven by *coverage* — the set of subject-countries
   that clear the per-country story threshold (set by validation). Do not
   treat these counts as real; they exist only so the control renders.
   ═════════════════════════════════════════════════════════════════ */

export interface ScopeOption {
  /** opaque key — never a DB id */
  key: string;
  /** display label in the scope switch */
  label: string;
  /** continent grouping, for the World-scope "Around the World" grid */
  continent: Continent | null;
}

export type Continent =
  | 'Asia'
  | 'Africa'
  | 'Europe'
  | 'Americas'
  | 'Oceania'
  | 'Middle East';

/** The always-present World scope (default). */
export const WORLD_SCOPE: ScopeOption = {
  key: 'world',
  label: 'World',
  continent: null,
};

/**
 * Nation scopes shown beside World.
 * MOCK ordering ≈ coverage volume observed in the corpus; replace with the
 * coverage-gated list when editions land.
 */
export const NATION_SCOPES: ReadonlyArray<ScopeOption> = [
  { key: 'in', label: 'India', continent: 'Asia' },
  { key: 'us', label: 'United States', continent: 'Americas' },
  { key: 'gb', label: 'United Kingdom', continent: 'Europe' },
  { key: 'au', label: 'Australia', continent: 'Oceania' },
  { key: 'ng', label: 'Nigeria', continent: 'Africa' },
  { key: 'cn', label: 'China', continent: 'Asia' },
];

/** All scope options, World first. */
export const SCOPE_OPTIONS: ReadonlyArray<ScopeOption> = [
  WORLD_SCOPE,
  ...NATION_SCOPES,
];

export const DEFAULT_SCOPE_KEY = WORLD_SCOPE.key;

export function isWorldScope(key: string): boolean {
  return key === WORLD_SCOPE.key;
}

export function scopeByKey(key: string): ScopeOption {
  return SCOPE_OPTIONS.find((s) => s.key === key) ?? WORLD_SCOPE;
}

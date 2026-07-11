// Full country names from ISO2 codes — one source of truth, used everywhere a country renders.
// Uses the built-in Intl.DisplayNames (US→United States, GB→United Kingdom, KR→South Korea), so
// there's no hand-maintained 250-row map. DB-free → safe to import from client components.

const REGION = new Intl.DisplayNames(['en'], { type: 'region' });

// A few overrides where the CLDR common name differs from what a news reader expects.
const OVERRIDE: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom', // not ISO2, but appears in some feeds
  KR: 'South Korea',
  KP: 'North Korea',
  RU: 'Russia',
  CD: 'DR Congo',
  SY: 'Syria',
  IR: 'Iran',
  VE: 'Venezuela',
  TZ: 'Tanzania',
  BO: 'Bolivia',
  LA: 'Laos',
  MD: 'Moldova',
};

/** Full country name for an ISO2 code. Returns '' for unknown/placeholder ('XX', null). */
export function countryName(code: string | null | undefined): string {
  if (!code) return '';
  const c = code.trim().toUpperCase();
  if (c === 'XX' || c === '') return '';
  if (OVERRIDE[c]) return OVERRIDE[c];
  try {
    const name = REGION.of(c);
    // Intl echoes the input back for an unknown region — treat that as "no name".
    return name && name !== c ? name : c;
  } catch {
    return c;
  }
}

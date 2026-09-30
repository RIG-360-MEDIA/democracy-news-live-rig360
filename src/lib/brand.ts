// Site brand (DNL program P06 D-4). One codebase, two brands: the DNL deployment
// (DEPLOY_TARGET=dnl → global.democracynewslive.com) must never show the six-mode "Rig Wire" brand.
// NEXT_PUBLIC_BRAND is inlined at build time by next.config.mjs (from DEPLOY_TARGET) so client
// components get the same answer as the server.

export interface Brand {
  key: 'dnl' | 'rigwire';
  name: string;
  tagline: string;
  description: string;
  byline: string;
  siteUrl: string;
}

const DNL: Brand = {
  key: 'dnl',
  name: 'Democracy News Live',
  tagline: 'The whole world, gathered into one read',
  description:
    'The whole world, gathered into one read — every region’s biggest story today, grounded in the reporting of hundreds of newsrooms.',
  byline: 'Democracy News Live Desk',
  siteUrl: 'https://global.democracynewslive.com',
};

const RIG_WIRE: Brand = {
  key: 'rigwire',
  name: 'Rig Wire',
  tagline: 'Six ways to read the world',
  description:
    'Rig Wire synthesises 247 newsrooms into six reading formats — from a sixty-second pulse to a fourteen-minute report. Same world. Pick your length.',
  byline: 'Rig Wire',
  siteUrl: 'https://global.democracynewslive.com',
};

/** A deck/strapline that is just a brand name is generator boilerplate, not content (P06 D-4). */
export function cleanDeck(deck: string | null | undefined): string {
  const d = (deck ?? '').trim();
  return /^(rig wire|democracy news live)\.?$/i.test(d) ? '' : d;
}

export function brandFor(key: string | undefined): Brand {
  return key === 'rigwire' ? RIG_WIRE : DNL;
}

// Default is DNL: it is the only production deployment of this codebase.
export const BRAND: Brand = brandFor(process.env.NEXT_PUBLIC_BRAND);

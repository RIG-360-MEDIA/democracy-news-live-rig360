/* ═════════════════════════════════════════════════════════════════
   AROUND THE WORLD — country grid data (World scope only)
   One headline per qualifying country, grouped by continent. Region is
   by SUBJECT (worldwide-build-spec §2): a country qualifies when its
   subject-coverage clears the per-country threshold (set by validation).

   ⚠️ MOCK (v1 shell): placeholder headlines so the band renders. In
   production this is built from the clustered story pool — one top story
   per country that clears the coverage gate. Do not treat as real.
   ═════════════════════════════════════════════════════════════════ */

import type { Continent } from './worldwide-scope-data';

export interface CountryStory {
  /** ISO-ish opaque key — never a DB id */
  key: string;
  country: string;
  /** one-line headline of that country's top story today */
  headline: string;
  /** mock source-diversity count, shown as a tiny credibility tick */
  sources: number;
  timestamp: string;
}

export interface ContinentGroup {
  continent: Continent;
  countries: ReadonlyArray<CountryStory>;
}

/** Continent display order for the grid. */
export const CONTINENT_ORDER: ReadonlyArray<Continent> = [
  'Asia',
  'Africa',
  'Europe',
  'Americas',
  'Middle East',
  'Oceania',
];

export const AROUND_THE_WORLD: ReadonlyArray<ContinentGroup> = [
  {
    continent: 'Asia',
    countries: [
      { key: 'in', country: 'India', headline: 'Parliament clears landmark data-protection overhaul after marathon session', sources: 31, timestamp: '2h ago' },
      { key: 'cn', country: 'China', headline: 'Shanxi coal-mine blast toll rises to 90 as rescue teams reach final shaft', sources: 18, timestamp: '5h ago' },
      { key: 'jp', country: 'Japan', headline: 'Tokyo unveils ¥4tn chip-subsidy package to onshore advanced fabs', sources: 12, timestamp: '6h ago' },
    ],
  },
  {
    continent: 'Africa',
    countries: [
      { key: 'ng', country: 'Nigeria', headline: 'Lagos flood-defence plan fast-tracked as rains arrive three weeks early', sources: 14, timestamp: '3h ago' },
      { key: 'gh', country: 'Ghana', headline: 'Accra signs regional grid pact to export solar surplus to neighbours', sources: 9, timestamp: '7h ago' },
      { key: 'cd', country: 'DR Congo', headline: 'WHO confirms Ebola outbreak contained in eastern province', sources: 11, timestamp: '8h ago' },
    ],
  },
  {
    continent: 'Europe',
    countries: [
      { key: 'gb', country: 'United Kingdom', headline: 'Bank of England holds rate as services inflation finally cools', sources: 22, timestamp: '1h ago' },
      { key: 'fr', country: 'France', headline: 'Paris transit unions suspend strike after late-night wage deal', sources: 13, timestamp: '4h ago' },
      { key: 'ru', country: 'Russia', headline: 'Moscow announces new Arctic LNG terminal despite sanctions', sources: 10, timestamp: '9h ago' },
    ],
  },
  {
    continent: 'Americas',
    countries: [
      { key: 'us', country: 'United States', headline: 'Senate advances bipartisan port-automation bill after labour talks', sources: 28, timestamp: '1h ago' },
      { key: 'br', country: 'Brazil', headline: 'Amazon deforestation hits record low for a third straight quarter', sources: 12, timestamp: '6h ago' },
    ],
  },
  {
    continent: 'Middle East',
    countries: [
      { key: 'ir', country: 'Iran', headline: 'Tehran reopens nuclear-inspection talks through Omani channel', sources: 15, timestamp: '5h ago' },
    ],
  },
  {
    continent: 'Oceania',
    countries: [
      { key: 'au', country: 'Australia', headline: 'Canberra commits to 2035 emissions target ahead of Pacific summit', sources: 16, timestamp: '3h ago' },
    ],
  },
];

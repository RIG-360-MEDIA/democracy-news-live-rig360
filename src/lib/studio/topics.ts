// Editorial CMS — client-safe topic constants (NO database imports).
//
// Split out of manual.ts so client components (e.g. the Create form) can import
// the topic list without dragging the Postgres driver into the browser bundle.
// manual.ts imports sql; anything that value-imports from it becomes a server-only
// module. This file must stay dependency-free.

/** The 10 canonical front-page sections (matches ranking.ts sectionOf) + OTHER. */
export const MANUAL_TOPICS = [
  'POLITICS',
  'SPORTS',
  'SECURITY',
  'ENVIRONMENT',
  'HEALTH',
  'BUSINESS',
  'FINANCE',
  'LEGAL',
  'TECHNOLOGY',
  'SOCIETY',
  'OTHER',
] as const;

export type ManualTopic = (typeof MANUAL_TOPICS)[number];

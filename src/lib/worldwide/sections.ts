// The front-page topic sections — ONE source of truth for the section set, the generator-topic →
// section map, and the editor-saved section layout (order / visibility / count). F12.
//
// Client-safe: NO database imports. The reader ranking (ranking.ts), the Newsroom placement
// projection, the Studio sections dashboard, the ranking knobs page and the /curate section manager
// all import from here, so a topic label (e.g. TECH, SOCIAL) can never map one way in the reader and
// another way in the CMS.

import { z } from 'zod';

/** Topics that get their own front-page section, in the DEFAULT display order. */
export const SECTION_TOPICS = [
  'POLITICS', 'SPORTS', 'SECURITY', 'ENVIRONMENT', 'HEALTH',
  'BUSINESS', 'FINANCE', 'LEGAL', 'TECHNOLOGY', 'SOCIETY',
] as const;

export type SectionTopic = (typeof SECTION_TOPICS)[number];

// The generator emits ~16 topic labels; map every label onto a section so no story is orphaned.
// `null` = the label has no section of its own (it can still surface in Top Stories / Around the World).
const TOPIC_TO_SECTION: Readonly<Record<string, SectionTopic | null>> = {
  POLITICS: 'POLITICS', GOVERNANCE: 'POLITICS',
  SPORTS: 'SPORTS',
  SECURITY: 'SECURITY',
  ENVIRONMENT: 'ENVIRONMENT', AGRICULTURE: 'ENVIRONMENT',
  HEALTH: 'HEALTH',
  BUSINESS: 'BUSINESS', INFRASTRUCTURE: 'BUSINESS',
  FINANCE: 'FINANCE',
  LEGAL: 'LEGAL',
  TECHNOLOGY: 'TECHNOLOGY', SCIENCE: 'TECHNOLOGY', TECH: 'TECHNOLOGY',
  CULTURE: 'SOCIETY', SOCIETY: 'SOCIETY', SOCIAL: 'SOCIETY',
  INTERNATIONAL: null, OTHER: null,
};

/** The section a generator topic label belongs to (case-insensitive), or null. */
export function sectionOf(topic: string | null | undefined): SectionTopic | null {
  if (!topic) return null;
  return TOPIC_TO_SECTION[topic.toUpperCase()] ?? null;
}

/** A band renders a featured card + a headline list; the reader page shows at most 7 per band. */
export const SECTION_COUNT_MIN = 1;
export const SECTION_COUNT_MAX = 7;

export interface SectionSetting {
  topic: SectionTopic;
  visible: boolean;
  /** Max stories the band renders (featured + list). */
  count: number;
}

/** The saved layout: every section exactly once, in display order. */
export type SectionLayout = ReadonlyArray<SectionSetting>;

export const DEFAULT_SECTION_LAYOUT: SectionLayout = SECTION_TOPICS.map((topic) => ({
  topic,
  visible: true,
  count: SECTION_COUNT_MAX,
}));

const settingSchema = z.object({
  topic: z.enum(SECTION_TOPICS),
  visible: z.boolean(),
  count: z.number().int().min(SECTION_COUNT_MIN).max(SECTION_COUNT_MAX),
});

/** Strict schema for a layout coming from the API: each section at most once. */
export const sectionLayoutSchema = z
  .array(settingSchema)
  .max(SECTION_TOPICS.length)
  .refine((xs) => new Set(xs.map((x) => x.topic)).size === xs.length, 'duplicate section in layout');

/**
 * Normalise any stored value into a complete layout: valid saved entries keep their order, sections
 * missing from the save are appended in default order (so a newly added section is never lost), and
 * anything malformed falls back to the default. Never throws — the reader page must always render.
 */
export function resolveSectionLayout(raw: unknown): SectionLayout {
  const parsed = sectionLayoutSchema.safeParse(raw);
  if (!parsed.success) return DEFAULT_SECTION_LAYOUT;
  const saved = parsed.data;
  const seen = new Set(saved.map((s) => s.topic));
  const missing = DEFAULT_SECTION_LAYOUT.filter((d) => !seen.has(d.topic));
  return [...saved, ...missing];
}

interface HasTopic {
  topic: string;
}

/**
 * Apply a layout to built sections: order them by the layout, drop hidden ones, and stamp each with
 * its render cap (`maxVisible`). Pure — returns new objects; input is never mutated.
 */
export function applySectionLayout<T extends HasTopic>(
  sections: ReadonlyArray<T>,
  layout: SectionLayout,
): Array<T & { maxVisible: number }> {
  const byTopic = new Map(sections.map((s) => [s.topic, s]));
  return layout
    .filter((setting) => setting.visible && byTopic.has(setting.topic))
    .map((setting) => ({ ...(byTopic.get(setting.topic) as T), maxVisible: setting.count }));
}

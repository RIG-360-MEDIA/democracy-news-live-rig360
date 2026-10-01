// F12 — the Sections panel persists order / visibility / band size, the saved layout survives a reload
// (a fresh read of the weights row), and the reader front page is built in that order. Also pins the
// shared topic → section map so the Studio and the reader can't disagree (TECH / SOCIAL).
import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = vi.hoisted(() => {
  const state = { row: null as Record<string, unknown> | null, audits: 0, layoutWrites: 0 };
  const run = (strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join('$').replace(/\s+/g, ' ').trim();
    if (text.startsWith('SELECT to_jsonb(w) AS row FROM rigwire.ranking_weights')) {
      // A reload returns what was committed — as JSON, like the driver would.
      return Promise.resolve(state.row ? [{ row: JSON.parse(JSON.stringify(state.row)) }] : []);
    }
    if (text.startsWith('INSERT INTO rigwire.ranking_weights')) {
      const [topic, country, halflife, source, velocity, by] = values;
      state.row = {
        ...(state.row ?? { section_layout: [] }),
        topic_weights: topic, country_weights: country, recency_halflife_h: halflife,
        source_weight: source, velocity_weight: velocity, updated_by: by, updated_at: new Date().toISOString(),
      };
      return Promise.resolve([]);
    }
    if (text.startsWith('UPDATE rigwire.ranking_weights SET section_layout')) {
      state.layoutWrites += 1;
      state.row = { ...(state.row ?? {}), section_layout: values[0] };
      return Promise.resolve([]);
    }
    if (text.startsWith('INSERT INTO rigwire.editorial_audit')) {
      state.audits += 1;
      return Promise.resolve([]);
    }
    return Promise.reject(new Error(`unexpected: ${text}`));
  };
  const sql = Object.assign(run, {
    json: (v: unknown) => v,
    begin: async (cb: (tx: unknown) => Promise<unknown>) => cb(Object.assign(run, { json: (v: unknown) => v })),
  });
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: store.sql, sqlAnalytics: store.sql }));

import { getWeights, setWeights } from '@/lib/studio/weights';
import { layoutFrontPage } from '@/lib/worldwide/front-page-layout';
import {
  applySectionLayout,
  DEFAULT_SECTION_LAYOUT,
  resolveSectionLayout,
  SECTION_TOPICS,
  sectionOf,
  type SectionLayout,
} from '@/lib/worldwide/sections';

import type { FrontPage, StoryCard, TopicSection } from '@/lib/worldwide/types';

function card(id: string, topic: string, i: number): StoryCard {
  return {
    id, title: `Story ${id}`, deck: null, image: `https://img.example.org/${id}.jpg`, hasArticle: true, topic,
    country: 'XX', importance: 100 - i, independentSources: 1 + (i % 3), articleCount: 2, facts: 1,
    lastSeenAt: new Date(0).toISOString(), freshnessSeconds: 1000 + i, isScoop: false, dominantEntity: null,
  };
}

function built(topics: string[]): TopicSection[] {
  return topics.map((t) => ({ topic: t, stories: Array.from({ length: 20 }, (_, i) => card(`${t}-${i}`, t, i)) }));
}

const SAVED: SectionLayout = [
  { topic: 'TECHNOLOGY', visible: true, count: 3 },
  { topic: 'POLITICS', visible: true, count: 5 },
  { topic: 'SPORTS', visible: false, count: 7 },
];

beforeEach(() => {
  store.state.row = null;
  store.state.audits = 0;
  store.state.layoutWrites = 0;
});

describe('F12 section layout — resolve / apply', () => {
  it('fills a partial save with the missing sections in default order; garbage → default', () => {
    const full = resolveSectionLayout(SAVED);
    expect(full.map((s) => s.topic)).toEqual([
      'TECHNOLOGY', 'POLITICS', 'SPORTS',
      ...SECTION_TOPICS.filter((t) => !['TECHNOLOGY', 'POLITICS', 'SPORTS'].includes(t)),
    ]);
    expect(resolveSectionLayout([{ topic: 'NOPE', visible: true, count: 3 }])).toBe(DEFAULT_SECTION_LAYOUT);
    expect(resolveSectionLayout([{ topic: 'POLITICS', visible: true, count: 99 }])).toBe(DEFAULT_SECTION_LAYOUT);
    expect(resolveSectionLayout(null)).toBe(DEFAULT_SECTION_LAYOUT);
  });

  it('orders, hides and caps built sections without mutating them', () => {
    const input = built(['POLITICS', 'SPORTS', 'TECHNOLOGY']);
    const out = applySectionLayout(input, resolveSectionLayout(SAVED));
    expect(out.map((s) => [s.topic, s.maxVisible])).toEqual([['TECHNOLOGY', 3], ['POLITICS', 5]]);
    expect(input.map((s) => s.topic)).toEqual(['POLITICS', 'SPORTS', 'TECHNOLOGY']);
    expect('maxVisible' in input[0]).toBe(false);
  });
});

describe('F12 saved order survives reload and drives the front page', () => {
  it('setWeights persists the layout; a fresh getWeights returns it; the page renders in that order', async () => {
    await setWeights({ sectionLayout: resolveSectionLayout(SAVED) }, 'admin@example.org');
    expect(store.state.audits).toBe(1); // audited with the write

    const reloaded = await getWeights(); // new read of the row — what the next page build sees
    expect(reloaded.sectionLayout.slice(0, 3)).toEqual(SAVED);

    const fp: FrontPage = {
      scope: 'world',
      topStories: [],
      aroundTheWorld: [],
      democracy: [],
      sections: applySectionLayout(built(['POLITICS', 'SPORTS', 'TECHNOLOGY']), reloaded.sectionLayout),
    };
    const bands = layoutFrontPage(fp).bands.filter((b) => b.key.startsWith('section:'));
    expect(bands.map((b) => b.key)).toEqual(['section:technology', 'section:politics']);
    expect(bands.map((b) => b.stories.length)).toEqual([3, 5]);
  });

  it('a weights row without the section_layout column (pre-migration 009) reads as the default layout', async () => {
    store.state.row = {
      topic_weights: {}, country_weights: {}, recency_halflife_h: 16.64, source_weight: 1,
      velocity_weight: 1, updated_by: 'system', updated_at: new Date(0).toISOString(),
    };
    expect((await getWeights()).sectionLayout).toEqual(DEFAULT_SECTION_LAYOUT);
  });

  it('a knob-only save does not touch section_layout (works before migration 009)', async () => {
    await setWeights({ sourceWeight: 2 }, 'admin@example.org');
    expect(store.state.layoutWrites).toBe(0);
    expect(store.state.row?.source_weight).toBe(2);
    expect(store.state.audits).toBe(1);
  });
});

describe('F12 one topic → section map for reader and Studio', () => {
  it('maps the generator aliases the Studio used to drop', () => {
    expect(sectionOf('TECH')).toBe('TECHNOLOGY');
    expect(sectionOf('SOCIAL')).toBe('SOCIETY');
    expect(sectionOf('science')).toBe('TECHNOLOGY');
    expect(sectionOf('CULTURE')).toBe('SOCIETY');
    expect(sectionOf('INTERNATIONAL')).toBeNull();
    expect(sectionOf(null)).toBeNull();
  });
});

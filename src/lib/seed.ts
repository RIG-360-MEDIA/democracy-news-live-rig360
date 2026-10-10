// src/lib/seed.ts
//
// Local design sandbox: with DNL_SEED=1 the reader reads JSON snapshots from ./seed instead of the
// database, so the frontend runs with no DB, no tunnel and no secrets. Never set in production.
//   seed/front.json        — GET /api/worldwide?scope=world snapshot (the exact getFrontPage() shape)
//   seed/ticker.json       — GET /api/ticker snapshot
//   seed/stories/<id>.json — StoryDetail for the stories that have full text in the snapshot
//   seed/videos.json       — anchor video bulletin (BulletinVideo[])

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { countryName } from '@/lib/worldwide/country';
import type { StoryDetail } from '@/lib/worldwide/detail';
import type { FrontPage, StoryCard } from '@/lib/worldwide/types';

export const SEED_MODE = process.env.DNL_SEED === '1';

const DIR = path.join(process.cwd(), 'seed');
const read = <T,>(file: string): T => JSON.parse(readFileSync(path.join(DIR, file), 'utf8')) as T;

export function seedFrontPage(): FrontPage {
  return read<FrontPage>('front.json');
}

export function seedTicker(): unknown {
  return read('ticker.json');
}

export function seedVideos<T>(): T[] {
  return read<T[]>('videos.json');
}

/** Every story card in the snapshot, hubs flattened. */
function allCards(page: FrontPage): StoryCard[] {
  const cards: StoryCard[] = [];
  for (const u of page.topStories) cards.push(...('kind' in u ? u.members : [u]));
  cards.push(...page.aroundTheWorld, ...page.democracy, ...page.sections.flatMap((s) => s.stories));
  return cards;
}

/** Full seeded story if present; otherwise a short page built from its front-page card, so every link opens. */
export function seedStoryDetail(id: string): StoryDetail | null {
  const file = path.join('stories', `${id}.json`);
  if (existsSync(path.join(DIR, file))) return read<StoryDetail>(file);
  const card = allCards(seedFrontPage()).find((c) => c.id === id);
  if (!card) return null;
  const topic = card.topic === 'OTHER' ? 'News' : card.topic.charAt(0) + card.topic.slice(1).toLowerCase();
  return {
    id,
    kicker: [topic, countryName(card.country)].filter(Boolean).join(' · '),
    title: card.title,
    deck: card.deck,
    image: card.image,
    heroImage: null,
    images: [],
    pullQuote: null,
    stats: { articles: card.articleCount, sources: card.independentSources },
    coverage: [],
    paragraphs: [card.deck ?? '', '(Seed data: the full article text is not in the local snapshot.)'].filter(Boolean),
    tweets: [],
    lenses: [],
    audio: null,
    readTime: '2 min read',
    date: new Date(card.lastSeenAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

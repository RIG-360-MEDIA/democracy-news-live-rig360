// src/lib/worldwide/to-view.ts
//
// Adapter: live StoryCard/EventHub  →  the shape the existing long-read presentational
// components consume (kicker/title/deck/author/readTime/image/timestamp + href). Keeps the
// view components dumb and the live types clean. No DB, no React.

import type { EventHub, StoryCard } from './types';

const PLACEHOLDER_IMAGE = '/cards/placeholder.png'; // DNL-branded fallback, used when a story has no thumbnail

/** A card as the long-read components expect it (mirrors LongReadItem + a resolved href). */
export interface CardView {
  slug: string;
  kicker: string;
  title: string;
  deck: string;
  author: string;
  authorPhoto: string;
  readTime: string;
  image: string;
  timestamp: string;
  href: string | null; // null = no published article yet → render as a non-link (graceful)
  topic: string;           // raw topic for editorial rules (e.g. sports lead cap)
  independentSources: number;
  freshnessSeconds: number; // age of the story for editorial lead rules (e.g. freshness cap)
  pinned: boolean;          // editor-pinned top headline — exempt from the auto lead rules
}

/** A B+ hub as the umbrella component expects it. */
export interface HubView {
  hubId: string;
  kicker: string;
  title: string;
  memberCount: number;
  image: string;
  members: CardView[];
}

/** UI scope key (lowercase 'in') → API scope ('IN'); 'world' stays 'world'. The case-bug fix. */
export function apiScope(uiKey: string): string {
  return uiKey === 'world' ? 'world' : uiKey.toUpperCase();
}

function relativeTime(freshnessSeconds: number): string {
  const h = Math.round(freshnessSeconds / 3600);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

function estReadTime(card: StoryCard): string {
  if (!card.hasArticle) return '';
  const mins = Math.max(2, Math.min(8, Math.round(Math.log2(card.articleCount + 2))));
  return `${mins} min read`;
}

function kickerFor(card: StoryCard): string {
  const topic = card.topic === 'OTHER' ? '' : card.topic.toLowerCase();
  const country = card.country !== 'XX' ? card.country : '';
  return [topic, country].filter(Boolean).join(' · ') || 'news';
}

export function toCardView(card: StoryCard): CardView {
  return {
    slug: card.id,
    kicker: kickerFor(card),
    title: card.title,
    deck: card.deck ?? '',
    author: 'Rig Wire',
    authorPhoto: '',
    readTime: estReadTime(card),
    image: card.image ?? PLACEHOLDER_IMAGE,
    // Displayed age reflects when we PUBLISHED the story on our site (generation run), not the
    // source/cluster activity time. Falls back to freshness for manual stories with no run stamp.
    timestamp: relativeTime(card.publishedSeconds ?? card.freshnessSeconds),
    href: card.hasArticle ? `/long-read/${card.id}` : null,
    topic: card.topic,
    independentSources: card.independentSources,
    freshnessSeconds: card.freshnessSeconds,
    pinned: card.pinned ?? false,
  };
}

export function toHubView(hub: EventHub): HubView {
  return {
    hubId: hub.hubId,
    kicker: 'Full coverage',
    title: hub.title,
    memberCount: hub.memberCount,
    image: hub.image ?? PLACEHOLDER_IMAGE,
    members: hub.members.map(toCardView),
  };
}

/** Discriminate a top-stories unit. */
export function isHub(unit: StoryCard | EventHub): unit is EventHub {
  return 'kind' in unit && unit.kind === 'hub';
}

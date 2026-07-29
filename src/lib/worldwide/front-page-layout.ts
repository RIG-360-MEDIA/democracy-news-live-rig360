// src/lib/worldwide/front-page-layout.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// MIRRORS src/components/long-read/long-read-page.tsx composition (lines ~95–224).
// If that file's band / dedup / cap logic changes, update this in lockstep —
// they must stay identical. This is the single reason the CMS "Live" lane can
// claim to be "exactly what readers see": it runs the SAME claim order the page
// runs, so a story shows here iff it shows there.
// ─────────────────────────────────────────────────────────────────────────────
//
// What the reader page does (and this reproduces):
//   1. pool = topStories flattened to cards (a hub → its LEAD member[0]).
//   2. seen ← every pool card id, then every hub's FULL member list.
//   3. aroundTheWorld = claimAll(aroundTheWorld) — one lead per country.
//   4. rails: railPool = unique-by-id [topStories members/singles] ++ [all section
//      stories]; latest = takeN(sorted by publish/freshness ASC, 8);
//      mostCovered = takeN(sorted by independentSources DESC, 6).
//   5. democracy = takeN(democracy, 8).
//   6. each section IN ORDER: claimed = claimAll(section.stories); featured =
//      first claimed card with a REAL image (else claimed[0]); list = claimed
//      minus featured, capped to 6; VISIBLE = [featured, ...list] (≤7). Anything
//      in claimed past those 7 is CLAIMED-BUT-HIDDEN — eligible, shown nowhere.
//
// The top area is mirrored to the page's REAL display, not raw rank order: the same reshuffle the page
// applies to the top-stories pool (pin → sports-can't-lead → hero-freshness) runs here too, and the
// pool is split into the page's TWO labelled bands — "Top Stories" (the hero grid) and "More Top
// Stories" — so desk order and grouping match what a reader actually sees.
//
// The hero grid renders pool[0..5] contiguously and "More Top Stories" renders pool[6..13], so every
// top story is shown at a real slot — no rank is skipped.
//
// Pure: no I/O, no mutation of inputs. Local accumulator arrays/sets never escape.

import type { EventHub, FrontPage, StoryCard } from './types';

/** A single story as it is laid out on the page, flattened for the desk. */
export interface LaidOutStory {
  id: string;
  headline: string;
  dek: string | null;
  image: string | null;
  /** True when this slot came from a B+ event hub (represented by its lead member). */
  isHub: boolean;
  /** Angle count — only set when isHub. */
  hubMemberCount?: number;
}

/** One band of the page, with its VISIBLE stories and the count it hides behind a cap. */
export interface LaidOutBand {
  key: string;
  label: string;
  stories: LaidOutStory[];
  /** Stories this band CLAIMED (so no later band can show them) but does not itself display — the
   *  per-topic 7-cap remainder. 0 for bands that display everything they claim. */
  hiddenEligible: number;
}

/** The whole front page, laid out band-by-band in page order. */
export interface FrontPageLayout {
  bands: LaidOutBand[];
}

const TOP_STORIES_KEY = 'top-stories';
const MORE_TOP_STORIES_KEY = 'more-top-stories';
const AROUND_KEY = 'around-the-world';
const DEMOCRACY_KEY = 'democracy';
const LATEST_KEY = 'latest';
const MOST_COVERED_KEY = 'most-covered';

// Page caps — kept identical to long-read-page.tsx.
const LATEST_RAIL = 8;
const MOST_COVERED_RAIL = 6;
const DEMOCRACY_MAX = 8;
const SECTION_LIST_MAX = 6; // featured + 6 = 7 visible per topic band

function isHub(unit: StoryCard | EventHub): unit is EventHub {
  return 'kind' in unit && unit.kind === 'hub';
}

function titleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

/** A story has a REAL photo when it is set and not a branded fallback (page's `hasRealImage`). */
function hasRealImage(card: StoryCard): boolean {
  return !!card.image && !card.image.includes('/cards/fallback');
}

function storyToLaidOut(card: StoryCard): LaidOutStory {
  return { id: card.id, headline: card.title, dek: card.deck, image: card.image, isHub: false };
}

/** A representative top-stories card kept alongside its hub badge, before the pool is laid out. */
interface RepCard {
  card: StoryCard;
  isHub: boolean;
  hubMemberCount?: number;
}

/**
 * Flatten top-stories into representative cards (page's `cardPool`): a hub collapses to its LEAD
 * member, a plain card is itself; de-duplicated by id, order preserved. The underlying StoryCard is
 * retained so the display reshuffle can read its topic / freshness / pinned flags.
 */
function flattenTopStories(units: ReadonlyArray<StoryCard | EventHub>): RepCard[] {
  const out: RepCard[] = [];
  const seen = new Set<string>();
  for (const unit of units) {
    const card = isHub(unit) ? unit.members[0] : unit;
    if (!card || seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(isHub(unit) ? { card, isHub: true, hubMemberCount: unit.memberCount } : { card, isHub: false });
  }
  return out;
}

/**
 * Reorder the pool for display exactly as long-read-page.tsx does: editor pins lead (exempt from the
 * auto rules), then sports can't lead, then fresh (<8h) hero cards rise above stale ones. Pure — the
 * input array and its cards are never mutated.
 */
function reorderForDisplay(entries: ReadonlyArray<RepCard>): RepCard[] {
  const pinnedLead = entries.filter((e) => e.card.pinned);
  let auto = entries.filter((e) => !e.card.pinned);

  // Rule 1: Sports can never lead — a single match's sources inflate its score.
  if (auto.length > 1 && auto[0].card.topic.toLowerCase() === 'sports') {
    const idx = auto.findIndex((e) => e.card.topic.toLowerCase() !== 'sports');
    if (idx > 0) auto = [auto[idx], ...auto.slice(0, idx), ...auto.slice(idx + 1)];
  }

  // Rule 2: Hero-grid freshness — fresh stories rise above stale within the hero window; order kept.
  const FRESH_S = 8 * 3600;
  const HERO_SLOTS = 12;
  const heroHead = auto.slice(0, HERO_SLOTS);
  const fresh = heroHead.filter((e) => e.card.freshnessSeconds <= FRESH_S);
  const stale = heroHead.filter((e) => e.card.freshnessSeconds > FRESH_S);
  auto = [...fresh, ...stale, ...auto.slice(HERO_SLOTS)];

  return [...pinnedLead, ...auto];
}

/** Map a representative card to a laid-out story, keeping the hub badge + angle count. */
function repToLaidOut(entry: RepCard): LaidOutStory {
  return {
    id: entry.card.id,
    headline: entry.card.title,
    dek: entry.card.deck,
    image: entry.card.image,
    isHub: entry.isHub,
    ...(entry.isHub ? { hubMemberCount: entry.hubMemberCount } : {}),
  };
}

/** Every story id already spoken for above the rails: the pool leads + every hub member. */
function seedSeen(fp: FrontPage, pool: ReadonlyArray<LaidOutStory>): Set<string> {
  const seen = new Set<string>();
  for (const card of pool.slice(0, 15)) seen.add(card.id); // page: pool.slice(0,15)
  for (const unit of fp.topStories) {
    if (isHub(unit)) for (const member of unit.members) seen.add(member.id);
  }
  return seen;
}

/** Iterate, skip seen, else claim + push, up to n (page's `takeN`). Mutates `seen` (local to the run). */
function takeN(cards: ReadonlyArray<StoryCard>, n: number, seen: Set<string>): StoryCard[] {
  const out: StoryCard[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
    if (out.length >= n) break;
  }
  return out;
}

/** Iterate, skip seen, else claim + push all (page's `claimAll`). Mutates `seen` (local to the run). */
function claimAll(cards: ReadonlyArray<StoryCard>, seen: Set<string>): StoryCard[] {
  const out: StoryCard[] = [];
  for (const card of cards) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    out.push(card);
  }
  return out;
}

/** railPool: unique-by-id [topStories members/singles] ++ [all section stories] (page lines ~120–125). */
function buildRailPool(fp: FrontPage): StoryCard[] {
  const railUniq = new Set<string>();
  const railPool: StoryCard[] = [];
  const candidates: StoryCard[] = [
    ...fp.topStories.flatMap((u) => (isHub(u) ? u.members : [u])),
    ...fp.sections.flatMap((s) => s.stories),
  ];
  for (const card of candidates) {
    if (railUniq.has(card.id)) continue;
    railUniq.add(card.id);
    railPool.push(card);
  }
  return railPool;
}

/**
 * Lay out a front page exactly as long-read-page.tsx composes it, returning the VISIBLE stories per
 * band plus the count each topic band hides behind the 7-per-band cap. Bands come back in page order;
 * empty bands are dropped.
 */
export function layoutFrontPage(fp: FrontPage): FrontPageLayout {
  const pool = reorderForDisplay(flattenTopStories(fp.topStories)).map(repToLaidOut);
  const seen = seedSeen(fp, pool);

  // 3. Around the World claims before the rails so the map stays full.
  const aroundTheWorld = claimAll(fp.aroundTheWorld, seen);

  // 4. Rails skim the remaining pool — freshest / most-covered not already featured above.
  const railPool = buildRailPool(fp);
  const latest = takeN(
    [...railPool].sort(
      (a, b) => (a.publishedSeconds ?? a.freshnessSeconds) - (b.publishedSeconds ?? b.freshnessSeconds),
    ),
    LATEST_RAIL,
    seen,
  );
  const mostCovered = takeN(
    [...railPool].sort((a, b) => b.independentSources - a.independentSources),
    MOST_COVERED_RAIL,
    seen,
  );

  // 5. Democracy band, then 6. topic sections — each takes only stories not shown above.
  const democracy = takeN(fp.democracy, DEMOCRACY_MAX, seen);

  const bands: LaidOutBand[] = [];

  // The page's top area is FOUR labelled elements: the "Top Stories" hero grid, the "More Top Stories"
  // band, the LIVE ticker (right column) and the "Most covered" sidebar. Each is a SEPARATE band here so
  // every CMS count maps to a real page section.
  //
  // Hero grid renders pool[0..5]; "More Top Stories" renders pool[6..13]. Contiguous — no slot skipped.
  const heroStories = pool.slice(0, 6);
  if (heroStories.length > 0) {
    bands.push({ key: TOP_STORIES_KEY, label: 'Top Stories', stories: heroStories, hiddenEligible: 0 });
  }
  const moreTopStories = pool.slice(6, 14);
  if (moreTopStories.length > 0) {
    bands.push({ key: MORE_TOP_STORIES_KEY, label: 'More Top Stories', stories: moreTopStories, hiddenEligible: 0 });
  }
  const latestStories = latest.map(storyToLaidOut);
  if (latestStories.length > 0) {
    bands.push({ key: LATEST_KEY, label: 'Live Ticker', stories: latestStories, hiddenEligible: 0 });
  }
  const mostCoveredStories = mostCovered.map(storyToLaidOut);
  if (mostCoveredStories.length > 0) {
    bands.push({ key: MOST_COVERED_KEY, label: 'Most Covered', stories: mostCoveredStories, hiddenEligible: 0 });
  }

  // Around the World — one lead per country; the page renders every claimed card, so nothing hidden.
  if (aroundTheWorld.length > 0) {
    bands.push({
      key: AROUND_KEY,
      label: 'Around the World',
      stories: aroundTheWorld.map(storyToLaidOut),
      hiddenEligible: 0,
    });
  }

  // Democracy — takeN(8) claims only what it returns and renders all of it; nothing hidden.
  if (democracy.length > 0) {
    bands.push({
      key: DEMOCRACY_KEY,
      label: 'Democracy',
      stories: democracy.map(storyToLaidOut),
      hiddenEligible: 0,
    });
  }

  // Topic sections in page order. claimAll claims the WHOLE section, but only ≤7 are visible; the rest
  // are claimed-but-hidden (eligible, shown nowhere) — that count is what the desk surfaces.
  for (const section of fp.sections) {
    const claimed = claimAll(section.stories, seen);
    if (claimed.length === 0) continue;
    const leadIdx = Math.max(0, claimed.findIndex(hasRealImage));
    const featured = claimed[leadIdx];
    const list = claimed.filter((_, idx) => idx !== leadIdx).slice(0, SECTION_LIST_MAX);
    const visible = [featured, ...list];
    bands.push({
      key: `section:${section.topic.toLowerCase()}`,
      label: titleCase(section.topic),
      stories: visible.map(storyToLaidOut),
      hiddenEligible: claimed.length - visible.length,
    });
  }

  return { bands };
}

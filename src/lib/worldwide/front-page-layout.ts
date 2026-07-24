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
// The one place this INTENTIONALLY diverges from the page: the page reshuffles
// the top-stories order (pin → sports-can't-lead → hero-freshness) purely for
// display. That reordering never changes band MEMBERSHIP or the dedup set (all of
// pool ≤ 12 is claimed regardless of order), so it is omitted here — the Live lane
// mirrors WHICH stories land where and their counts, not the cosmetic hero order.
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
const AROUND_KEY = 'around-the-world';
const DEMOCRACY_KEY = 'democracy';

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

/** A hub renders as its LEAD member card, but the desk keeps the hub badge + angle count. */
function hubToLaidOut(hub: EventHub): LaidOutStory | null {
  const lead = hub.members[0];
  if (!lead) return null;
  return {
    id: lead.id,
    headline: lead.title,
    dek: lead.deck,
    image: lead.image,
    isHub: true,
    hubMemberCount: hub.memberCount,
  };
}

/**
 * Flatten top-stories into the display pool (page's `cardPool`): a hub collapses to ONE lead card,
 * a plain card is itself; de-duplicated by id, order preserved.
 */
function buildPool(units: ReadonlyArray<StoryCard | EventHub>): LaidOutStory[] {
  const out: LaidOutStory[] = [];
  const poolSeen = new Set<string>();
  for (const unit of units) {
    const card = isHub(unit) ? hubToLaidOut(unit) : storyToLaidOut(unit);
    if (!card || poolSeen.has(card.id)) continue;
    poolSeen.add(card.id);
    out.push(card);
  }
  return out;
}

/** Every story id already spoken for above the rails: the pool leads + every hub member. */
function seedSeen(fp: FrontPage, pool: ReadonlyArray<LaidOutStory>): Set<string> {
  const seen = new Set<string>();
  for (const card of pool) seen.add(card.id); // page: pool.slice(0,15); pool ≤ 12, so all
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

/** De-dup a laid-out list by id, keeping first occurrence and order. */
function uniqueById(stories: ReadonlyArray<LaidOutStory>): LaidOutStory[] {
  const seen = new Set<string>();
  const out: LaidOutStory[] = [];
  for (const s of stories) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    out.push(s);
  }
  return out;
}

/**
 * Lay out a front page exactly as long-read-page.tsx composes it, returning the VISIBLE stories per
 * band plus the count each topic band hides behind the 7-per-band cap. Bands come back in page order;
 * empty bands are dropped.
 */
export function layoutFrontPage(fp: FrontPage): FrontPageLayout {
  const pool = buildPool(fp.topStories);
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

  // Top Stories band = everything rendered in the top area of the page: the hero/grid pool, the LIVE
  // rail (latest) and the "Most covered" sidebar (mostCovered), unique, in claim order.
  const topStories = uniqueById([
    ...pool,
    ...latest.map(storyToLaidOut),
    ...mostCovered.map(storyToLaidOut),
  ]);
  if (topStories.length > 0) {
    bands.push({ key: TOP_STORIES_KEY, label: 'Top Stories', stories: topStories, hiddenEligible: 0 });
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

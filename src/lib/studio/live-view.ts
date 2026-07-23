// Editorial CMS — the LIVE lane's source of truth.
//
// The desk used to build "live" from getDeskFeed (48h window, recency-ordered, 120 rows). That is a
// different population from the site: the reader front page comes from getFrontPage (7-day window,
// importance-ordered, 600-row pool, then dedup / substance / diversity / hub / top-12 caps). The two
// disagreed badly — desk-"live" stories that no reader could see, and hundreds of on-site stories the
// desk never showed. This module projects the REAL front page into desk rows so the Live lane is,
// by construction, what readers are looking at.
//
// Pure: no I/O, no mutation. Groups come back in the site's own top-to-bottom order.

import type { EventHub, FrontPage, StoryCard } from '@/lib/worldwide/types';

/** One live row = one card as it actually appears on the site. */
export interface LiveRow {
  storyId: string;
  headline: string;
  dek: string | null;
  image: string | null;
  /** 1-based position WITHIN its group, i.e. the slot the reader sees. */
  position: number;
  /** True when the site rendered this slot as a B+ event hub rather than a single card. */
  isHub: boolean;
  /** Angle-stories under the hub — only set when isHub. */
  hubMemberCount?: number;
}

/** A band of the front page (hero block, Around the World, Democracy, or one topic section). */
export interface LiveGroup {
  key: string;
  label: string;
  items: LiveRow[];
}

const TOP_STORIES_KEY = 'top-stories';
const AROUND_KEY = 'around-the-world';
const DEMOCRACY_KEY = 'democracy';

function titleCase(token: string): string {
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

function isHub(unit: StoryCard | EventHub): unit is EventHub {
  return 'kind' in unit && unit.kind === 'hub';
}

// A hub occupies one slot on the site but has no story id of its own. We represent it by its LEAD
// member — the same convention /curate uses (curate-workspace.tsx) — so Edit/Hold act on a real
// story. hubId is only a last-resort key for a (shouldn't happen) memberless hub.
function toRow(unit: StoryCard | EventHub, position: number): LiveRow {
  if (isHub(unit)) {
    const lead = unit.members[0] ?? null;
    return {
      storyId: lead?.id ?? unit.hubId,
      headline: lead?.title ?? unit.title,
      dek: lead?.deck ?? null,
      image: unit.image ?? lead?.image ?? null,
      position,
      isHub: true,
      hubMemberCount: unit.memberCount,
    };
  }
  return {
    storyId: unit.id,
    headline: unit.title,
    dek: unit.deck,
    image: unit.image,
    position,
    isHub: false,
  };
}

/**
 * Project a front page into ordered desk groups.
 *
 * A story that somehow surfaces in two bands (e.g. also picked up by Around the World) is kept only
 * in the first — highest-priority — group, so the lane's total is a true count of on-site stories.
 * Positions are assigned after that de-duplication, so they stay contiguous within each group.
 */
export function buildLiveView(fp: FrontPage): LiveGroup[] {
  const bands: Array<{ key: string; label: string; units: Array<StoryCard | EventHub> }> = [
    { key: TOP_STORIES_KEY, label: 'Top Stories', units: fp.topStories },
    { key: AROUND_KEY, label: 'Around the World', units: fp.aroundTheWorld },
    { key: DEMOCRACY_KEY, label: 'Democracy', units: fp.democracy },
    ...fp.sections.map((s) => ({
      key: `section:${s.topic.toLowerCase()}`,
      label: titleCase(s.topic),
      units: s.stories,
    })),
  ];

  const seen = new Set<string>();
  const groups: LiveGroup[] = [];

  for (const band of bands) {
    const items: LiveRow[] = [];
    for (const unit of band.units) {
      const row = toRow(unit, items.length + 1);
      if (seen.has(row.storyId)) continue;
      seen.add(row.storyId);
      items.push(row);
    }
    if (items.length > 0) groups.push({ key: band.key, label: band.label, items });
  }

  return groups;
}

/** Total stories actually on the site — the Live tab's count. */
export function countLiveRows(groups: readonly LiveGroup[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0);
}

/** Every story id on the front page — used to fetch provenance for the rows we can match. */
export function liveStoryIds(groups: readonly LiveGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((r) => r.storyId));
}

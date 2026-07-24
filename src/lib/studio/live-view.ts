// Editorial CMS — the LIVE lane's source of truth.
//
// The desk used to build "live" from getDeskFeed (48h window, recency-ordered, 120 rows). That is a
// different population from the site: the reader front page comes from getFrontPage (7-day window,
// importance-ordered, 600-row pool, then dedup / substance / diversity / hub / top-12 caps). The two
// disagreed badly — desk-"live" stories that no reader could see, and hundreds of on-site stories the
// desk never showed. This module projects the REAL front page into desk rows so the Live lane is,
// by construction, what readers are looking at.
//
// It no longer re-derives placement itself: it delegates to layoutFrontPage (the one mirror of the
// reader page's band/dedup/cap composition) and adapts its bands into the LiveGroup/LiveRow contract
// the newsroom client already consumes. So the lane reflects the page's global de-dup, the rail skim,
// and the hard 7-per-topic cap — with the capped remainder reported as `hiddenEligible`.
//
// Pure: no I/O, no mutation. Groups come back in the site's own top-to-bottom order.

import { layoutFrontPage } from '@/lib/worldwide/front-page-layout';
import type { LaidOutBand } from '@/lib/worldwide/front-page-layout';
import type { FrontPage } from '@/lib/worldwide/types';

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
  /** Stories this band claimed off the page but does not display — the per-topic 7-cap remainder.
   *  0 for bands that show everything they claim (top stories, around the world, democracy). */
  hiddenEligible: number;
}

function bandToGroup(band: LaidOutBand): LiveGroup {
  const items: LiveRow[] = band.stories.map((story, index) => ({
    storyId: story.id,
    headline: story.headline,
    dek: story.dek,
    image: story.image,
    position: index + 1,
    isHub: story.isHub,
    ...(story.hubMemberCount != null ? { hubMemberCount: story.hubMemberCount } : {}),
  }));
  return { key: band.key, label: band.label, items, hiddenEligible: band.hiddenEligible };
}

/**
 * Project a front page into ordered desk groups — the reader page's layout, adapted to desk rows.
 * Bands are already de-duplicated and capped by layoutFrontPage, so every row here is a story that is
 * genuinely on the site at that slot.
 */
export function buildLiveView(fp: FrontPage): LiveGroup[] {
  return layoutFrontPage(fp).bands.map(bandToGroup);
}

/** Total stories actually on the site — the Live tab's count (VISIBLE rows only). */
export function countLiveRows(groups: readonly LiveGroup[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0);
}

/** Every VISIBLE story id on the front page — used to fetch provenance for the rows we can match. */
export function liveStoryIds(groups: readonly LiveGroup[]): string[] {
  return groups.flatMap((g) => g.items.map((r) => r.storyId));
}

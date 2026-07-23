// RigWire Studio — Newsroom: the desk as three lanes (Next up / Live / Held). Replaces the old
// Review desk (desk-client.tsx). Server component: gate on requireEditor, load the desk feed + wire
// queue, project front-page placement, and join live/held provenance, then hand plain objects to the
// client. Epic 002.
//
// LIVE is driven by the REAL front page (see lib/studio/live-view.ts), not by the desk feed — the two
// populations disagreed, so the lane could not be trusted. NEXT UP and HELD still come from the desk
// feed + wire queue.
import { unstable_cache } from 'next/cache';
import { redirect } from 'next/navigation';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { getDeskFeed } from '@/lib/studio/feed';
import { liveMeta } from '@/lib/studio/live-meta';
import type { LiveMeta } from '@/lib/studio/live-meta';
import { buildLiveView, liveStoryIds } from '@/lib/studio/live-view';
import { projectPlacements } from '@/lib/studio/placement';
import type { Placement } from '@/lib/studio/placement';
import { getQueue } from '@/lib/studio/queue';
import { requireEditor } from '@/lib/studio/session';
import { getFrontPage } from '@/lib/worldwide/ranking';

import { NewsroomClient } from './newsroom-client';

export const dynamic = 'force-dynamic';

// The CACHED reader front page — identical key/TTL/tags to /long-read (src/lib/cache.ts), so the desk
// shares the reader's Data Cache entry instead of adding a second Neon query. What the editor sees in
// LIVE is therefore literally what readers are being served. Editor writes bust it via revalidateTag.
const getCachedFrontPage = unstable_cache(
  (scope: string) => getFrontPage(scope),
  ['reader-front-page'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.frontPage] },
);

export default async function Newsroom() {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  const [feed, queue, frontPage] = await Promise.all([
    getDeskFeed(120),
    getQueue(50),
    getCachedFrontPage('world'),
  ]);

  const liveGroups = buildLiveView(frontPage);

  // Next-up = wire clusters not already on the site, so a promoted story never shows in two lanes at
  // once. On-site membership now comes from the front page itself (the desk feed's own 'live'/'top'
  // states are a 48h approximation of it). A publishable machine story still inside the 15-min
  // hold-and-release buffer isn't on the page yet, so it stays in Next Up with its live countdown.
  const onSiteIds = new Set(liveStoryIds(liveGroups));
  const nextUp = queue.filter((q) => !onSiteIds.has(q.storyId));

  // Placement projection is only needed for the Next-up lane now — Live rows carry their real
  // on-site group + position from the front page.
  const placementMap = await projectPlacements(nextUp.map((q) => q.storyId));
  // Provenance for every story an editor has touched: the held/killed rows from the desk feed plus
  // the on-site rows. Rows with no override/audit entry simply resolve to nothing and degrade.
  const metaMap = await liveMeta([...new Set([...feed.map((s) => s.storyId), ...onSiteIds])]);

  const placements: Record<string, Placement | null> = {};
  for (const [id, p] of placementMap) placements[id] = p;
  const meta: Record<string, LiveMeta> = {};
  for (const [id, m] of metaMap) meta[id] = m;

  return (
    <NewsroomClient
      stories={feed}
      queue={nextUp}
      liveGroups={liveGroups}
      placements={placements}
      meta={meta}
    />
  );
}

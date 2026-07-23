// RigWire Studio — Newsroom: the desk as three lanes (Next up / Live / Held). Replaces the old
// Review desk (desk-client.tsx). Server component: gate on requireEditor, load the desk feed + wire
// queue, project front-page placement, and join live/held provenance, then hand plain objects to the
// client. Epic 002.
import { redirect } from 'next/navigation';

import { getDeskFeed } from '@/lib/studio/feed';
import { liveMeta } from '@/lib/studio/live-meta';
import type { LiveMeta } from '@/lib/studio/live-meta';
import { projectPlacements } from '@/lib/studio/placement';
import type { Placement } from '@/lib/studio/placement';
import { getQueue } from '@/lib/studio/queue';
import { requireEditor } from '@/lib/studio/session';

import { NewsroomClient } from './newsroom-client';

export const dynamic = 'force-dynamic';

export default async function Newsroom() {
  const guard = await requireEditor();
  if (!guard.ok) redirect(guard.status === 401 ? '/signin' : '/');

  const [feed, queue] = await Promise.all([getDeskFeed(120), getQueue(50)]);

  // Live/top desk stories are on the site; held/hidden/scheduled are not (yet). Next-up = wire
  // clusters not already live, so a promoted story never shows in two lanes at once. A publishable
  // machine story still inside the 15-min hold-and-release buffer is state 'scheduled' (not 'live'),
  // so it stays in Next Up — where its queue row renders a live countdown until it auto-releases.
  const liveIds = new Set(feed.filter((s) => s.state === 'live' || s.state === 'top').map((s) => s.storyId));
  const nextUp = queue.filter((q) => !liveIds.has(q.storyId));

  // One placement pass covers both lanes that display a projected/current slot.
  const placementMap = await projectPlacements([...nextUp.map((q) => q.storyId), ...liveIds]);
  // Provenance for every story an editor has touched (live + held/killed).
  const metaMap = await liveMeta(feed.map((s) => s.storyId));

  const placements: Record<string, Placement | null> = {};
  for (const [id, p] of placementMap) placements[id] = p;
  const meta: Record<string, LiveMeta> = {};
  for (const [id, m] of metaMap) meta[id] = m;

  return (
    <NewsroomClient stories={feed} queue={nextUp} placements={placements} meta={meta} />
  );
}

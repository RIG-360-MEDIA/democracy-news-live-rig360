// src/lib/worldwide/eventhub.ts
//
// B+ event-hubs: read-time grouping. A mega-event's angle-stories (post-split) share a
// dominant entity (iran/israel) — gather them under one "full coverage" umbrella so the
// front page shows ONE hub, not 15 near-duplicate cards. Display-only; never mutates
// clustering. Keyed by (dominant entity + topic) to avoid a generic hub (e.g. "donald
// trump") pulling unrelated topics into one blob.

import type { EventHub, StoryCard } from './types';

const MIN_HUB_MEMBERS = 3;   // need >=3 angle-stories to be worth an umbrella
const MAX_HUB_MEMBERS = 8;   // cap what the hub card previews

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Collapse same-event angle-stories into hubs. Returns a mixed list of standalone
 * StoryCards and EventHubs, each carrying an `importance` for downstream ranking.
 */
export function groupIntoHubs(cards: StoryCard[]): Array<StoryCard | EventHub> {
  const groups = new Map<string, StoryCard[]>();
  for (const c of cards) {
    if (!c.dominantEntity) continue;
    const key = `${c.dominantEntity}|${c.topic}`;
    const arr = groups.get(key);
    if (arr) arr.push(c);
    else groups.set(key, [c]);
  }

  const inHub = new Set<string>();
  const hubs: EventHub[] = [];
  for (const [key, members] of groups) {
    if (members.length < MIN_HUB_MEMBERS) continue;
    // Display order: articled (clickable) members first, then FRESHEST — so the umbrella shows the
    // LATEST chapter of a developing saga (e.g. "tankers transit Hormuz", 3h) instead of its biggest
    // but oldest angle ("deal signed", 36h). Articled-first preserves the zero-sources read decision.
    const sorted = [...members].sort(
      (a, b) => Number(b.hasArticle) - Number(a.hasArticle) || a.freshnessSeconds - b.freshnessSeconds,
    );
    const [entity] = key.split('|');
    hubs.push({
      kind: 'hub',
      hubId: `hub-${key.replace(/[^a-z0-9]+/gi, '-')}`,
      title: `${titleCase(entity)} — full coverage`,
      dominantEntity: entity,
      topic: sorted[0].topic,
      image: sorted.find((m) => m.image)?.image ?? null,
      // hub ranks by its STRONGEST angle (not the freshest one shown first), so surfacing the latest
      // chapter doesn't sink the whole hub down the page.
      importance: Math.max(...members.map((m) => m.importance)),
      memberCount: members.length,
      members: sorted.slice(0, MAX_HUB_MEMBERS),
    });
    for (const m of members) inHub.add(m.id);
  }

  const standalone = cards.filter((c) => !inHub.has(c.id));
  return [...hubs, ...standalone];
}

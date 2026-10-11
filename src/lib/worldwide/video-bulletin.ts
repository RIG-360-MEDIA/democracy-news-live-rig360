// src/lib/worldwide/video-bulletin.ts
//
// Anchor Studio video bulletin: the day's ~5 AI-anchor news videos, one per hard-news story.
// Shown as the carousel at the very top of the front page (pinned there for the day, outside the
// ranking) and as the video on each story's own page.
//
// Source: rigwire.story_video (migrations/010_story_video.sql), written by the Anchor Studio pipeline
// right after a video passes QC; it then POSTs /api/revalidate {"tags":["frontpage","story"]}.
// Only status='live' rows show ('test' rows are for supervised checks on production, 'pulled' hides
// one video), and never for a story an editor killed or held. Reads are cached under the reader tags,
// so the force-dynamic front page does not hit Neon per request.

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { sqlAnalytics } from '@/lib/db';
import { SEED_MODE, seedVideos } from '@/lib/seed';

export interface BulletinVideo {
  storyId: string;
  title: string; // the story headline shown under the playing video
  kicker: string; // "Topic · Country"
  anchorName: string;
  url: string; // MP4 (any https host or same-origin)
  poster: string;
  durationS: number | null;
  publishedAt: string; // ISO
}

type Row = {
  story_id: string;
  title: string;
  kicker: string | null;
  anchor_name: string;
  video_url: string;
  poster_url: string;
  duration_s: number | null;
  published_at: string | Date;
};

const toVideo = (r: Row): BulletinVideo => ({
  storyId: r.story_id,
  title: r.title,
  kicker: r.kicker ?? '',
  anchorName: r.anchor_name,
  url: r.video_url,
  poster: r.poster_url,
  durationS: r.duration_s,
  publishedAt: new Date(r.published_at).toISOString(),
});

// The newest bulletin day: live videos published within 36 h of the latest one, newest first.
const readBulletin = unstable_cache(
  async (): Promise<BulletinVideo[]> => {
    const rows = (await sqlAnalytics`
      SELECT v.story_id::text AS story_id, v.title, v.kicker, v.anchor_name, v.video_url, v.poster_url, v.duration_s, v.published_at
      FROM rigwire.story_video v
      LEFT JOIN rigwire.editorial_overrides o ON o.story_id = v.story_id
      WHERE v.status = 'live'
        AND coalesce(o.action, 'live') NOT IN ('killed', 'held')
        AND v.published_at >= (SELECT max(published_at) FROM rigwire.story_video WHERE status = 'live') - interval '36 hours'
      ORDER BY v.published_at DESC
      LIMIT 8
    `) as unknown as Row[];
    return rows.map(toVideo);
  },
  ['reader-video-bulletin'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.frontPage] },
);

// A story page keeps its video for as long as the story is public (no 36 h window).
const readStoryVideo = unstable_cache(
  async (storyId: string): Promise<BulletinVideo | null> => {
    const rows = (await sqlAnalytics`
      SELECT v.story_id::text AS story_id, v.title, v.kicker, v.anchor_name, v.video_url, v.poster_url, v.duration_s, v.published_at
      FROM rigwire.story_video v
      LEFT JOIN rigwire.editorial_overrides o ON o.story_id = v.story_id
      WHERE v.story_id = ${storyId}::uuid AND v.status = 'live' AND coalesce(o.action, 'live') NOT IN ('killed', 'held')
      LIMIT 1
    `) as unknown as Row[];
    return rows[0] ? toVideo(rows[0]) : null;
  },
  ['reader-story-video'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.storyDetail] },
);

/** Videos for the top-of-page carousel, newest bulletin first. [] when there are none (the carousel is then not rendered). */
export async function getVideoBulletin(): Promise<BulletinVideo[]> {
  if (SEED_MODE) return seedVideos<BulletinVideo>();
  return readBulletin();
}

/** The video for one story page, if that story has one. */
export async function getStoryVideo(storyId: string): Promise<BulletinVideo | null> {
  if (SEED_MODE) return seedVideos<BulletinVideo>().find((v) => v.storyId === storyId) ?? null;
  return readStoryVideo(storyId);
}

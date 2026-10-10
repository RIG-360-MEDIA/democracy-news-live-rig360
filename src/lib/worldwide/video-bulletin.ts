// src/lib/worldwide/video-bulletin.ts
//
// Anchor Studio video bulletin: the day's ~5 AI-anchor news videos, one per hard-news story.
// Shown as the carousel at the very top of the front page (pinned there for the day, outside the
// ranking) and as the video on each story's own page.
//
// Production source (to build): a Neon-native table written by the Anchor Studio pipeline, e.g.
//   rigwire.story_video(story_id uuid pk, video_url text, poster_url text, duration_s int,
//                       anchor_name text, title text, kicker text, published_at timestamptz, status text)
// read here with sqlAnalytics/sql and cached under the front-page / story-detail tags.
// Until that table exists, production returns no videos and the carousel is not rendered.

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

/** Videos for the top-of-page carousel, newest bulletin first (≤ 36 h old in production). */
export async function getVideoBulletin(): Promise<BulletinVideo[]> {
  if (SEED_MODE) return seedVideos<BulletinVideo>();
  return [];
}

/** The video for one story page, if that story has one. */
export async function getStoryVideo(storyId: string): Promise<BulletinVideo | null> {
  return (await getVideoBulletin()).find((v) => v.storyId === storyId) ?? null;
}

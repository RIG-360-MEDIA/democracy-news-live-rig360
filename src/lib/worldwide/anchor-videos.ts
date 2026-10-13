// src/lib/worldwide/anchor-videos.ts
//
// Anchor Studio's daily AI-anchor news videos, as they appear in the front page's Watch band and on each story's page.
// The pipeline uploads each video to the Democracy News Live YouTube channel and adds it to the "Video Bulletin"
// playlist; its description carries the story link (".../long-read/<story id>") and the kicker on its first line.
// Here the site reads that playlist: the YouTube Data API with YOUTUBE_API_KEY (reliable, 1 quota unit per read), or the
// playlist's public RSS feed when no key is set (free, but YouTube's feed server returns 404 for hours at a time).
// Cached 10 minutes under the front-page tag; any failure means "no videos" (the band hides, story pages show the photo).

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache';
import { SEED_MODE, seedVideos } from '@/lib/seed';
import type { Video } from '@/components/long-read/videos-data';

const PLAYLIST = process.env.YT_BULLETIN_PLAYLIST_ID ?? '';
const KEY = process.env.YOUTUBE_API_KEY ?? '';
const STORY_RE = /long-read\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** One playlist entry -> Video. The kicker is the description's first line when it is short ("Breaking news · Panama"). */
export function toAnchorVideo(id: string, title: string, description: string, publishedAt: string, first: boolean): Video {
  const line = description.split('\n')[0].trim();
  return {
    youtubeId: id,
    title,
    kicker: line && line.length <= 60 && !/https?:\/\//.test(line) ? line : 'Video Bulletin',
    kind: first ? 'feature' : 'programme',
    publishedAt,
    storyId: description.match(STORY_RE)?.[1]?.toLowerCase(),
  };
}

async function fromApi(): Promise<Video[]> {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails,status&maxResults=50&playlistId=${encodeURIComponent(PLAYLIST)}&key=${encodeURIComponent(KEY)}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`YouTube API ${res.status}`);
  const items = ((await res.json()).items ?? []) as Array<{
    snippet: { title: string; description: string };
    contentDetails: { videoId: string; videoPublishedAt?: string };
    status?: { privacyStatus?: string };
  }>;
  return items
    .filter((it) => it.contentDetails.videoPublishedAt && ['public', 'unlisted'].includes(it.status?.privacyStatus ?? 'public'))
    .sort((a, b) => Date.parse(b.contentDetails.videoPublishedAt!) - Date.parse(a.contentDetails.videoPublishedAt!))
    .map((it, i) => toAnchorVideo(it.contentDetails.videoId, it.snippet.title, it.snippet.description ?? '', it.contentDetails.videoPublishedAt!, i === 0));
}

async function fromRss(): Promise<Video[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(PLAYLIST)}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
  const xml = await res.text();
  const tag = (s: string, t: string) => (s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? '';
  const unescape = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => m[1])
    .sort((a, b) => Date.parse(tag(b, 'published')) - Date.parse(tag(a, 'published')))
    .map((e, i) => toAnchorVideo(tag(e, 'yt:videoId'), unescape(tag(e, 'title')), unescape(tag(e, 'media:description')), tag(e, 'published'), i === 0));
}

const readPlaylist = unstable_cache(
  async (): Promise<Video[]> => (KEY ? fromApi() : fromRss()),
  ['reader-anchor-videos'],
  { revalidate: 600, tags: [CACHE_TAGS.frontPage] },
);

/** The bulletin playlist, newest first ([] when not configured or unreachable). */
export async function getAnchorVideos(): Promise<Video[]> {
  if (SEED_MODE) return seedVideos<Video>();
  if (!PLAYLIST) return [];
  return readPlaylist();
}

/** The video for one story page, if the playlist has one for it. */
export async function getStoryVideo(storyId: string): Promise<Video | null> {
  return (await getAnchorVideos()).find((v) => v.storyId === storyId.toLowerCase()) ?? null;
}

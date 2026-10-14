// src/lib/worldwide/anchor-videos.ts
//
// Anchor Studio's daily AI-anchor news videos, as they appear in the front page's Watch band and on each story's page.
// Only videos an editor APPROVED in the CMS (/studio/videos) are here: approval makes the video public and moves it into
// the YouTube "Video Bulletin" playlist (YT_BULLETIN_PLAYLIST_ID), which this module reads through the CMS's YouTube
// connection (src/lib/youtube/client.ts). Without that connection it falls back to the playlist's public RSS feed (free,
// but YouTube's feed server returns 404 for hours at a time). Each description carries the kicker on its first line and
// the story link. Cached for the reader TTL under its own tag (Approve/Edit revalidate it). A YouTube failure falls back to
// RSS, then to the last list this server saw, else "no videos": it is caught INSIDE the cache, so a failing YouTube is
// asked again only after the TTL (never on every page view) and never errors or hangs a page (client timeouts).

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { BULLETIN_PLAYLIST, kickerOf, listPlaylist, storyIdOf, youtubeConfigured } from '@/lib/youtube/client';
import type { Video } from '@/components/long-read/videos-data';

/** One playlist entry -> Video (the newest is the band's feature tile). */
export function toAnchorVideo(id: string, title: string, description: string, publishedAt: string, first: boolean): Video {
  return { youtubeId: id, title, kicker: kickerOf(description), kind: first ? 'feature' : 'programme', publishedAt, storyId: storyIdOf(description) };
}

async function fromOAuth(): Promise<Video[]> {
  return (await listPlaylist(BULLETIN_PLAYLIST()))
    .filter((v) => v.privacy === 'public')
    .map((v, i) => toAnchorVideo(v.videoId, v.title, v.description, v.addedAt, i === 0));
}

async function fromRss(): Promise<Video[]> {
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(BULLETIN_PLAYLIST())}`,
    { cache: 'no-store', signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`YouTube RSS ${res.status}`);
  const xml = await res.text();
  const tag = (s: string, t: string) => (s.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) ?? [])[1] ?? '';
  const unescape = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map((m) => m[1])
    .sort((a, b) => Date.parse(tag(b, 'published')) - Date.parse(tag(a, 'published')))
    .map((e, i) => toAnchorVideo(tag(e, 'yt:videoId'), unescape(tag(e, 'title')), unescape(tag(e, 'media:description')), tag(e, 'published'), i === 0));
}

let lastGood: Video[] = [];

async function load(): Promise<Video[]> {
  for (const read of youtubeConfigured() ? [fromOAuth, fromRss] : [fromRss]) {
    try {
      return (lastGood = await read());
    } catch (e) {
      console.error('[anchor-videos] read failed', { via: read.name, error: e instanceof Error ? e.message : e });
    }
  }
  return lastGood;
}

const readPlaylist = unstable_cache(load, ['reader-anchor-videos'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.anchorVideos] });

/** The approved videos, newest first ([] when not configured or unreachable). */
export async function getAnchorVideos(): Promise<Video[]> {
  if (!BULLETIN_PLAYLIST()) return [];
  return readPlaylist();
}

/** The video for one story page, if one was approved for it. */
export async function getStoryVideo(storyId: string): Promise<Video | null> {
  return (await getAnchorVideos()).find((v) => v.storyId === storyId.toLowerCase()) ?? null;
}

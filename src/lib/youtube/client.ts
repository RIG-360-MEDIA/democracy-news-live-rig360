// src/lib/youtube/client.ts
//
// The CMS's YouTube connection for the Anchor Studio video review (/studio/videos). Server-only: it holds the channel's
// OAuth refresh token. Flow:
//   the render box uploads each finished video UNLISTED into the "Awaiting approval" playlist (YT_PENDING_PLAYLIST_ID);
//   an editor Approves  -> the video becomes public and moves to "Video Bulletin" (YT_BULLETIN_PLAYLIST_ID) = on the site;
//                Rejects -> the video is deleted from YouTube.
// All state lives on YouTube (no table). Each call is a few small JSON requests: no video bytes pass through Vercel.
// Env: YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN, YT_PENDING_PLAYLIST_ID, YT_BULLETIN_PLAYLIST_ID.

const API = 'https://www.googleapis.com/youtube/v3';
const STORY_RE = /long-read\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
// videos.update deletes any status property it is not sent, so approve re-sends these (read first), changing only privacy.
const STATUS_KEYS = ['embeddable', 'license', 'publicStatsViewable', 'selfDeclaredMadeForKids', 'containsSyntheticMedia'] as const;

export const PENDING_PLAYLIST = () => process.env.YT_PENDING_PLAYLIST_ID ?? '';
export const BULLETIN_PLAYLIST = () => process.env.YT_BULLETIN_PLAYLIST_ID ?? '';

export function youtubeConfigured(): boolean {
  return Boolean(process.env.YT_CLIENT_ID && process.env.YT_CLIENT_SECRET && process.env.YT_REFRESH_TOKEN);
}

/** The DNL story a video presents (from the "Read the full story: …/long-read/<id>" line of its description). */
export function storyIdOf(description: string): string | undefined {
  return description.match(STORY_RE)?.[1]?.toLowerCase();
}

/** The kicker: the description's first line when it is short and not a link ("Breaking news · Panama"). */
export function kickerOf(description: string): string {
  const line = description.split('\n')[0].trim();
  return line && line.length <= 60 && !/https?:\/\//.test(line) ? line : 'Video Bulletin';
}

let cached: { token: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  if (cached && cached.until > Date.now() + 60_000) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.YT_CLIENT_ID ?? '',
      client_secret: process.env.YT_CLIENT_SECRET ?? '',
      refresh_token: process.env.YT_REFRESH_TOKEN ?? '',
      grant_type: 'refresh_token',
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`YouTube sign-in failed (${res.status})`);
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: j.access_token, until: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

async function yt<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const why = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`YouTube ${init.method ?? 'GET'} ${path.split('?')[0]} failed (${res.status}): ${why?.error?.message ?? ''}`.trim());
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export interface PlaylistVideo {
  videoId: string;
  playlistItemId: string;
  title: string;
  description: string;
  /** When it joined the playlist (= when the box uploaded it, for "Awaiting approval"). */
  addedAt: string;
  privacy: string;
  storyId?: string;
  kicker: string;
}

/** The videos in a playlist, newest first (<= 50). */
export async function listPlaylist(playlistId: string): Promise<PlaylistVideo[]> {
  if (!playlistId) return [];
  type Item = {
    id: string;
    snippet: { title: string; description: string; publishedAt: string };
    contentDetails: { videoId: string };
    status?: { privacyStatus?: string };
  };
  const j = await yt<{ items?: Item[] }>(
    `playlistItems?part=snippet,contentDetails,status&maxResults=50&playlistId=${encodeURIComponent(playlistId)}`,
  );
  return (j.items ?? [])
    // A deleted (or made-private) video leaves a placeholder item behind: "Deleted video" with no usable status.
    .filter((it) => ['public', 'unlisted'].includes(it.status?.privacyStatus ?? ''))
    .map((it) => ({
      videoId: it.contentDetails.videoId,
      playlistItemId: it.id,
      title: it.snippet.title,
      description: it.snippet.description ?? '',
      addedAt: it.snippet.publishedAt,
      privacy: it.status?.privacyStatus ?? 'unknown',
      storyId: storyIdOf(it.snippet.description ?? ''),
      kicker: kickerOf(it.snippet.description ?? ''),
    }))
    .sort((a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt));
}

/** Approve: public + into "Video Bulletin" + out of "Awaiting approval". Returns what the audit row records. */
export async function approveVideo(videoId: string): Promise<{ title: string; storyId?: string }> {
  type V = { id: string; snippet: { title: string; description: string }; status: Record<string, unknown> };
  const v = (await yt<{ items?: V[] }>(`videos?part=snippet,status&id=${encodeURIComponent(videoId)}`)).items?.[0];
  if (!v) throw new Error('Video not found on YouTube');
  const status: Record<string, unknown> = { privacyStatus: 'public', containsSyntheticMedia: true };
  for (const k of STATUS_KEYS) if (k !== 'containsSyntheticMedia' && v.status[k] !== undefined) status[k] = v.status[k];
  await yt('videos?part=status', { method: 'PUT', body: { id: videoId, status } });
  const inBulletin = (await listPlaylist(BULLETIN_PLAYLIST())).some((p) => p.videoId === videoId);
  if (!inBulletin) {
    await yt('playlistItems?part=snippet', {
      method: 'POST',
      body: { snippet: { playlistId: BULLETIN_PLAYLIST(), resourceId: { kind: 'youtube#video', videoId } } },
    });
  }
  for (const p of await listPlaylist(PENDING_PLAYLIST())) {
    if (p.videoId === videoId) await yt(`playlistItems?id=${encodeURIComponent(p.playlistItemId)}`, { method: 'DELETE' });
  }
  return { title: v.snippet.title, storyId: storyIdOf(v.snippet.description ?? '') };
}

/** Reject: delete the video from YouTube (it leaves every playlist with it). */
export async function rejectVideo(videoId: string): Promise<{ title: string; storyId?: string }> {
  type V = { snippet: { title: string; description: string } };
  const v = (await yt<{ items?: V[] }>(`videos?part=snippet&id=${encodeURIComponent(videoId)}`)).items?.[0];
  if (!v) throw new Error('Video not found on YouTube');
  for (const p of await listPlaylist(PENDING_PLAYLIST())) {       // out of the queue first: YouTube leaves a "Deleted video"
    if (p.videoId === videoId) await yt(`playlistItems?id=${encodeURIComponent(p.playlistItemId)}`, { method: 'DELETE' });
  }
  await yt(`videos?id=${encodeURIComponent(videoId)}`, { method: 'DELETE' });
  return { title: v.snippet.title, storyId: storyIdOf(v.snippet.description ?? '') };
}

/** Edit a video's title/description on YouTube. videos.update replaces the whole snippet, so the current one is read
 *  first and re-sent with only title/description changed (categoryId is required; tags/languages would be wiped). */
export async function editVideo(videoId: string, title: string, description: string):
    Promise<{ before: { title: string; description: string }; storyId?: string }> {
  type S = { title: string; description: string; categoryId: string; tags?: string[]; defaultLanguage?: string; defaultAudioLanguage?: string };
  const v = (await yt<{ items?: Array<{ snippet: S }> }>(`videos?part=snippet&id=${encodeURIComponent(videoId)}`)).items?.[0];
  if (!v) throw new Error('Video not found on YouTube');
  const s = v.snippet;
  const snippet: S = { title, description, categoryId: s.categoryId };
  if (s.tags) snippet.tags = s.tags;
  if (s.defaultLanguage) snippet.defaultLanguage = s.defaultLanguage;
  if (s.defaultAudioLanguage) snippet.defaultAudioLanguage = s.defaultAudioLanguage;
  await yt('videos?part=snippet', { method: 'PUT', body: { id: videoId, snippet } });
  return { before: { title: s.title, description: s.description ?? '' }, storyId: storyIdOf(description) ?? storyIdOf(s.description ?? '') };
}

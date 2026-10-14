// Editorial CMS — Anchor Studio video review. Finished videos wait here (unlisted on YouTube, "Awaiting approval" playlist)
// until an editor approves (public + "Video Bulletin" = on the site) or rejects (deleted). See src/lib/youtube/client.ts.
import { guardPage } from '@/lib/studio/guard';
import { BULLETIN_PLAYLIST, listPlaylist, PENDING_PLAYLIST, youtubeConfigured, type PlaylistVideo } from '@/lib/youtube/client';

import { VideosClient } from './videos-client';

export const dynamic = 'force-dynamic';

export default async function Videos() {
  await guardPage('editor');
  let pending: PlaylistVideo[] = [];
  let published: PlaylistVideo[] = [];
  let error: string | null = null;
  if (!youtubeConfigured()) {
    error = 'YouTube is not connected yet (YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN / YT_PENDING_PLAYLIST_ID / YT_BULLETIN_PLAYLIST_ID).';
  } else {
    try {
      [pending, published] = await Promise.all([listPlaylist(PENDING_PLAYLIST()), listPlaylist(BULLETIN_PLAYLIST())]);
      pending.reverse();                                            // oldest first: the one closest to expiring on top
    } catch (e) {
      error = e instanceof Error ? e.message : 'YouTube is unreachable';
    }
  }
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>Videos</h1>
        <span style={{ fontSize: 12, color: '#666' }}>
          <b style={{ color: '#8a6d1a', fontSize: 15 }}>{pending.length}</b> awaiting approval ·{' '}
          <b style={{ color: '#2e7d32', fontSize: 15 }}>{published.length}</b> published
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16 }}>
        Anchor Studio&apos;s daily news videos. They wait here hidden (unlisted on YouTube) — <b>Approve</b> puts one on
        YouTube publicly and on the site&apos;s Watch section and story page; <b>Reject</b> deletes it. Unreviewed videos
        expire after 36 hours.
      </p>
      {error ? <p style={{ color: '#a8141a', fontSize: 13 }}>{error}</p> : <VideosClient pending={pending} published={published.slice(0, 12)} />}
    </div>
  );
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

// The CMS's YouTube calls for the video review: approve must re-send every status field (videos.update deletes omitted
// ones), keep the AI-disclosure flag, join the Bulletin BEFORE going public and be safe to retry; reject must only ever
// delete a video that is awaiting approval; playlist reads must page past 50 entries.
const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];
let privacy = 'unlisted';
let inPending = true;
let inBulletin = false;

function reply(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
}

function entry(n: number, videoId = `vid${n}`) {
  return { id: `ITEM${n}`, snippet: { title: `T${n}`, description: '', publishedAt: new Date(Date.UTC(2026, 9, 1) + n * 60_000).toISOString() },
           contentDetails: { videoId }, status: { privacyStatus: 'public' } };
}

beforeEach(() => {
  calls.length = 0;
  privacy = 'unlisted';
  inPending = true;
  inBulletin = false;
  vi.resetModules();
  Object.assign(process.env, { YT_CLIENT_ID: 'id', YT_CLIENT_SECRET: 's', YT_REFRESH_TOKEN: 'r', YT_PENDING_PLAYLIST_ID: 'PEND', YT_BULLETIN_PLAYLIST_ID: 'BULL' });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url, body: typeof init.body === 'string' && url.includes('youtube') ? JSON.parse(init.body) : undefined });
    if (url.includes('oauth2')) return reply({ access_token: 't', expires_in: 3600 });
    if (url.includes('/videos?part=snippet,status')) {
      return reply({ items: [{ id: 'HEjnkLvrodg', snippet: { title: 'T', description: 'Breaking news · Panama\n\nRead the full story: https://x/long-read/475794d0-1004-417f-8f52-0e26ebc7effb',
        categoryId: '25', tags: ['news'], defaultLanguage: 'en', defaultAudioLanguage: 'en' },
        status: { privacyStatus: privacy, uploadStatus: 'processed', embeddable: true, license: 'youtube', publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }] });
    }
    if (url.includes('/videos?part=snippet&id=')) {
      return reply({ items: [{ snippet: { title: 'Old', description: 'old', categoryId: '25', tags: ['news'], defaultLanguage: 'en', defaultAudioLanguage: 'en' } }] });
    }
    if (url.includes('playlistItems?part=id') && url.includes('PEND')) return reply({ items: inPending ? [{ id: 'ITEM1' }] : [] });
    if (url.includes('playlistItems?part=id') && url.includes('BULL')) return reply({ items: inBulletin ? [{ id: 'B1' }] : [] });
    if (url.includes('playlistItems?part=snippet,contentDetails,status') && url.includes('LONG')) {
      // 120 entries in playlist order (oldest first, as YouTube appends), 50 per page; vid0 appears twice
      const all = [...Array.from({ length: 120 }, (_, n) => entry(n)), entry(200, 'vid0')];
      const page = Number(new URL(url).searchParams.get('pageToken') ?? 0);
      return reply({ items: all.slice(page, page + 50), nextPageToken: page + 50 < all.length ? String(page + 50) : undefined });
    }
    if (url.includes('playlistItems?part=snippet,contentDetails,status')) return reply({ items: [] });
    return reply({}, method === 'DELETE' ? 204 : 200);
  }));
});

describe('youtube client (CMS video review)', () => {
  it('approve: Bulletin first, then public (every status field re-sent, AI flag kept), then out of Awaiting approval', async () => {
    const { approveVideo } = await import('@/lib/youtube/client');
    const r = await approveVideo('HEjnkLvrodg');
    expect(r.storyId).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    const add = calls.findIndex((c) => c.method === 'POST' && c.url.includes('playlistItems'));
    const update = calls.findIndex((c) => c.method === 'PUT' && c.url.includes('/videos?part=status'));
    const remove = calls.findIndex((c) => c.method === 'DELETE' && c.url.includes('playlistItems?id=ITEM1'));
    expect(add).toBeGreaterThan(-1);
    expect(add).toBeLessThan(update);                                // never public before it is in the Bulletin
    expect(update).toBeLessThan(remove);
    expect(calls[add].body).toEqual({ snippet: { playlistId: 'BULL', resourceId: { kind: 'youtube#video', videoId: 'HEjnkLvrodg' } } });
    expect(calls[update].body).toEqual({ id: 'HEjnkLvrodg', status: { privacyStatus: 'public', containsSyntheticMedia: true, embeddable: true,
      license: 'youtube', publicStatsViewable: true, selfDeclaredMadeForKids: false } });
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('/videos?id='))).toBe(false);   // approve never deletes
  });

  it('approve retried after a partial success only does what is left (no duplicate Bulletin entry)', async () => {
    inBulletin = true;
    privacy = 'public';
    const { approveVideo } = await import('@/lib/youtube/client');
    await approveVideo('HEjnkLvrodg');
    expect(calls.some((c) => c.method === 'POST' && c.url.includes('playlistItems'))).toBe(false);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('playlistItems?id=ITEM1'))).toBe(true);
  });

  it('approve refuses a video that is neither awaiting approval nor in the Bulletin', async () => {
    inPending = false;
    const { approveVideo } = await import('@/lib/youtube/client');
    await expect(approveVideo('HEjnkLvrodg')).rejects.toThrow(/not awaiting approval/);
    expect(calls.some((c) => c.method !== 'GET' && c.method !== 'POST')).toBe(false);
    expect(calls.some((c) => c.url.includes('playlistItems?part=snippet') && c.method === 'POST')).toBe(false);
  });

  it('reject: deletes a video that is awaiting approval (queue first, then the video)', async () => {
    const { rejectVideo } = await import('@/lib/youtube/client');
    await rejectVideo('HEjnkLvrodg');
    const item = calls.findIndex((c) => c.method === 'DELETE' && c.url.includes('playlistItems?id=ITEM1'));
    const video = calls.findIndex((c) => c.method === 'DELETE' && c.url.endsWith('/videos?id=HEjnkLvrodg'));
    expect(item).toBeGreaterThan(-1);
    expect(item).toBeLessThan(video);
  });

  it('reject NEVER deletes a video that is not awaiting approval (a published bulletin, any channel video)', async () => {
    inPending = false;
    const { rejectVideo } = await import('@/lib/youtube/client');
    await expect(rejectVideo('HEjnkLvrodg')).rejects.toThrow(/not awaiting approval/);
    expect(calls.some((c) => c.method === 'DELETE')).toBe(false);
  });

  it('edit: re-sends category, tags and languages with the new title/description (update replaces the snippet)', async () => {
    const { editVideo } = await import('@/lib/youtube/client');
    const r = await editVideo('HEjnkLvrodg', 'New', 'Breaking news · Panama\nRead the full story: https://a/long-read/475794d0-1004-417f-8f52-0e26ebc7effb');
    const put = calls.find((c) => c.method === 'PUT' && c.url.includes('/videos?part=snippet'));
    expect(put?.body).toEqual({ id: 'HEjnkLvrodg', snippet: { title: 'New', description: expect.stringContaining('long-read/'),
      categoryId: '25', tags: ['news'], defaultLanguage: 'en', defaultAudioLanguage: 'en' } });
    expect(r.storyId).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    expect(r.published).toBe(false);
  });

  it('listPlaylist pages past 50 entries, newest first, one entry per video', async () => {
    const { listPlaylist } = await import('@/lib/youtube/client');
    const v = await listPlaylist('LONG');
    expect(v).toHaveLength(120);                                     // 121 entries, vid0 twice
    expect(v[0].videoId).toBe('vid0');                               // its newest entry (n=200) wins
    expect(v[1].videoId).toBe('vid119');                             // the newest appended entry is not lost on page 3
    expect(calls.filter((c) => c.url.includes('LONG')).length).toBe(3);
  });

  it('is not "configured" without both playlists (Approve would half-work)', async () => {
    const { youtubeConfigured } = await import('@/lib/youtube/client');
    expect(youtubeConfigured()).toBe(true);
    delete process.env.YT_BULLETIN_PLAYLIST_ID;
    expect(youtubeConfigured()).toBe(false);
  });

  it('parses the story id (the "Read the full story" link wins over other links) and the kicker', async () => {
    const { storyIdOf, kickerOf } = await import('@/lib/youtube/client');
    expect(storyIdOf('x\nRead the full story: https://a/long-read/475794D0-1004-417F-8F52-0E26EBC7EFFB')).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    expect(storyIdOf('Related: https://a/long-read/11111111-1111-4111-8111-111111111111\nRead the full story: https://a/long-read/475794d0-1004-417f-8f52-0e26ebc7effb'))
      .toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    expect(storyIdOf('no link')).toBeUndefined();
    expect(kickerOf('Breaking news · Panama\n\nmore')).toBe('Breaking news · Panama');
    expect(kickerOf('https://example.org\nmore')).toBe('Video Bulletin');
  });
});

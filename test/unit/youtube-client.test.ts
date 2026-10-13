import { beforeEach, describe, expect, it, vi } from 'vitest';

// The CMS's YouTube calls for the video review: approve must re-send every status field (videos.update deletes omitted
// ones), keep the AI-disclosure flag, move the video between playlists; reject must delete it.
const calls: Array<{ method: string; url: string; body?: Record<string, unknown> }> = [];

function reply(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), { status });
}

beforeEach(() => {
  calls.length = 0;
  vi.resetModules();
  Object.assign(process.env, { YT_CLIENT_ID: 'id', YT_CLIENT_SECRET: 's', YT_REFRESH_TOKEN: 'r', YT_PENDING_PLAYLIST_ID: 'PEND', YT_BULLETIN_PLAYLIST_ID: 'BULL' });
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ method, url, body: typeof init.body === 'string' && url.includes('youtube') ? JSON.parse(init.body) : undefined });
    if (url.includes('oauth2')) return reply({ access_token: 't', expires_in: 3600 });
    if (url.includes('/videos?part=snippet,status')) {
      return reply({ items: [{ id: 'HEjnkLvrodg', snippet: { title: 'T', description: 'Breaking news · Panama\n\nRead the full story: https://x/long-read/475794d0-1004-417f-8f52-0e26ebc7effb' },
        status: { privacyStatus: 'unlisted', uploadStatus: 'processed', embeddable: true, license: 'youtube', publicStatsViewable: true, selfDeclaredMadeForKids: false, containsSyntheticMedia: true } }] });
    }
    if (url.includes('/videos?part=snippet&id=')) {
      return reply({ items: [{ snippet: { title: 'Old', description: 'old', categoryId: '25', tags: ['news'], defaultLanguage: 'en', defaultAudioLanguage: 'en' } }] });
    }
    if (url.includes('playlistItems?part=snippet,contentDetails,status') && url.includes('PEND')) {
      return reply({ items: [{ id: 'ITEM1', snippet: { title: 'T', description: '', publishedAt: '2026-10-13T10:00:00Z' }, contentDetails: { videoId: 'HEjnkLvrodg' }, status: { privacyStatus: 'unlisted' } }] });
    }
    if (url.includes('playlistItems?part=snippet,contentDetails,status')) return reply({ items: [] });
    return reply({}, method === 'DELETE' ? 204 : 200);
  }));
});

describe('youtube client (CMS video review)', () => {
  it('approve: public, every status field re-sent, AI flag kept, added to Bulletin, removed from Awaiting approval', async () => {
    const { approveVideo } = await import('@/lib/youtube/client');
    const r = await approveVideo('HEjnkLvrodg');
    expect(r.storyId).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    const update = calls.find((c) => c.method === 'PUT' && c.url.includes('/videos?part=status'));
    expect(update?.body).toEqual({ id: 'HEjnkLvrodg', status: { privacyStatus: 'public', containsSyntheticMedia: true, embeddable: true,
      license: 'youtube', publicStatsViewable: true, selfDeclaredMadeForKids: false } });
    const add = calls.find((c) => c.method === 'POST' && c.url.includes('playlistItems'));
    expect(add?.body).toEqual({ snippet: { playlistId: 'BULL', resourceId: { kind: 'youtube#video', videoId: 'HEjnkLvrodg' } } });
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('playlistItems?id=ITEM1'))).toBe(true);
    expect(calls.some((c) => c.method === 'DELETE' && c.url.includes('/videos?id='))).toBe(false);   // approve never deletes
  });

  it('reject: deletes the video', async () => {
    const { rejectVideo } = await import('@/lib/youtube/client');
    await rejectVideo('HEjnkLvrodg');
    expect(calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/videos?id=HEjnkLvrodg'))).toBe(true);
  });

  it('edit: re-sends category, tags and languages with the new title/description (update replaces the snippet)', async () => {
    const { editVideo } = await import('@/lib/youtube/client');
    const r = await editVideo('HEjnkLvrodg', 'New', 'Breaking news · Panama\nRead the full story: https://a/long-read/475794d0-1004-417f-8f52-0e26ebc7effb');
    const put = calls.find((c) => c.method === 'PUT' && c.url.includes('/videos?part=snippet'));
    expect(put?.body).toEqual({ id: 'HEjnkLvrodg', snippet: { title: 'New', description: expect.stringContaining('long-read/'),
      categoryId: '25', tags: ['news'], defaultLanguage: 'en', defaultAudioLanguage: 'en' } });
    expect(r.before).toEqual({ title: 'Old', description: 'old' });
    expect(r.storyId).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
  });

  it('parses the story id and kicker from a description', async () => {
    const { storyIdOf, kickerOf } = await import('@/lib/youtube/client');
    expect(storyIdOf('x\nRead the full story: https://a/long-read/475794D0-1004-417F-8F52-0E26EBC7EFFB')).toBe('475794d0-1004-417f-8f52-0e26ebc7effb');
    expect(kickerOf('Breaking news · Panama\n\nmore')).toBe('Breaking news · Panama');
    expect(kickerOf('https://example.org\nmore')).toBe('Video Bulletin');
  });
});

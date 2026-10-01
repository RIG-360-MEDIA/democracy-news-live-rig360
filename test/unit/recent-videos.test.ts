import { describe, expect, it } from 'vitest';

import { recentVideos, WATCH_MAX_AGE_DAYS } from '@/lib/worldwide/recent-videos';
import { videos } from '@/components/long-read/videos-data';

const NOW = Date.parse('2026-10-01T12:00:00Z');
const DAY = 86_400_000;
const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('recentVideos (Watch rail recency gate)', () => {
  it('uses a 30-day window', () => {
    expect(WATCH_MAX_AGE_DAYS).toBe(30);
  });

  it('keeps clips inside the window and drops older ones, preserving order', () => {
    const list = [
      { id: 'a', publishedAt: at(2 * DAY) },
      { id: 'old', publishedAt: at(31 * DAY) },
      { id: 'b', publishedAt: at(29 * DAY) },
      { id: 'ancient', publishedAt: '2021-06-30T00:00:00Z' },
    ];
    expect(recentVideos(list, NOW).map((v) => v.id)).toEqual(['a', 'b']);
  });

  it('treats exactly 30 days as recent and 30 days + 1 ms as stale', () => {
    const list = [
      { id: 'edge', publishedAt: at(30 * DAY) },
      { id: 'past-edge', publishedAt: at(30 * DAY + 1) },
    ];
    expect(recentVideos(list, NOW).map((v) => v.id)).toEqual(['edge']);
  });

  it('drops unparseable, empty and future dates instead of rendering them', () => {
    const list = [
      { id: 'junk', publishedAt: 'not a date' },
      { id: 'empty', publishedAt: '' },
      { id: 'future', publishedAt: at(-DAY) },
    ];
    expect(recentVideos(list, NOW)).toEqual([]);
  });

  it('returns an empty list (rail hidden) when nothing is recent, without mutating the input', () => {
    const list = Object.freeze([{ id: 'x', publishedAt: at(90 * DAY) }]);
    expect(recentVideos(list, NOW)).toEqual([]);
    expect(list).toHaveLength(1);
  });

  it('honours a custom window', () => {
    const list = [{ id: 'a', publishedAt: at(5 * DAY) }];
    expect(recentVideos(list, NOW, 3)).toEqual([]);
    expect(recentVideos(list, NOW, 7)).toHaveLength(1);
  });

  it('every configured channel clip carries a parseable publish date', () => {
    for (const v of videos) expect(Number.isFinite(Date.parse(v.publishedAt))).toBe(true);
  });
});

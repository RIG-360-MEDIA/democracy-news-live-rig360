import { beforeEach, describe, expect, it, vi } from 'vitest';

// The story page is ISR now (E8). These tests pin the route config and prove the killed-story → 404
// path still holds: getStoryDetail returns null for a killed story, and the page must notFound().
const getStoryDetail = vi.fn();
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/worldwide/detail', () => ({
  getStoryDetail: (slug: string) => getStoryDetail(slug),
  UUID_RE: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}));
vi.mock('@/components/long-read/story-read', () => ({ StoryRead: () => null }));

const SLUG = '3f2b8c1e-0a4d-4e7b-9c61-2d5e8f9a1b3c';
const params = Promise.resolve({ slug: SLUG });

async function loadPage() {
  return import('@/app/long-read/[slug]/page');
}

describe('/long-read/[slug] caching (E8)', () => {
  beforeEach(() => { getStoryDetail.mockReset(); });

  it('is ISR with the reader TTL, rendered on demand (nothing prerendered at build)', async () => {
    const page = await loadPage();
    const { READER_CACHE_TTL } = await import('@/lib/cache');
    expect(page.revalidate).toBe(1800);
    expect(page.revalidate).toBe(READER_CACHE_TTL);
    expect(page.dynamicParams).toBe(true);
    expect(page.generateStaticParams()).toEqual([]);
    expect((page as Record<string, unknown>).dynamic).toBeUndefined();
  });

  it('a killed / missing story still 404s', async () => {
    getStoryDetail.mockResolvedValue(null);
    const { default: ArticlePage } = await loadPage();
    await expect(ArticlePage({ params })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
  });

  it('a live story renders', async () => {
    getStoryDetail.mockResolvedValue({ title: 'Headline', deck: 'Deck', image: null });
    const { default: ArticlePage } = await loadPage();
    await expect(ArticlePage({ params })).resolves.toBeTruthy();
  });

  it('a junk slug 404s without touching the cache or DB (no cached entry per bot URL)', async () => {
    const { default: ArticlePage, generateMetadata } = await loadPage();
    const junk = Promise.resolve({ slug: 'wp-login.php' });
    await expect(ArticlePage({ params: junk })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
    await expect(generateMetadata({ params: junk })).resolves.toEqual({ title: 'Democracy News Live' });
    expect(getStoryDetail).not.toHaveBeenCalled();
  });
});

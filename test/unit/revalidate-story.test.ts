import { describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (t: string) => revalidateTag(t), revalidatePath: (p: string) => revalidatePath(p) }));

describe('revalidateStoryPage', () => {
  it('drops both the story data tag and the story page path', async () => {
    const { revalidateStoryPage } = await import('@/lib/revalidate-story');
    const { CACHE_TAGS } = await import('@/lib/cache');
    revalidateStoryPage('3f2b8c1e-0a4d-4e7b-9c61-2d5e8f9a1b3c');
    expect(revalidateTag).toHaveBeenCalledWith(CACHE_TAGS.storyDetail);
    expect(revalidatePath).toHaveBeenCalledWith('/long-read/3f2b8c1e-0a4d-4e7b-9c61-2d5e8f9a1b3c');
  });
});

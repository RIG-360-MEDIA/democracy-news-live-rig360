import { revalidatePath, revalidateTag } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache';

// Purge one story's reader page right now. revalidateTag alone is stale-while-revalidate for ISR
// pages (the first request after a kill would still get the old HTML); revalidatePath drops the
// cached page itself, so a killed / edited / newly published story is correct on the very next view.
export function revalidateStoryPage(storyId: string): void {
  revalidateTag(CACHE_TAGS.storyDetail);
  revalidatePath(`/long-read/${storyId}`);
}

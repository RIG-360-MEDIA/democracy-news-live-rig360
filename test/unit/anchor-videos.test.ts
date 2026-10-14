import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
import { toAnchorVideo } from '@/lib/worldwide/anchor-videos';

const STORY = '475794d0-1004-417f-8f52-0e26ebc7effb';
const DESC = `Breaking news · Panama\n\nA 7.7 quake damaged hundreds of buildings.\n\nRead the full story: https://global.democracynewslive.com/long-read/${STORY.toUpperCase()}\n\nPresented by an AI-generated anchor.`;

describe('toAnchorVideo (YouTube playlist entry -> Watch video)', () => {
  it('takes the kicker from the first line and the story id from the link', () => {
    const v = toAnchorVideo('abc123', 'Quake shakes Panama', DESC, '2026-10-12T13:00:00Z', true);
    expect(v).toMatchObject({ youtubeId: 'abc123', kicker: 'Breaking news · Panama', kind: 'feature', storyId: STORY });
  });
  it('falls back to a generic kicker and no story when the description has neither', () => {
    const v = toAnchorVideo('x', 't', `https://global.democracynewslive.com/about\nmore`, '2026-10-12T13:00:00Z', false);
    expect(v.kicker).toBe('Video Bulletin');
    expect(v.kind).toBe('programme');
    expect(v.storyId).toBeUndefined();
  });
});

import { describe, expect, it } from 'vitest';

import { mergeEditorialOverride } from '@/lib/worldwide/override-merge';

const gen = { headline: 'Machine headline', deck: 'Machine deck', body: 'Machine body text.' };

describe('mergeEditorialOverride', () => {
  it('passes generated text through when there is no override', () => {
    expect(mergeEditorialOverride(gen, null)).toEqual({ hidden: false, ...gen, edited: [] });
    expect(mergeEditorialOverride(gen, undefined).hidden).toBe(false);
  });

  it('applies edited headline, deck and body (trimmed) and reports which fields changed', () => {
    const m = mergeEditorialOverride(gen, {
      action: 'live', editedHeadline: '  Editor headline ', editedDek: 'Editor deck', editedBody: 'Editor body.',
    });
    expect(m).toMatchObject({ hidden: false, headline: 'Editor headline', deck: 'Editor deck', body: 'Editor body.' });
    expect(m.edited).toEqual(['headline', 'deck', 'body']);
  });

  it('ignores blank edits (an emptied field must not blank the story)', () => {
    const m = mergeEditorialOverride(gen, { action: 'held', editedHeadline: '   ', editedDek: '', editedBody: null });
    expect(m).toMatchObject({ headline: gen.headline, deck: gen.deck, body: gen.body, edited: [] });
  });

  it('hides killed stories even if they carry edits', () => {
    expect(mergeEditorialOverride(gen, { action: 'killed', editedHeadline: 'x' }).hidden).toBe(true);
  });

  it('does not hide held / live / pinned stories', () => {
    for (const action of ['held', 'live', 'pinned', null]) {
      expect(mergeEditorialOverride(gen, { action }).hidden).toBe(false);
    }
  });

  it('keeps a null generated deck when no deck edit exists', () => {
    expect(mergeEditorialOverride({ ...gen, deck: null }, { action: 'live' }).deck).toBeNull();
  });
});

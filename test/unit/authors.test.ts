import { describe, expect, it } from 'vitest';

import { cleanAuthors } from '@/lib/studio/authors-text';

describe('story authors (byline)', () => {
  it('a typed "By ..." is stored without "By"; empty means the house byline', () => {
    expect(cleanAuthors('By  Pranav Puri and Yash Aggarwal ')).toBe('Pranav Puri and Yash Aggarwal');
    expect(cleanAuthors('  ')).toBe('');
    expect(cleanAuthors(null)).toBe('');
  });
});

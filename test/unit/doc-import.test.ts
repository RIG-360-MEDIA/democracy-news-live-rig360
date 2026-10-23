import { describe, expect, it } from 'vitest';

import { assembleFields, looksLikeHeading, textToBlocks, type Block } from '@/lib/studio/doc-import';
import { sniffImageType } from '@/lib/studio/image-type';

// Create page "Import document": headline / strap / body with section headings land in the right fields.
describe('doc import: sorting a document into the Create form', () => {
  it('Word-style blocks: Title -> headline, Subtitle -> strap, headings -> "## ", blank lines between paragraphs', () => {
    const blocks: Block[] = [
      { kind: 'title', text: "India's Mica: The Bargaining Chip" },
      { kind: 'subtitle', text: 'India is sitting on a mineral the world needs.' },
      { kind: 'para', text: 'NEW DELHI: Raoul Prem Menon calls mica "electric gold."' },
      { kind: 'heading', text: 'Leaving the country, off the books' },
      { kind: 'para', text: 'The scale is striking.' },
    ];
    expect(assembleFields(blocks)).toEqual({
      headline: "India's Mica: The Bargaining Chip",
      dek: 'India is sitting on a mineral the world needs.',
      body: 'NEW DELHI: Raoul Prem Menon calls mica "electric gold."\n\n## Leaving the country, off the books\n\nThe scale is striking.',
      headings: 1,
    });
  });

  it('plain text: first short line = headline, short next paragraph = strap, a "CITY:" dateline is never the strap', () => {
    const withStrap = assembleFields(textToBlocks('Big Headline Here\n\nA short strap line.\n\nNEW DELHI: First para.\n\nSecond para.\n\nWhat happens next\n\nLast para.'));
    expect(withStrap.headline).toBe('Big Headline Here');
    expect(withStrap.dek).toBe('A short strap line.');
    expect(withStrap.body).toBe('NEW DELHI: First para.\n\nSecond para.\n\n## What happens next\n\nLast para.');
    const noStrap = assembleFields(textToBlocks('Headline\nNEW DELHI: Opening para.\nSecond para.\nThird para.'));
    expect(noStrap.dek).toBe('');
    expect(noStrap.body.startsWith('NEW DELHI: Opening para.')).toBe(true);
  });

  it('markdown headings are kept; sentences are never turned into headings', () => {
    const f = assembleFields(textToBlocks('# Title\n\nOpening paragraph that is long enough to be body text, with a full stop.\n\n## Section two?\n\nText.'));
    expect(f.headline).toBe('Title');
    expect(f.body).toContain('## Section two?');
    expect(looksLikeHeading('What happens next')).toBe(true);
    expect(looksLikeHeading('The scale is striking.')).toBe(false);
    expect(looksLikeHeading('his demands are sweeping')).toBe(false);
  });

  it('uploaded images are typed from their bytes, not their name', () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
    expect(sniffImageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull();
  });
});

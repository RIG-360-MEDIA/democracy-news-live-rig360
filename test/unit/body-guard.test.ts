import { describe, expect, it } from 'vitest';
import { MALFORMED_BODY_PATTERN } from '@/lib/worldwide/body-guard';

const bad = new RegExp(MALFORMED_BODY_PATTERN);

describe('MALFORMED_BODY_PATTERN', () => {
  it('catches a section whose content is a Python dict/list repr (live story 2febd361)', () => {
    expect(bad.test("## Investigation Details\n{'name': 'Referees File', 'purpose': 'x'}")).toBe(true);
    expect(bad.test("## Suspects\n\n[{'name': 'Ferhat Gündoğdu', 'role': 'Chairman'}]")).toBe(true);
    expect(bad.test("## Evidence\n['Witness statements', 'Expert reports']")).toBe(true);
    expect(bad.test('{"headline": "unparsed"}')).toBe(true);
  });

  it('leaves real prose alone, including bracketed asides', () => {
    expect(bad.test('## The Court\nThe prosecutor [named in filings] sought arrests.')).toBe(false);
    expect(bad.test('He said: "{this} is not data" in court.\n\n[Editor’s note] Updated.')).toBe(false);
  });
});

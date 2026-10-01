// F9 review fix — the reader-side prompt-leak filter must only DROP high-confidence prompts, never real
// headlines; broader matches are only FLAGGED to editors in the Studio.
import { describe, expect, it } from 'vitest';

import { isPromptLeak, promptLeakLevel } from '@/lib/studio/prompt-leak';

describe('high-confidence prompt leaks are dropped from the reader site', () => {
  it.each([
    'Research the impact of the new tariff on Indian exporters',
    'Please research the effects of the heatwave on rice yields',
    'Write a 600-word article about the Georgia protests',
    'Draft an explainer on the new election law for the reader',
    'Summarise the ruling in 200 words',
    'Investigate the impact of the strike on port traffic',
  ])('leak: %s', (t) => {
    expect(promptLeakLevel(t)).toBe('leak');
    expect(isPromptLeak(t)).toBe(true);
  });
});

describe('real headlines are never dropped (review false positives)', () => {
  it.each([
    'Nvidia emerges as an AI powerhouse',
    'Panel to draft a report on pandemic response',
    'Brief: Markets close higher on Friday',
    'Examine the ruling, say lawyers',
    'Investigate whether the minister lied',
    'Analyze how voters swing',
    'Research shows the impact of heat on crop yields',
    'Researchers find new antibiotic in soil',
    'How the budget affects your taxes',
    'Writers strike enters third week',
  ])('kept: %s', (t) => {
    expect(isPromptLeak(t)).toBe(false);
  });

  it('imperative-looking real headlines are at most flagged for editors, not dropped', () => {
    expect(promptLeakLevel('Investigate whether the minister lied')).toBe('suspect');
    expect(promptLeakLevel('Analyze how voters swing')).toBe('suspect');
    expect(promptLeakLevel('Examine the ruling, say lawyers')).toBe('suspect');
    expect(promptLeakLevel('Nvidia emerges as an AI powerhouse')).toBe('none');
    expect(promptLeakLevel('Brief: Markets close higher on Friday')).toBe('none');
    expect(promptLeakLevel('Panel to draft a report on pandemic response')).toBe('none');
  });

  it('labelled prompts are flagged for editors', () => {
    expect(promptLeakLevel('Prompt: summarise the ruling')).toBe('suspect');
    expect(promptLeakLevel('Instructions: cover the vote')).toBe('suspect');
    expect(promptLeakLevel(null)).toBe('none');
  });
});

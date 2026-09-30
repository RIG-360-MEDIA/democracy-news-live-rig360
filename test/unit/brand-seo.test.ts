import { afterEach, describe, expect, it, vi } from 'vitest';

import { brandFor } from '@/lib/brand';

describe('brand', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_BRAND; vi.resetModules(); });

  it('defaults to Democracy News Live (the only production deployment)', async () => {
    delete process.env.NEXT_PUBLIC_BRAND;
    vi.resetModules();
    const { BRAND } = await import('@/lib/brand');
    expect(BRAND.name).toBe('Democracy News Live');
    expect(BRAND.name).not.toMatch(/rig wire/i);
    expect(BRAND.byline).not.toMatch(/rig wire/i);
  });

  it('only the explicit rigwire key yields the Rig Wire brand', () => {
    expect(brandFor('rigwire').name).toBe('Rig Wire');
    expect(brandFor('dnl').name).toBe('Democracy News Live');
    expect(brandFor(undefined).name).toBe('Democracy News Live');
    expect(brandFor('garbage').name).toBe('Democracy News Live');
  });
});

describe('robots.txt', () => {
  it('allows the reader, hides studio/curate/api/auth, and points at the sitemap', async () => {
    const robots = (await import('@/app/robots')).default();
    const rule = Array.isArray(robots.rules) ? robots.rules[0] : robots.rules;
    expect(rule.allow).toBe('/');
    expect(rule.disallow).toEqual(expect.arrayContaining(['/studio', '/curate', '/api/', '/signin']));
    expect(robots.sitemap).toBe('https://global.democracynewslive.com/sitemap.xml');
  });
});

describe('cleanDeck', () => {
  it('drops brand-name boilerplate decks and keeps real ones', async () => {
    const { cleanDeck } = await import('@/lib/brand');
    expect(cleanDeck('Rig Wire')).toBe('');
    expect(cleanDeck(' rig wire. ')).toBe('');
    expect(cleanDeck('Democracy News Live')).toBe('');
    expect(cleanDeck(null)).toBe('');
    expect(cleanDeck('Talks stall as both sides dig in')).toBe('Talks stall as both sides dig in');
  });
});

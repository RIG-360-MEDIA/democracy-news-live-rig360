import { afterEach, describe, expect, it, vi } from 'vitest';

async function ttlWith(value: string | undefined) {
  vi.resetModules();
  if (value === undefined) delete process.env.READER_CACHE_TTL_SECONDS;
  else process.env.READER_CACHE_TTL_SECONDS = value;
  return (await import('@/lib/cache')).READER_CACHE_TTL;
}

describe('READER_CACHE_TTL', () => {
  afterEach(() => { delete process.env.READER_CACHE_TTL_SECONDS; });

  it('defaults to one hour (the publish cadence)', async () => {
    expect(await ttlWith(undefined)).toBe(3600);
  });

  it('accepts a sane override', async () => {
    expect(await ttlWith('1200')).toBe(1200);
  });

  it('ignores out-of-range or junk values', async () => {
    expect(await ttlWith('5')).toBe(3600);
    expect(await ttlWith('999999')).toBe(3600);
    expect(await ttlWith('abc')).toBe(3600);
  });

  it('maps every public revalidate name to a known cache tag', async () => {
    const { REVALIDATE_TAGS, CACHE_TAGS } = await import('@/lib/cache');
    expect(Object.values(REVALIDATE_TAGS).sort()).toEqual(Object.values(CACHE_TAGS).sort());
  });
});

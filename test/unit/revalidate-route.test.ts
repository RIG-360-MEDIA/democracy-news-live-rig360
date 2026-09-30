import { beforeEach, describe, expect, it, vi } from 'vitest';

const revalidateTag = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: (t: string) => revalidateTag(t) }));

const SECRET = 'x'.repeat(40);

async function call(body: unknown, auth?: string) {
  const { POST } = await import('@/app/api/revalidate/route');
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (auth !== undefined) headers.authorization = auth;
  return POST(new Request('http://t/api/revalidate', { method: 'POST', headers, body: JSON.stringify(body) }));
}

describe('POST /api/revalidate', () => {
  beforeEach(() => {
    revalidateTag.mockClear();
    vi.resetModules();
    process.env.REVALIDATE_SECRET = SECRET;
  });

  it('fails closed (503) when the secret is not configured', async () => {
    delete process.env.REVALIDATE_SECRET;
    const res = await call({ tags: ['frontpage'] }, `Bearer ${SECRET}`);
    expect(res.status).toBe(503);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('fails closed (503) when the secret is too short to be real', async () => {
    process.env.REVALIDATE_SECRET = 'short';
    const res = await call({ tags: ['frontpage'] }, 'Bearer short');
    expect(res.status).toBe(503);
  });

  it('rejects a missing or wrong bearer token (401)', async () => {
    expect((await call({ tags: ['frontpage'] })).status).toBe(401);
    expect((await call({ tags: ['frontpage'] }, 'Bearer wrong')).status).toBe(401);
    expect((await call({ tags: ['frontpage'] }, `Bearer ${SECRET}x`)).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects tags outside the whitelist and malformed bodies (400)', async () => {
    expect((await call({ tags: ['everything'] }, `Bearer ${SECRET}`)).status).toBe(400);
    expect((await call({ tags: [] }, `Bearer ${SECRET}`)).status).toBe(400);
    expect((await call({ nope: 1 }, `Bearer ${SECRET}`)).status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('revalidates each whitelisted tag once (200)', async () => {
    const res = await call({ tags: ['frontpage', 'ticker', 'story', 'ticker'] }, `Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toEqual(['frontpage', 'ticker', 'story']);
    expect(revalidateTag.mock.calls.map((c) => c[0]).sort()).toEqual(
      ['reader-front-page', 'reader-story-detail', 'reader-ticker'],
    );
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

// F4: production must never serve Door B fixture drafts.
const ENV0 = { ...process.env };

async function client(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import('@/lib/dispatch/client');
}

describe('dispatch client mock gating', () => {
  afterEach(() => { process.env = { ...ENV0 }; });

  it('production + no box → not live, and calls fail with a 503 config error (no fixtures)', async () => {
    const c = await client({ NODE_ENV: 'production', BOX_STUDIO_URL: undefined, BOX_STUDIO_TOKEN: undefined });
    expect(c.isDispatchLive()).toBe(false);
    await expect(c.listJobs([], 'editor-1')).rejects.toMatchObject({ code: 'config', status: 503 });
  });

  it("production + BOX_STUDIO_URL='mock' is still refused", async () => {
    const c = await client({ NODE_ENV: 'production', BOX_STUDIO_URL: 'mock' });
    expect(c.isDispatchLive()).toBe(false);
    await expect(c.listJobs([], 'editor-1')).rejects.toMatchObject({ code: 'config' });
  });

  it('development/test + no box → mock mode serves fixtures', async () => {
    const c = await client({ NODE_ENV: 'test', BOX_STUDIO_URL: undefined });
    expect(c.isDispatchLive()).toBe(false);
    await expect(c.listJobs([], 'editor-1')).resolves.toBeInstanceOf(Array);
  });

  it('a configured box is live in any environment', async () => {
    const c = await client({ NODE_ENV: 'production', BOX_STUDIO_URL: 'https://box.example/draftsmith' });
    expect(c.isDispatchLive()).toBe(true);
  });
});

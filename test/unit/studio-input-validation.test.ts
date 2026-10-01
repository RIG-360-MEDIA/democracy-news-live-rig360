// L1 — Studio write routes validate their input with zod BEFORE touching the DB, and never echo a raw
// Postgres error message to the client (generic message out, full context to the server log).
import { inspect } from 'node:util';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = { statements: 0, dbError: null as Error | null };
  // Lazily-settling thenable: counts the call, rejects only if awaited (unawaited SQL fragments must
  // not produce unhandled rejections).
  const run = () => {
    state.statements += 1;
    const settle = () => (state.dbError ? Promise.reject(state.dbError) : Promise.resolve([]));
    return {
      then: (ok?: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => settle().then(ok, ko),
      catch: (ko: (e: unknown) => unknown) => settle().catch(ko),
    };
  };
  const sql = Object.assign(
    vi.fn(() => run()),
    { json: vi.fn((v: unknown) => v), begin: vi.fn(async () => run()) },
  );
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: h.sql, sqlAnalytics: h.sql }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u', email: 'editor@example.org', role: 'editor' } })),
}));
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async () => ({ id: 'u', email: 'editor@example.org', role: 'editor' })),
}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/lib/studio/placement', () => ({ projectPlacement: vi.fn(async () => null) }));

const STORY_ID = '33333333-3333-4333-8333-333333333333';
const PG_LEAK = 'relation "rigwire.secret_internal_table" does not exist';

async function post(route: 'override' | 'edit' | 'create', body: unknown) {
  const mod = (await import(/* @vite-ignore */ `@/app/api/studio/${route}/route`)) as { POST: (r: Request) => Promise<Response> };
  const res = await mod.POST(
    new Request(`http://localhost/api/studio/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
  return { status: res.status, text: await res.text() };
}

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  h.state.statements = 0;
  h.state.dbError = null;
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  errorSpy.mockRestore();
});

const LONG = (n: number) => 'x'.repeat(n);

describe('L1 — /api/studio/override rejects bad input before the DB', () => {
  it.each([
    ['non-uuid storyId', { storyId: 'abc', kind: 'publish' }],
    ['SQL-ish storyId', { storyId: "1' OR '1'='1", kind: 'kill' }],
    ['unknown kind', { storyId: STORY_ID, kind: 'nuke' }],
    ['rank 0', { storyId: STORY_ID, kind: 'pin', rank: 0 }],
    ['rank huge', { storyId: STORY_ID, kind: 'pin', rank: 1_000_000 }],
    ['rank fractional', { storyId: STORY_ID, kind: 'pin', rank: 1.5 }],
    ['rank non-numeric', { storyId: STORY_ID, kind: 'pin', rank: 'top' }],
    ['delta out of range', { storyId: STORY_ID, kind: 'boost', delta: 10_000 }],
    ['delta fractional', { storyId: STORY_ID, kind: 'boost', delta: 0.5 }],
    ['reason > 500 chars', { storyId: STORY_ID, kind: 'kill', reason: LONG(501) }],
    ['locked not boolean', { storyId: STORY_ID, kind: 'lock', locked: 'yes' }],
  ])('%s → 400', async (_n, body) => {
    const r = await post('override', body);
    expect(r.status).toBe(400);
    expect(h.state.statements).toBe(0);
  });

  it('accepts a bounded pin', async () => {
    const r = await post('override', { storyId: STORY_ID, kind: 'pin', rank: 3 });
    expect(r.status).not.toBe(400);
  });
});

describe('L1 — /api/studio/edit rejects bad input before the DB', () => {
  it.each([
    ['non-uuid storyId', { storyId: 'x', headline: 'h' }],
    ['headline too long', { storyId: STORY_ID, headline: LONG(301) }],
    ['dek too long', { storyId: STORY_ID, dek: LONG(1001) }],
    ['body too long', { storyId: STORY_ID, body: LONG(100_001) }],
    ['too many tags', { storyId: STORY_ID, tags: Array.from({ length: 51 }, (_, i) => `t${i}`) }],
    ['tag too long', { storyId: STORY_ID, tags: [LONG(81)] }],
    ['javascript: image', { storyId: STORY_ID, image: 'javascript:alert(1)' }],
    ['no fields', { storyId: STORY_ID }],
  ])('%s → 400', async (_n, body) => {
    const r = await post('edit', body);
    expect(r.status).toBe(400);
    expect(h.state.statements).toBe(0);
  });
});

describe('L1 — /api/studio/create rejects bad input before the DB', () => {
  const ok = { headline: 'Headline', body: 'Body' };
  it.each([
    ['missing headline', { body: 'b' }],
    ['blank body', { headline: 'h', body: '   ' }],
    ['headline too long', { ...ok, headline: LONG(301) }],
    ['body too long', { ...ok, body: LONG(100_001) }],
    ['dek too long', { ...ok, dek: LONG(1001) }],
    ['country too long', { ...ok, country: LONG(65) }],
    ['javascript: image_url', { ...ok, image_url: 'javascript:alert(1)' }],
    ['data: image_url', { ...ok, image_url: 'data:image/png;base64,AAAA' }],
    ['importance out of range', { ...ok, importance: 1e9 }],
  ])('%s → 400', async (_n, body) => {
    const r = await post('create', body);
    expect(r.status).toBe(400);
    expect(h.state.statements).toBe(0);
  });

  it('accepts an https image_url and an empty one', async () => {
    expect((await post('create', { ...ok, image_url: 'https://cdn.example.org/a.jpg' })).status).not.toBe(400);
    expect((await post('create', { ...ok, image_url: '' })).status).not.toBe(400);
  });
});

describe('L1 — raw Postgres errors never reach the client', () => {
  it.each([
    ['override', { storyId: STORY_ID, kind: 'kill' }],
    ['edit', { storyId: STORY_ID, headline: 'New' }],
    ['create', { headline: 'Headline', body: 'Body' }],
  ] as const)('%s: 500 with a generic message, details logged server-side', async (route, body) => {
    h.state.dbError = new Error(PG_LEAK);
    const r = await post(route, body);
    expect(r.status).toBe(500);
    expect(r.text).not.toContain('secret_internal_table');
    expect(errorSpy).toHaveBeenCalled();
    expect(inspect(errorSpy.mock.calls, { depth: 5 })).toContain('secret_internal_table');
  });

  it('audit GET: 500 with a generic message', async () => {
    h.state.dbError = new Error(PG_LEAK);
    const { GET } = await import('@/app/api/studio/audit/route');
    const res = await GET(new Request('http://localhost/api/studio/audit'));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret_internal_table');
  });
});

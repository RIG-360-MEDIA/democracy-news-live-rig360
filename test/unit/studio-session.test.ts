// H1 — requireRole trusts the DATABASE role, not the JWT claim, so a role change (or account removal)
// takes effect on the very next guarded call instead of when the 30-day cookie happens to expire.
// Also pins the production inertness of the CMS_DEV_EDITOR bypass (M4) and the credentials session
// lifetime.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    session: null as null | { user: Record<string, string> },
    dbRows: [] as unknown[],
    queries: [] as Array<{ text: string; values: unknown[] }>,
  };
  const sql = Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      state.queries.push({ text: strings.join('$').replace(/\s+/g, ' ').trim(), values });
      return Promise.resolve(state.dbRows);
    }),
    { begin: vi.fn(), json: vi.fn() },
  );
  return { state, sql };
});

vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => h.state.session) }));
vi.mock('@/lib/db', () => ({ sql: h.sql }));
// config.edge.ts registers next-auth's type augmentation via side-effect imports; the real package
// can't load outside Next's bundler, and nothing here needs it at runtime.
vi.mock('next-auth', () => ({}));
vi.mock('next-auth/jwt', () => ({}));

import { authConfigEdge } from '@/lib/auth/config.edge';
import { guardApi } from '@/lib/studio/guard';
import { requireRole } from '@/lib/studio/session';

const USER_ID = '66666666-6666-4666-8666-666666666666';

function jwtAs(role: string, id = USER_ID) {
  h.state.session = { user: { id, email: 'person@example.org', role } };
}
function dbSays(role: string | null) {
  h.state.dbRows = role === null ? [] : [{ id: USER_ID, email: 'person@example.org', role }];
}

beforeEach(() => {
  h.state.session = null;
  h.state.dbRows = [];
  h.state.queries = [];
  vi.stubEnv('CMS_DEV_EDITOR', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('H1 — requireRole re-reads the current role from auth.users', () => {
  it('a demoted admin (JWT still says admin) is refused admin at once', async () => {
    jwtAs('admin');
    dbSays('editor');
    expect(await requireRole('admin')).toEqual({ ok: false, status: 403 });
  });

  it('the demoted admin keeps editor access, with the DB role reported', async () => {
    jwtAs('admin');
    dbSays('editor');
    const g = await requireRole('editor');
    expect(g).toEqual({ ok: true, editor: { id: 'person@example.org', role: 'editor', isAdmin: false } });
  });

  it('an editor demoted to reader is refused the Studio', async () => {
    jwtAs('editor');
    dbSays('reader');
    expect(await requireRole('editor')).toEqual({ ok: false, status: 403 });
  });

  it('a deleted user (no auth.users row) is treated as signed out', async () => {
    jwtAs('admin');
    dbSays(null);
    expect(await requireRole('editor')).toEqual({ ok: false, status: 401 });
  });

  it('a promotion takes effect without re-login', async () => {
    jwtAs('reader');
    dbSays('editor');
    expect((await requireRole('editor')).ok).toBe(true);
  });

  it('reads the role with one indexed lookup by user id', async () => {
    jwtAs('editor');
    dbSays('editor');
    await requireRole('editor');
    const userReads = h.state.queries.filter((q) => q.text.includes('FROM auth.users'));
    expect(userReads).toHaveLength(1);
    expect(userReads[0].text).toMatch(/WHERE id = \$/);
    expect(userReads[0].values).toEqual([USER_ID]);
  });

  it('a token whose subject is not a uuid is refused without touching the DB', async () => {
    jwtAs('admin', 'not-a-uuid');
    dbSays('admin');
    expect(await requireRole('editor')).toEqual({ ok: false, status: 401 });
    expect(h.state.queries).toEqual([]);
  });

  it('anonymous callers never reach the DB', async () => {
    expect(await requireRole('editor')).toEqual({ ok: false, status: 401 });
    expect(h.state.queries).toEqual([]);
  });

  it('guardApi answers 403 for a JWT-admin whose DB role is editor', async () => {
    jwtAs('admin');
    dbSays('editor');
    const g = await guardApi('admin');
    expect(g.ok).toBe(false);
    if (!g.ok) expect(g.response.status).toBe(403);
  });
});

describe('M4 — CMS_DEV_EDITOR=1 grants nothing in production', () => {
  it('requireRole: no session → 401 even with the bypass flag set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CMS_DEV_EDITOR', '1');
    expect(await requireRole('admin')).toEqual({ ok: false, status: 401 });
    expect(await requireRole('editor')).toEqual({ ok: false, status: 401 });
  });

  it('requireRole: a reader stays a reader with the bypass flag set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CMS_DEV_EDITOR', '1');
    jwtAs('reader');
    dbSays('reader');
    expect(await requireRole('editor')).toEqual({ ok: false, status: 403 });
  });

  it('edge middleware: an anonymous /studio request is not let through', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CMS_DEV_EDITOR', '1');
    const authorized = authConfigEdge.callbacks!.authorized!;
    const nextUrl = new URL('https://example.org/studio');
    const request = { nextUrl, headers: new Headers() } as unknown as Parameters<typeof authorized>[0]['request'];
    expect(authorized({ auth: null, request })).toBe(false);
  });

  it('the bypass does work outside production (so the test above is meaningful)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CMS_DEV_EDITOR', '1');
    expect((await requireRole('admin')).ok).toBe(true);
  });
});

describe('H1 — credentials session lifetime', () => {
  it('the JWT session lasts at most 7 days', () => {
    expect(authConfigEdge.session?.maxAge).toBeLessThanOrEqual(7 * 24 * 60 * 60);
  });
});

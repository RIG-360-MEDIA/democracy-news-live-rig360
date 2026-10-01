// F8 — Studio role matrix: {anonymous, reader, editor, admin} × every Studio API route, page/layout
// and server action discovered on disk.
//
//   denied  → API 401 (anonymous) / 403 (wrong role); page redirect; action refused — and in every
//             denied case NOTHING downstream (DB, box, cache) is touched.
//   allowed → the guard lets the call through (API: not 401/403; page: no guard redirect; action:
//             reaches the data layer).
//
// Also fails when a Studio surface exists that has no declared role in ./studio/access-matrix.ts.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIONS, API_ROUTES, PAGES, type Method, type Required } from './studio/access-matrix';
import {
  discoverActionFiles,
  discoverInlineActions,
  discoverPages,
  discoverRoutes,
  HTTP_METHODS,
  readSource,
} from './studio/discover';

const h = vi.hoisted(() => {
  class Touched extends Error {}
  class Redirected extends Error {
    constructor(readonly url: string) {
      super(`NEXT_REDIRECT ${url}`);
    }
  }
  class NotFoundSignal extends Error {}
  const state = { session: null as null | { user: Record<string, string> }, touches: 0 };
  // A lazily-rejecting thenable: counts the call, rejects only if awaited (so unawaited SQL
  // fragments never produce unhandled rejections).
  const touch = () => {
    state.touches += 1;
    const fail = () => Promise.reject(new Touched('downstream touched'));
    return {
      then: (ok?: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => fail().then(ok, ko),
      catch: (ko: (e: unknown) => unknown) => fail().catch(ko),
    };
  };
  const makeSql = () =>
    Object.assign(vi.fn(touch), { begin: vi.fn(touch), json: vi.fn((v: unknown) => v), unsafe: vi.fn(touch) });
  return { Touched, Redirected, NotFoundSignal, state, touch, makeSql };
});

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => h.state.session),
  signIn: vi.fn(h.touch),
  signOut: vi.fn(h.touch),
}));
// H1: requireRole re-reads the role from auth.users. Here the DB agrees with the session, so the
// matrix exercises the policy; the DB-vs-JWT disagreement cases live in studio-session.test.ts. Kept
// off the `sql` mock so the guard's own lookup never counts as a downstream touch.
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async (id: string) => {
    const u = h.state.session?.user;
    return u && u.id === id ? { id, email: u.email, role: u.role } : null;
  }),
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(h.touch), verifyPassword: vi.fn(h.touch) }));
vi.mock('@/lib/db', () => ({ sql: h.makeSql(), sqlAnalytics: h.makeSql(), withUser: vi.fn(h.touch) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new h.Redirected(url);
  },
  permanentRedirect: (url: string) => {
    throw new h.Redirected(url);
  },
  notFound: () => {
    throw new h.NotFoundSignal('not found');
  },
}));
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(h.touch),
  revalidatePath: vi.fn(h.touch),
  unstable_cache: (fn: unknown) => fn,
  unstable_noStore: vi.fn(),
}));

type Who = 'anonymous' | 'reader' | 'editor' | 'admin';
const WHO: readonly Who[] = ['anonymous', 'reader', 'editor', 'admin'];

function sessionFor(who: Who) {
  if (who === 'anonymous') return null;
  return { user: { id: `${who}-id`, email: `${who}@example.org`, name: who, role: who } };
}

function allowed(required: Required, who: Who): boolean {
  if (required === 'admin') return who === 'admin';
  return who === 'editor' || who === 'admin';
}

/** Where a denied page visitor is sent (see guardPage). */
function deniedRedirect(required: Required, who: Who): string {
  if (who === 'anonymous') return '/signin';
  if (required === 'admin' && who === 'editor') return '/studio';
  return '/';
}

const ID = '44444444-4444-4444-8444-444444444444';
const savedEnv = { ...process.env };

beforeAll(async () => {
  delete process.env.CMS_DEV_EDITOR;
  delete process.env.BOX_DRAFTSMITH_URL;
  delete process.env.BOX_DRAFTSMITH_TOKEN;
  vi.stubGlobal('fetch', vi.fn(h.touch));
  // Warm every module first: some build SQL fragments at import time, which must not be counted
  // as a request touching the DB.
  for (const s of [...discoverRoutes(), ...discoverPages(), ...discoverActionFiles()]) {
    await import(/* @vite-ignore */ s.specifier);
  }
}, 180_000);
afterAll(() => {
  process.env = savedEnv;
  vi.unstubAllGlobals();
});
beforeEach(() => {
  h.state.touches = 0;
});

const routes = discoverRoutes();
const pages = discoverPages();
const actionFiles = discoverActionFiles();

describe('F8 matrix covers every Studio surface on disk', () => {
  it('discovers the Studio surfaces', () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(pages.length).toBeGreaterThan(0);
    expect(actionFiles.length).toBeGreaterThan(0);
  });

  it('every API route file is declared, and every declared route exists', () => {
    const onDisk = routes.map((r) => r.key).sort();
    expect(onDisk).toEqual(Object.keys(API_ROUTES).sort());
  });

  it('every exported HTTP method has a declared role (and no stale declarations)', async () => {
    for (const r of routes) {
      const mod = (await import(/* @vite-ignore */ r.specifier)) as Record<string, unknown>;
      const exported = HTTP_METHODS.filter((m) => typeof mod[m] === 'function').sort();
      const declared = Object.keys(API_ROUTES[r.key] ?? {}).sort();
      expect({ route: r.key, methods: exported }).toEqual({ route: r.key, methods: declared });
    }
  });

  it('every page and layout is declared, and every declared page exists', () => {
    expect(pages.map((p) => p.key).sort()).toEqual(Object.keys(PAGES).sort());
  });

  it('every exported server action is declared (and no stale declarations)', async () => {
    const onDisk: string[] = [];
    for (const f of actionFiles) {
      const mod = (await import(/* @vite-ignore */ f.specifier)) as Record<string, unknown>;
      for (const [name, v] of Object.entries(mod)) if (typeof v === 'function') onDisk.push(`${f.rel}#${name}`);
    }
    expect(onDisk.sort()).toEqual(Object.keys(ACTIONS).sort());
  });

  it('no Studio file declares an inline server action (they must live in an audited actions file)', () => {
    expect(discoverInlineActions()).toEqual([]);
  });

  it('no Studio route/page/action does its own ad-hoc role check — only the central guard', () => {
    const files = [...routes, ...pages, ...actionFiles].map((s) => s.rel);
    const adHoc = /\bauth\(\)|\bisAdmin\(|\bisEditor\(|requireEditor|requireAdmin|\.role\s*[!=]==/;
    const offenders = files.filter((rel) => adHoc.test(readSource(rel)));
    expect(offenders).toEqual([]);
  });
});

function requestFor(key: string, method: Method): Request {
  const url = `http://localhost${key.replace('[id]', ID)}?q=test&ids=a`;
  const init: RequestInit = { method, headers: { 'content-type': 'application/json' } };
  if (method !== 'GET') init.body = JSON.stringify({});
  return new Request(url, init);
}

describe.each(WHO)('API routes as %s', (who) => {
  const cases = routes.flatMap((r) =>
    Object.entries(API_ROUTES[r.key] ?? {}).map(([method, rule]) => ({ r, method: method as Method, rule: rule! })),
  );

  it.each(cases.map((c) => [`${c.method} ${c.r.key} (${c.rule.role})`, c] as const))('%s', async (_n, c) => {
    h.state.session = sessionFor(who);
    const mod = (await import(/* @vite-ignore */ c.r.specifier)) as Record<string, unknown>;
    const handler = mod[c.method] as (req: Request, ctx: unknown) => Promise<Response>;
    let status: number;
    try {
      const res = await handler(requestFor(c.r.key, c.method), { params: Promise.resolve({ id: ID }) });
      status = res.status;
    } catch (e) {
      // Only an allowed caller may get far enough to hit (mocked) downstream failures.
      expect(e).toBeInstanceOf(h.Touched);
      status = 500;
    }
    if (allowed(c.rule.role, who)) {
      expect(status).not.toBe(401);
      expect(status).not.toBe(403);
    } else {
      expect(status).toBe(who === 'anonymous' ? 401 : 403);
      expect(h.state.touches).toBe(0);
    }
  });
});

describe.each(WHO)('pages and layouts as %s', (who) => {
  const cases = pages.map((p) => ({ p, role: PAGES[p.key] }));

  it.each(cases.map((c) => [`${c.p.key} (${c.role})`, c] as const))('%s', async (_n, c) => {
    h.state.session = sessionFor(who);
    const mod = (await import(/* @vite-ignore */ c.p.specifier)) as { default: (props: unknown) => unknown };
    const props = {
      params: Promise.resolve({ id: ID }),
      searchParams: Promise.resolve({}),
      children: null,
    };
    let redirectedTo: string | null = null;
    try {
      await mod.default(props);
    } catch (e) {
      if (e instanceof h.Redirected) redirectedTo = e.url;
      else expect(e instanceof h.Touched || e instanceof h.NotFoundSignal).toBe(true);
    }
    if (allowed(c.role, who)) {
      expect(redirectedTo).toBeNull();
    } else {
      expect(redirectedTo).toBe(deniedRedirect(c.role, who));
      expect(h.state.touches).toBe(0);
    }
  });
});

describe.each(WHO)('server actions as %s', (who) => {
  const cases = Object.entries(ACTIONS).filter(([, rule]) => rule.role !== 'public');

  it.each(cases.map(([key, rule]) => [`${key} (${rule.role})`, key, rule] as const))('%s', async (_n, key, rule) => {
    h.state.session = sessionFor(who);
    const [file, name] = key.split('#');
    const mod = (await import(/* @vite-ignore */ `@/app/${file.replace(/\.tsx?$/, '')}`)) as Record<
      string,
      (...a: unknown[]) => Promise<unknown>
    >;
    try {
      await mod[name](...rule.args());
    } catch {
      // Denied actions may throw or return an error state; allowed ones hit the mocked DB.
    }
    if (allowed(rule.role as Required, who)) {
      expect(h.state.touches).toBeGreaterThan(0);
    } else {
      expect(h.state.touches).toBe(0);
    }
  });
});

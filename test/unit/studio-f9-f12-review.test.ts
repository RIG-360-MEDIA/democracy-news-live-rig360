// F9–F12 review fixes: write conflicts → 409, bounded weight maps, no-op manual PATCH, expired pins
// force nothing, migration clean-up rows are never undoable, neutral default knobs.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = { rows: [] as unknown[], log: [] as string[], fail: null as unknown };
  const run = (strings: TemplateStringsArray) => {
    const text = strings.join('$').replace(/\s+/g, ' ').trim();
    state.log.push(text);
    if (state.fail && /^(INSERT|UPDATE)/.test(text)) return Promise.reject(state.fail);
    return Promise.resolve(text.startsWith('SELECT') ? state.rows : []);
  };
  const sql = Object.assign(run, {
    json: (v: unknown) => v,
    begin: async (cb: (tx: unknown) => Promise<unknown>) => cb(Object.assign(run, { json: (v: unknown) => v })),
  });
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: h.sql, sqlAnalytics: h.sql }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u', email: 'admin@example.org', role: 'admin' } })),
}));
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async () => ({ id: 'u', email: 'admin@example.org', role: 'admin' })),
}));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/lib/studio/placement', () => ({ projectPlacement: vi.fn(async () => null) }));

import { isUndoable, type AuditRow } from '@/lib/studio/audit';
import { forcedStoryIds, isForceSurfaced } from '@/lib/worldwide/editorial-rank';
import { DEFAULT_KNOBS } from '@/lib/worldwide/scoring';

import type { EditorialOverride } from '@/lib/studio/types';

const STORY = '88888888-8888-4888-8888-888888888888';
const B = '99999999-9999-4999-8999-999999999999';

async function call(route: string, method: string, body: unknown, id = STORY) {
  const mod = (await import(/* @vite-ignore */ `@/app/api/studio/${route}/route`)) as Record<
    string,
    (r: Request, c: unknown) => Promise<Response>
  >;
  const req = new Request('http://localhost/x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  return mod[method](req, { params: Promise.resolve({ id }) });
}

const pgError = (code: string) => Object.assign(new Error(`pg ${code}`), { code });

beforeEach(() => {
  h.state.rows = [];
  h.state.log = [];
  h.state.fail = null;
});

describe('write conflicts answer 409, not 500', () => {
  it.each(['23P01', '40P01', '23505'])('override pin hitting %s → 409', async (code) => {
    h.state.fail = pgError(code);
    const res = await call('override', 'POST', { storyId: STORY, kind: 'pin', rank: 1 });
    expect(res.status).toBe(409);
  });

  it.each(['23P01', '40P01'])('reorder hitting %s → 409', async (code) => {
    h.state.fail = pgError(code);
    const res = await call('reorder', 'POST', { order: [STORY, B] });
    expect(res.status).toBe(409);
  });

  it('a genuine failure is still a 500 with a generic message', async () => {
    h.state.fail = new Error('connection refused to 10.0.0.1');
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await call('reorder', 'POST', { order: [STORY] });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain('10.0.0.1');
  });

  it('a stale pin token → 409 before anything is written', async () => {
    h.state.rows = [{ story_id: B, action: 'pinned', pinned_rank: 1 }];
    const res = await call('reorder', 'POST', { order: [STORY], expectedPinToken: 'stale' });
    expect(res.status).toBe(409);
    expect(h.state.log.some((t) => /^(INSERT|UPDATE)/.test(t))).toBe(false);
  });
});

describe('weights POST validation', () => {
  it.each([
    ['null body', 'null'],
    ['array body', '[]'],
    ['topic weight above 5', { topicWeights: { POLITICS: 6 } }],
    ['negative country weight', { countryWeights: { IN: -1 } }],
    ['junk key', { topicWeights: { 'POLITICS; drop': 1 } }],
  ])('%s → 400, nothing written', async (_n, body) => {
    const res = await call('weights', 'POST', body);
    expect(res.status).toBe(400);
    expect(h.state.log).toEqual([]);
  });

  it('in-range maps are accepted', async () => {
    const res = await call('weights', 'POST', { topicWeights: { POLITICS: 5, SPORTS: 0 }, countryWeights: { IN: 1.5 } });
    expect(res.status).toBe(200);
  });
});

describe('manual PATCH that changes nothing', () => {
  it('returns 200 without an UPDATE or an audit row', async () => {
    h.state.rows = [{
      id: STORY, headline: 'Same', dek: null, body: 'Body', topic: 'POLITICS', country: null, image_url: null,
      importance: 40, status: 'PUBLISHABLE',
    }];
    const res = await call('manual/[id]', 'PATCH', { status: 'PUBLISHABLE', headline: 'Same' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { data: { action: string } }).data.action).toBe('noop');
    expect(h.state.log.some((t) => /^(INSERT|UPDATE)/.test(t))).toBe(false);
  });
});

describe('expired pins force nothing', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  const o = (action: EditorialOverride['action'], pinnedUntil: string | null): EditorialOverride => ({
    storyId: `${action}-${pinnedUntil}`, action, pinnedRank: action === 'pinned' ? 1 : null, pinnedUntil,
    importanceDelta: 0, sectionOverride: null, humanLocked: false, editedHeadline: null, editedDek: null,
    editedBody: null, editedTags: null, editedImage: null, editorId: 'e', reason: null, updatedAt: '',
  });

  it('only Published and ACTIVE pins bypass the machine gate', () => {
    expect(isForceSurfaced(o('live', null), now)).toBe(true);
    expect(isForceSurfaced(o('pinned', '2026-10-01T13:00:00Z'), now)).toBe(true);
    expect(isForceSurfaced(o('pinned', '2026-10-01T11:00:00Z'), now)).toBe(false);
    expect(isForceSurfaced(o('held', null), now)).toBe(false);
    const all = [o('live', null), o('pinned', '2026-10-01T11:00:00Z')];
    expect(forcedStoryIds(new Map(all.map((x) => [x.storyId, x])), now)).toEqual([all[0].storyId]);
  });
});

describe('migration clean-up rows are never undoable', () => {
  it.each(['pin_dedupe', 'pin_normalise'])('%s', (action) => {
    const row: AuditRow = {
      id: 1, storyId: STORY, editorId: 'migration-008', action,
      before: { storyId: STORY, pinnedRank: 1 } as unknown as EditorialOverride, after: null, at: '',
    };
    expect(isUndoable(row)).toBe(false);
  });
});

describe('default knobs reproduce today’s front page', () => {
  it('half-life 16.6355 (= 24·ln2, as migration 009 writes) and velocity off', () => {
    expect(DEFAULT_KNOBS).toEqual({ recencyHalflifeH: 16.6355, sourceWeight: 1, velocityWeight: 0 });
    expect(DEFAULT_KNOBS.recencyHalflifeH).toBeCloseTo(24 * Math.LN2, 4);
  });
});

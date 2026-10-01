// F9 — manual stories: edit / unpublish / soft delete (audited, row kept), and no manual story ever
// renders internal prompt text on the reader site.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  const state = {
    rows: [] as unknown[],
    log: [] as string[],
    session: { user: { id: 'u', email: 'editor@example.org', role: 'editor' } } as unknown,
  };
  const run = (strings: TemplateStringsArray) => {
    const text = strings.join('$').replace(/\s+/g, ' ').trim();
    state.log.push(text);
    return Promise.resolve(text.startsWith('SELECT') ? state.rows : []);
  };
  const sql = Object.assign(run, {
    json: (v: unknown) => v,
    begin: async (cb: (tx: unknown) => Promise<unknown>) => cb(Object.assign(run, { json: (v: unknown) => v })),
  });
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: h.sql, sqlAnalytics: h.sql }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => h.state.session) }));
// requireRole re-reads the live role from auth.users (F7/F8 H1) — serve it from the session fixture.
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async () => {
    const u = (h.state.session as { user?: { id: string; email: string; role: string } } | null)?.user;
    return u ? { id: u.id, email: u.email, role: u.role } : null;
  }),
}));
const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: (p: string) => revalidatePath(p) }));

import { changeManualStory, ManualStoryError } from '@/lib/studio/manual-edit';
import { manualStoryCards, manualStoryDetail } from '@/lib/studio/manual-feed';

const ID = '77777777-7777-4777-8777-777777777777';

function storyRow(over: Record<string, unknown> = {}) {
  return {
    id: ID, headline: 'Parliament passes the budget', dek: 'A late-night vote.', body: 'First para.\n\nSecond para.',
    topic: 'POLITICS', country: 'IN', image_url: null, importance: 40, status: 'PUBLISHABLE',
    created_at: new Date(0).toISOString(), ...over,
  };
}

beforeEach(() => {
  h.state.rows = [];
  h.state.log = [];
  h.state.session = { user: { id: 'u', email: 'editor@example.org', role: 'editor' } };
});

describe('reader mappers never render prompt text', () => {
  it('drops a card whose headline is a brief, and blanks a prompt dek', async () => {
    h.state.rows = [
      storyRow(),
      storyRow({ id: 'x2', headline: 'Research the impact of the new tariff on exporters' }),
      storyRow({ id: 'x3', headline: 'Real headline', dek: 'Write an article about the tariff' }),
    ];
    const cards = await manualStoryCards();
    expect(cards.map((c) => c.id)).toEqual([ID, 'x3']);
    expect(cards[1].deck).toBeNull();
    expect(h.state.log[0]).toContain("status LIKE 'PUBLISHABLE%'"); // unpublished / deleted never surface
  });

  it('a story page for a brief-as-headline 404s; body paragraphs are never filtered', async () => {
    h.state.rows = [storyRow({ headline: 'Research the impact of the tariff on exporters' })];
    expect(await manualStoryDetail(ID)).toBeNull();

    const body = 'Real opening paragraph.\n\nResearch the impact of this on farmers, officials said.';
    h.state.rows = [storyRow({ body })];
    const d = await manualStoryDetail(ID);
    expect(d?.paragraphs.join(' ')).toMatch(/Real opening paragraph/);
    expect(d?.paragraphs.join(' ')).toMatch(/Research the impact of this on farmers/);
  });

  it('a real headline that merely looks imperative is still published', async () => {
    h.state.rows = [storyRow({ headline: 'Investigate whether the minister lied' })];
    expect((await manualStoryCards()).map((c) => c.title)).toEqual(['Investigate whether the minister lied']);
  });
});

describe('changeManualStory', () => {
  it('404s an unknown story and 409s a deleted one, writing nothing', async () => {
    h.state.rows = [];
    await expect(changeManualStory(ID, { headline: 'x' }, undefined, 'e')).rejects.toMatchObject({ status: 404 });
    h.state.rows = [storyRow({ status: 'DELETED' })];
    await expect(changeManualStory(ID, {}, 'PUBLISHABLE', 'e')).rejects.toBeInstanceOf(ManualStoryError);
    expect(h.state.log.some((t) => /^(UPDATE|INSERT)/.test(t))).toBe(false);
  });

  it('never hard-deletes: delete is an UPDATE to status DELETED', async () => {
    h.state.rows = [storyRow()];
    const out = await changeManualStory(ID, {}, 'DELETED', 'admin@example.org');
    expect(out).toEqual({ id: ID, status: 'DELETED', action: 'manual_delete' });
    expect(h.state.log.some((t) => t.startsWith('UPDATE rigwire.manual_stories'))).toBe(true);
    expect(h.state.log.some((t) => t.startsWith('DELETE'))).toBe(false);
  });
});

describe('PATCH /api/studio/manual/[id] validation', () => {
  async function patch(body: unknown) {
    const { PATCH } = await import('@/app/api/studio/manual/[id]/route');
    const req = new Request('http://localhost/x', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    return PATCH(req, { params: Promise.resolve({ id: ID }) });
  }

  it('an editor cannot delete through PATCH (status DELETED is not accepted)', async () => {
    const res = await patch({ status: 'DELETED' });
    expect(res.status).toBe(400);
    expect(h.state.log).toEqual([]);
  });

  it('rejects unknown fields, empty headlines and empty patches', async () => {
    expect((await patch({ editor_id: 'spoof' })).status).toBe(400);
    expect((await patch({ headline: '   ' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect(h.state.log).toEqual([]);
  });

  it('an editor can unpublish', async () => {
    h.state.rows = [storyRow()];
    const res = await patch({ status: 'UNPUBLISHED' });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { data: { status: string; action: string } };
    expect(json.data).toMatchObject({ status: 'UNPUBLISHED', action: 'manual_unpublish' });
    // the cached reader page is dropped at once, not after one more stale view
    expect(revalidatePath).toHaveBeenCalledWith(expect.stringMatching(/^\/long-read\//));
  });
});

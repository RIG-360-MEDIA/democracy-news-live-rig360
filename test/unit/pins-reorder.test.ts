// F10 — reorder/pin: exactly one rank-1 lead, pins expire, and a multi-row reorder is ONE transaction
// (a failure part-way through rolls every row back).
//
// `sql` is a small transactional fake over an in-memory editorial_overrides table: writes inside
// sql.begin are buffered and applied only if the callback resolves (COMMIT), then the one-pin-per-rank
// rule is checked like migration 008's deferred EXCLUDE constraint. A throw discards the buffer
// (ROLLBACK), exactly as Postgres would.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  interface Row {
    story_id: string;
    action: string;
    pinned_rank: number | null;
    pinned_until: string | null;
    importance_delta: number;
    section_override: string | null;
    human_locked: boolean;
    edited_headline: string | null;
    edited_dek: string | null;
    edited_body: string | null;
    edited_tags: string[] | null;
    edited_image: string | null;
    editor_id: string;
    reason: string | null;
    updated_at: string;
  }
  const state = {
    rows: new Map<string, Row>(),
    audit: [] as Array<{ storyId: unknown; action: unknown }>,
    failOnWrite: 0, // fail the Nth write statement of the next transaction (0 = never)
  };

  function checkOnePinPerRank(rows: Map<string, Row>) {
    const pinned = [...rows.values()].filter((r) => r.action === 'pinned');
    const ranks = pinned.map((r) => r.pinned_rank);
    if (new Set(ranks).size !== ranks.length) {
      throw Object.assign(new Error('violates exclusion constraint one_pin_per_rank'), { code: '23P01' });
    }
    // migration 008's CHECKs
    if (pinned.some((r) => r.pinned_rank === null || r.pinned_until === null)) {
      throw Object.assign(new Error('violates check constraint'), { code: '23514' });
    }
  }

  const begin = async (cb: (tx: unknown) => Promise<unknown>) => {
    const view = new Map([...state.rows].map(([k, v]) => [k, { ...v }]));
    const audit: typeof state.audit = [];
    let writes = 0;
    const tx = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join('$').replace(/\s+/g, ' ').trim();
      if (/^(INSERT|UPDATE|DELETE)/.test(text)) {
        writes += 1;
        if (state.failOnWrite && writes === state.failOnWrite) return Promise.reject(new Error('connection lost'));
      }
      if (text.startsWith("SELECT story_id, action, pinned_rank FROM rigwire.editorial_overrides WHERE action = 'pinned' OR story_id = ANY(")) {
        const ids = values[0] as string[];
        return Promise.resolve(
          [...view.values()]
            .filter((r) => r.action === 'pinned' || ids.includes(r.story_id))
            .map((r) => ({ story_id: r.story_id, action: r.action, pinned_rank: r.pinned_rank })),
        );
      }
      if (text.includes("WHERE action = 'pinned' AND coalesce(pinned_rank, 1) =")) {
        const [rank, self] = values as [number, string];
        return Promise.resolve(
          [...view.values()]
            .filter((r) => r.action === 'pinned' && (r.pinned_rank ?? 1) === rank && r.story_id !== self)
            .map((r) => ({ story_id: r.story_id })),
        );
      }
      if (text.startsWith('SELECT * FROM rigwire.editorial_overrides WHERE story_id =')) {
        const row = view.get(values[0] as string);
        return Promise.resolve(row ? [{ ...row }] : []);
      }
      if (text.startsWith('INSERT INTO rigwire.editorial_overrides')) {
        const [story_id, action, pinned_rank, pinned_until, importance_delta, section_override, human_locked,
          edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason] = values as [
          string, string, number | null, string | null, number, string | null, boolean,
          string | null, string | null, string | null, string[] | null, string | null, string, string | null];
        view.set(story_id, {
          story_id, action, pinned_rank, pinned_until, importance_delta, section_override, human_locked,
          edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason,
          updated_at: new Date().toISOString(),
        });
        return Promise.resolve([]);
      }
      if (text.startsWith('INSERT INTO rigwire.editorial_audit')) {
        audit.push({ storyId: values[0], action: values[2] });
        return Promise.resolve([]);
      }
      return Promise.reject(new Error(`unexpected statement: ${text}`));
    };
    const result = await cb(Object.assign(tx, { json: (v: unknown) => v })); // throw → ROLLBACK
    checkOnePinPerRank(view); // deferred constraint, checked at COMMIT
    state.rows = view;
    state.audit = [...state.audit, ...audit];
    state.failOnWrite = 0;
    return result;
  };

  const sql = Object.assign(() => Promise.reject(new Error('writes must run inside sql.begin')), { begin });
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: db.sql, sqlAnalytics: db.sql }));

import { applyOverride, killStory, pinStory } from '@/lib/studio/overrides';
import { isPinActive, MAX_REORDER, PIN_TTL_HOURS, planReorder, validateOrder } from '@/lib/studio/pins';
import { pinSetToken, ReorderConflictError, reorderTopStories } from '@/lib/studio/reorder';

const ids = {
  A: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  B: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  X: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  Y: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  Z: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
};

function pinnedRow(story_id: string, rank: number) {
  return {
    story_id, action: 'pinned', pinned_rank: rank as number | null, pinned_until: '2099-01-01T00:00:00Z' as string | null, importance_delta: 0,
    section_override: null, human_locked: false, edited_headline: null, edited_dek: null, edited_body: null,
    edited_tags: null, edited_image: null, editor_id: 'old-editor', reason: null, updated_at: new Date(0).toISOString(),
  };
}

const pins = () =>
  [...db.state.rows.values()]
    .filter((r) => r.action === 'pinned')
    .sort((a, b) => (a.pinned_rank ?? 0) - (b.pinned_rank ?? 0))
    .map((r) => [r.story_id, r.pinned_rank]);

beforeEach(() => {
  // Legacy state: X leads at rank 1, Y at rank 2 — pins with no expiry.
  db.state.rows = new Map([
    [ids.X, pinnedRow(ids.X, 1)],
    [ids.Y, pinnedRow(ids.Y, 2)],
  ]);
  db.state.audit = [];
  db.state.failOnWrite = 0;
});

describe('planReorder / validateOrder', () => {
  it('replaces the whole pin set: ranks 1..n, exactly one rank 1, stale pins dropped', () => {
    const plan = planReorder([ids.A, ids.X], [ids.X, ids.Y]);
    expect(plan.pin).toEqual([{ storyId: ids.A, rank: 1 }, { storyId: ids.X, rank: 2 }]);
    expect(plan.pin.filter((p) => p.rank === 1)).toHaveLength(1);
    expect(plan.unpin).toEqual([ids.Y]);
  });

  it('rejects empty, duplicate and oversize orders', () => {
    expect(validateOrder([])).toMatch(/at least one/);
    expect(validateOrder([ids.A, ids.A])).toMatch(/more than once/);
    expect(validateOrder(Array.from({ length: MAX_REORDER + 1 }, (_, i) => `id-${i}`))).toMatch(/at most/);
    expect(validateOrder([ids.A, ids.B])).toBeNull();
  });
});

describe('pin expiry', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  it('a pin is active until pinnedUntil, then no longer forces rank', () => {
    const o = { action: 'pinned' as const, pinnedRank: 1, pinnedUntil: '2026-10-01T13:00:00Z' };
    expect(isPinActive(o, now)).toBe(true);
    expect(isPinActive(o, Date.parse('2026-10-01T13:00:01Z'))).toBe(false);
    expect(isPinActive({ ...o, action: 'live' }, now)).toBe(false);
  });
});

describe('F10 reorder is one transaction with a single rank-1 lead', () => {
  it('commits the new order, unpins stale pins, and stamps every pin with an expiry', async () => {
    const t0 = Date.now();
    await reorderTopStories([ids.A, ids.B, ids.X], 'editor@example.org');
    expect(pins()).toEqual([[ids.A, 1], [ids.B, 2], [ids.X, 3]]);
    expect(db.state.rows.get(ids.Y)?.action).toBe('live'); // still Published, just not pinned
    for (const id of [ids.A, ids.B, ids.X]) {
      const until = Date.parse(db.state.rows.get(id)?.pinned_until ?? '');
      expect(until).toBeGreaterThanOrEqual(t0 + PIN_TTL_HOURS * 3600_000);
      expect(until).toBeLessThanOrEqual(Date.now() + PIN_TTL_HOURS * 3600_000);
    }
    expect(db.state.audit.map((a) => a.action).sort()).toEqual(['reorder', 'reorder', 'reorder', 'unpin']);
  });

  it('swapping the lead never leaves two rank-1 stories', async () => {
    await reorderTopStories([ids.Y, ids.X], 'editor@example.org');
    expect(pins()).toEqual([[ids.Y, 1], [ids.X, 2]]);
    expect(pins().filter(([, r]) => r === 1)).toHaveLength(1);
  });

  it('a failure part-way through rolls EVERY row back (no half-applied order, no audit rows)', async () => {
    const before = pins();
    db.state.failOnWrite = 5; // unpin Y (+audit), pin A (+audit), then the 5th write — pin B — fails
    await expect(reorderTopStories([ids.A, ids.B, ids.X], 'editor@example.org')).rejects.toThrow('connection lost');
    expect(pins()).toEqual(before);
    expect(db.state.rows.has(ids.A)).toBe(false);
    expect(db.state.audit).toEqual([]);
  });

  it('rejects an invalid order before touching the database', async () => {
    await expect(reorderTopStories([ids.A, ids.A], 'e')).rejects.toThrow(/more than once/);
    expect(db.state.audit).toEqual([]);
  });
});

describe('F10 single pin keeps one story per rank', () => {
  it('pinning a new lead displaces the old rank-1 story (audited as unpin) in the same transaction', async () => {
    await pinStory(ids.Z, 'editor@example.org', 1);
    expect(pins()).toEqual([[ids.Z, 1], [ids.Y, 2]]);
    expect(db.state.rows.get(ids.X)?.action).toBe('live');
    expect(db.state.audit).toEqual([
      { storyId: ids.X, action: 'unpin' },
      { storyId: ids.Z, action: 'pin' },
    ]);
  });

  it('rejects a rank outside Top Stories', async () => {
    expect(() => pinStory(ids.Z, 'e', 0)).toThrow(RangeError);
    expect(() => pinStory(ids.Z, 'e', 1.5)).toThrow(RangeError);
    expect(() => pinStory(ids.Z, 'e', MAX_REORDER + 1)).toThrow(RangeError);
  });

  it('a boost on a pinned story keeps its rank and its existing expiry', async () => {
    await pinStory(ids.Z, 'editor@example.org', 3);
    const until = db.state.rows.get(ids.Z)?.pinned_until;
    const { boostStory } = await import('@/lib/studio/overrides');
    await boostStory(ids.Z, 'editor@example.org', 5);
    expect(db.state.rows.get(ids.Z)?.pinned_rank).toBe(3);
    expect(db.state.rows.get(ids.Z)?.pinned_until).toBe(until);
  });
});

describe('F10 review — stale clients and normalisation', () => {
  const currentToken = () =>
    pinSetToken([...db.state.rows.values()].filter((r) => r.action === 'pinned'));

  it('refuses to reorder a killed story (a stale tab must never resurrect it) — nothing written', async () => {
    await killStory(ids.A, 'editor@example.org');
    db.state.audit = [];
    const before = pins();
    await expect(reorderTopStories([ids.A, ids.X], 'editor@example.org')).rejects.toBeInstanceOf(ReorderConflictError);
    expect(pins()).toEqual(before);
    expect(db.state.rows.get(ids.A)?.action).toBe('killed');
    expect(db.state.audit).toEqual([]);
  });

  it('refuses when the pin set changed since the client loaded it; accepts a current token', async () => {
    const loaded = currentToken();
    await pinStory(ids.Z, 'someone-else@example.org', 3); // another editor pins meanwhile
    await expect(reorderTopStories([ids.A, ids.X], 'editor@example.org', loaded)).rejects.toBeInstanceOf(
      ReorderConflictError,
    );
    const out = await reorderTopStories([ids.A, ids.X], 'editor@example.org', currentToken());
    expect(out.pinToken).toBe(currentToken()); // the client's token for its next reorder
    expect(pins()).toEqual([[ids.A, 1], [ids.X, 2]]);
  });

  it('a pinned write without a rank (e.g. an undo snapshot) is stored at rank 1 with an expiry', async () => {
    db.state.rows = new Map();
    await applyOverride(ids.Z, { action: 'pinned', pinnedRank: null }, 'editor@example.org', 'undo');
    expect(db.state.rows.get(ids.Z)?.pinned_rank).toBe(1);
    expect(db.state.rows.get(ids.Z)?.pinned_until).not.toBeNull();
  });

  it('a duplicate rank at COMMIT raises SQLSTATE 23P01, which the routes treat as a conflict', async () => {
    // Bypass displacement to force two pins at rank 1 — the deferred constraint rejects the COMMIT.
    const { writeOverride } = await import('@/lib/studio/overrides');
    const err = await db.sql
      .begin((tx) => writeOverride(tx as never, ids.Z, { action: 'pinned', pinnedRank: 1 }, 'e', 'pin', { displace: false }))
      .catch((e: unknown) => e);
    const { isWriteConflict } = await import('@/lib/studio/db-errors');
    expect(isWriteConflict(err)).toBe(true);
    expect(pins()).toEqual([[ids.X, 1], [ids.Y, 2]]); // rolled back
    for (const code of ['40P01', '23505', '40001']) {
      expect(isWriteConflict(Object.assign(new Error('x'), { code }))).toBe(true);
    }
    expect(isWriteConflict(Object.assign(new Error('x'), { code: '42P01' }))).toBe(false);
    expect(isWriteConflict('23P01')).toBe(false);
  });
});

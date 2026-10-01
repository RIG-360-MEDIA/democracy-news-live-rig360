// F7 — every Studio DB write lands an editorial_audit row IN THE SAME TRANSACTION as the write.
//
// `sql` is replaced by a recorder: each statement is logged with the id of the sql.begin() block it
// ran in (null = outside any transaction). For every surface declared `write: 'audited'` in
// ./studio/access-matrix.ts we drive the real route/action and assert:
//   - the domain write ran inside a transaction,
//   - an audit INSERT with the right actor/action ran in THAT SAME transaction, after the write,
//   - no write statement ran outside a transaction (except the documented best-effort one).
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACTIONS, API_ROUTES, FIXTURE_IDS } from './studio/access-matrix';

const rec = vi.hoisted(() => {
  interface Stmt {
    text: string;
    values: unknown[];
    tx: number | null;
  }
  const state = {
    log: [] as Stmt[],
    txSeq: 0,
    failAudit: false,
    rows: (_text: string): unknown[] => [],
    /** Per-statement failure injection (e.g. a unique-violation race). */
    reject: (_text: string): Error | null => null,
  };
  const exec =
    (tx: number | null) =>
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join('$').replace(/\s+/g, ' ').trim();
      state.log.push({ text, values, tx });
      if (state.failAudit && text.includes('INSERT INTO rigwire.editorial_audit')) {
        return Promise.reject(new Error('audit insert failed'));
      }
      const injected = state.reject(text);
      if (injected) return Promise.reject(injected);
      return Promise.resolve(state.rows(text));
    };
  const json = (v: unknown) => ({ json: v });
  const sql = Object.assign(exec(null), {
    json,
    begin: async (cb: (tx: unknown) => Promise<unknown>) => {
      state.txSeq += 1;
      return cb(Object.assign(exec(state.txSeq), { json }));
    },
  });
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: rec.sql, sqlAnalytics: rec.sql }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u-admin', email: 'admin@example.org', role: 'admin' } })),
  signOut: vi.fn(),
}));
// H1: requireRole re-reads the role from auth.users; this suite exercises writes, not the guard.
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async () => ({ id: 'u-admin', email: 'admin@example.org', role: 'admin' })),
}));
vi.mock('@/lib/auth/password', () => ({ hashPassword: vi.fn(async () => 'argon2-hash') }));
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock('@/lib/studio/placement', () => ({ projectPlacement: vi.fn(async () => null) }));
vi.mock('@/lib/dispatch/client', () => ({
  DispatchError: class DispatchError extends Error {},
  isDispatchLive: () => true,
  finalize: vi.fn(async () => ({
    job_id: 'job-1',
    version: 3,
    flags_summary: { red: 0, amber: 1 },
    headline: 'Door B headline',
    dek: 'Dek',
    body_markdown: 'Body',
    topic: 'POLITICS',
    country: 'IN',
    image_url: null,
    importance_suggested: 50,
  })),
  confirmPublished: vi.fn(async () => undefined),
}));

const ACTOR = 'admin@example.org';
const { STORY_ID, USER_ID, SOURCE_ID } = FIXTURE_IDS;
const NEW_ID = '55555555-5555-4555-8555-555555555555';
const OLD_PIN_ID = '66666666-6666-4666-8666-666666666666';

const MANUAL_ROW = {
  id: STORY_ID, headline: 'Hand-written', dek: null, body: 'Body text', topic: 'POLITICS', country: 'IN',
  image_url: null, importance: 40, status: 'PUBLISHABLE',
};

const OVERRIDE_SNAPSHOT = {
  storyId: STORY_ID, action: 'live', pinnedRank: null, importanceDelta: 0, sectionOverride: null,
  humanLocked: false, editedHeadline: null, editedDek: null, editedBody: null, editedTags: null,
  editedImage: null, editorId: 'someone', reason: null, updatedAt: new Date(0).toISOString(),
};

function defaultRows(text: string): unknown[] {
  if (text.includes('RETURNING id')) return [{ id: NEW_ID }];
  if (text.includes('FROM rigwire.manual_stories WHERE id =')) return [MANUAL_ROW];
  if (text.startsWith("SELECT story_id, action, pinned_rank FROM rigwire.editorial_overrides WHERE action = 'pinned'")) {
    return [{ story_id: OLD_PIN_ID, action: 'pinned', pinned_rank: 1 }];
  }
  if (text.includes('FROM auth.users WHERE id =')) return [{ email: 'target@example.org', role: 'editor' }];
  if (text.includes('FROM public.sources WHERE id =')) return [{ domain: 'example.com', political_lean: null }];
  if (text.includes('count(*)') && text.includes('FROM auth.users')) return [{ n: 1 }];
  if (text.startsWith('SELECT action, before FROM rigwire.editorial_audit')) {
    return [{ action: 'kill', before: OVERRIDE_SNAPSHOT }];
  }
  if (text.startsWith('SELECT id, story_id, editor_id, action, before, after, at FROM rigwire.editorial_audit')) {
    return [{ id: 9, story_id: STORY_ID, editor_id: 'x', action: 'kill', before: OVERRIDE_SNAPSHOT, after: null, at: new Date() }];
  }
  return [];
}

beforeEach(() => {
  rec.state.log = [];
  rec.state.txSeq = 0;
  rec.state.failAudit = false;
  rec.state.rows = defaultRows;
  rec.state.reject = () => null;
});

const isWrite = (text: string) => /^(INSERT|UPDATE|DELETE)\b/i.test(text);
const auditStmts = () => rec.state.log.filter((s) => s.text.includes('INSERT INTO rigwire.editorial_audit'));

/** The core F7 assertion: `write` and an audit row for `action` ran in the same transaction. */
function expectAuditedWrite(write: RegExp, action: string) {
  const w = rec.state.log.find((s) => write.test(s.text));
  expect(w, `expected a write matching ${write}`).toBeDefined();
  expect(w!.tx, 'write must run inside sql.begin').not.toBeNull();
  const a = auditStmts().find((s) => s.values[2] === action);
  expect(a, `expected an audit row for action '${action}'`).toBeDefined();
  expect(a!.tx).toBe(w!.tx);
  expect(rec.state.log.indexOf(a!)).toBeGreaterThan(rec.state.log.indexOf(w!));
  expect(a!.values[1]).toBe(ACTOR);
  return { storyId: a!.values[0], before: a!.values[3], after: a!.values[4] };
}

/** Writes outside a transaction — only the documented best-effort preferences insert is allowed. */
function untransactedWrites(): string[] {
  return rec.state.log
    .filter((s) => s.tx === null && isWrite(s.text) && !s.text.includes('rigwire.user_preferences'))
    .map((s) => s.text);
}

async function post(specifier: string, body: unknown, method = 'POST') {
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, (r: Request, c: unknown) => Promise<Response>>;
  const req = new Request('http://localhost/x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return mod[method](req, { params: Promise.resolve({ id: 'job-1' }) });
}

/** Drive a route handler with a specific [id] param (post() above fixes it to 'job-1'). */
async function call(specifier: string, method: string, id: string, body?: unknown) {
  const mod = (await import(/* @vite-ignore */ specifier)) as Record<string, (r: Request, c: unknown) => Promise<Response>>;
  const req = new Request('http://localhost/x', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return mod[method](req, { params: Promise.resolve({ id }) });
}

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

type Scenario = () => Promise<void>;

const OVERRIDE_KINDS: ReadonlyArray<[string, Record<string, unknown>, string]> = [
  ['publish', {}, 'publish'],
  ['unpublish', { reason: 'legal' }, 'unpublish'],
  ['unpin', {}, 'unpin'],
  ['kill', {}, 'kill'],
  ['revive', {}, 'revive'],
  ['pin', { rank: 2 }, 'pin'],
  ['boost', { delta: 5 }, 'boost'],
  ['lock', { locked: true }, 'lock'],
];

const SCENARIOS: Record<string, Scenario> = {
  'POST /api/studio/override': async () => {
    for (const [kind, extra, action] of OVERRIDE_KINDS) {
      rec.state.log = [];
      const res = await post('@/app/api/studio/override/route', { storyId: STORY_ID, kind, ...extra });
      expect(res.status).toBe(200);
      const a = expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, action);
      expect(a.storyId).toBe(STORY_ID);
    }
  },
  'POST /api/studio/edit': async () => {
    const res = await post('@/app/api/studio/edit/route', { storyId: STORY_ID, headline: 'New headline' });
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, 'edit');
    expect((a.after as { json: { editedHeadline: string } }).json.editedHeadline).toBe('New headline');
  },
  'POST /api/studio/audit': async () => {
    const res = await post('@/app/api/studio/audit/route', { id: 9 });
    expect(res.status).toBe(200);
    expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, 'undo');
  },
  'POST /api/studio/create': async () => {
    const res = await post('@/app/api/studio/create/route', { headline: 'Hand-written', body: 'Body text' });
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^INSERT INTO rigwire\.manual_stories/, 'manual_create');
    expect(a.storyId).toBe(NEW_ID);
    expect(a.before).toBeNull();
    // L2: the ledger records the body's length + sha256, not the full text.
    const after = (a.after as { json: Record<string, unknown> }).json;
    expect(after.body).toBeUndefined();
    expect(after.bodyLength).toBe('Body text'.length);
    expect(after.bodySha256).toMatch(/^[0-9a-f]{64}$/);
    expect(after.headline).toBe('Hand-written');
  },
  'PATCH /api/studio/manual/[id]': async () => {
    const res = await call('@/app/api/studio/manual/[id]/route', 'PATCH', STORY_ID, { headline: 'Better headline' });
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^UPDATE rigwire\.manual_stories/, 'manual_edit');
    expect(a.storyId).toBe(STORY_ID);
    expect((a.before as { json: Record<string, unknown> }).json.headline).toBe('Hand-written');
    expect((a.after as { json: Record<string, unknown> }).json.headline).toBe('Better headline');
    // L2: the body is fingerprinted, never copied into the ledger.
    expect(JSON.stringify(a.before)).not.toContain('Body text');
    expect((a.after as { json: Record<string, unknown> }).json.bodyLength).toBe('Body text'.length);

    rec.state.log = [];
    const un = await call('@/app/api/studio/manual/[id]/route', 'PATCH', STORY_ID, { status: 'UNPUBLISHED' });
    expect(un.status).toBe(200);
    const u = expectAuditedWrite(/^UPDATE rigwire\.manual_stories/, 'manual_unpublish');
    expect((u.after as { json: Record<string, unknown> }).json.status).toBe('UNPUBLISHED');
  },
  'DELETE /api/studio/manual/[id]': async () => {
    const res = await call('@/app/api/studio/manual/[id]/route', 'DELETE', STORY_ID);
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^UPDATE rigwire\.manual_stories/, 'manual_delete');
    expect((a.after as { json: Record<string, unknown> }).json.status).toBe('DELETED');
    // Soft delete: the row is kept.
    expect(rec.state.log.some((s) => /^DELETE/i.test(s.text))).toBe(false);
  },
  'POST /api/studio/reorder': async () => {
    const res = await post('@/app/api/studio/reorder/route', { order: [NEW_ID, STORY_ID] });
    expect(res.status).toBe(200);
    expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, 'unpin');
    expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, 'reorder');
    // Every write of the reorder — the unpin and both pins — ran in ONE transaction.
    const txs = new Set(rec.state.log.filter((s) => isWrite(s.text)).map((s) => s.tx));
    expect([...txs]).toEqual([1]);
  },
  'POST /api/studio/draft/[id]/publish': async () => {
    const res = await post('@/app/api/studio/draft/[id]/publish/route', {});
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^INSERT INTO rigwire\.manual_stories/, 'doorb_publish');
    expect(a.storyId).toBe(NEW_ID);
    expect((a.after as { json: Record<string, unknown> }).json).toEqual({
      job_id: 'job-1', version: 3, flags_summary: { red: 0, amber: 1 },
    });
  },
  'POST /api/studio/weights': async () => {
    const res = await post('@/app/api/studio/weights/route', { topicWeights: { POLITICS: 1.4 } });
    expect(res.status).toBe(200);
    const a = expectAuditedWrite(/^INSERT INTO rigwire\.ranking_weights/, 'weights_update');
    expect(a.storyId).toBeNull();
    expect((a.after as { json: Record<string, unknown> }).json).toMatchObject({
      target: 'ranking_weights',
      topicWeights: { POLITICS: 1.4 },
    });
  },
  'studio/sources/actions.ts#updateSourceLean': async () => {
    const { updateSourceLean } = await import('@/app/studio/sources/actions');
    await updateSourceLean(SOURCE_ID, 'center');
    const a = expectAuditedWrite(/^UPDATE public\.sources SET political_lean/, 'source_lean');
    expect((a.before as { json: unknown }).json).toEqual({ target: `source:${SOURCE_ID}`, domain: 'example.com', lean: null });
    expect((a.after as { json: unknown }).json).toEqual({ target: `source:${SOURCE_ID}`, domain: 'example.com', lean: 'center' });
  },
  'studio/story/[id]/actions.ts#revert': async () => {
    const { revert } = await import('@/app/studio/story/[id]/actions');
    expect(await revert(STORY_ID, 9)).toEqual({ ok: true });
    expectAuditedWrite(/^INSERT INTO rigwire\.editorial_overrides/, 'revert');
  },
  'studio/admin/users/actions.ts#createUserAction': async () => {
    const { createUserAction } = await import('@/app/studio/admin/users/actions');
    const out = await createUserAction(null, form({ email: 'new@example.org', role: 'editor' }));
    expect(out?.ok).toBe(true);
    const a = expectAuditedWrite(/^INSERT INTO auth\.users/, 'user_create');
    expect((a.after as { json: Record<string, unknown> }).json).toEqual({
      target: `user:${NEW_ID}`, email: 'new@example.org', displayName: null, role: 'editor',
    });
    // The set-password link it issues is its own audited write.
    expectAuditedWrite(/^INSERT INTO auth\.password_reset_tokens/, 'user_reset_link');
  },
  'studio/admin/users/actions.ts#resetLinkAction': async () => {
    const { resetLinkAction } = await import('@/app/studio/admin/users/actions');
    const out = await resetLinkAction(null, form({ userId: USER_ID, email: 'someone@example.org' }));
    expect(out?.ok).toBe(true);
    const a = expectAuditedWrite(/^INSERT INTO auth\.password_reset_tokens/, 'user_reset_link');
    // The raw token must never reach the audit ledger.
    const link = out && out.ok ? out.link : '';
    const token = decodeURIComponent(link.split('token=')[1] ?? '');
    expect(token.length).toBeGreaterThan(20);
    expect(JSON.stringify(a.after)).not.toContain(token);
  },
  'studio/admin/users/actions.ts#setRoleAction': async () => {
    const { setRoleAction } = await import('@/app/studio/admin/users/actions');
    await setRoleAction(form({ userId: USER_ID, email: 'target@example.org', role: 'admin' }));
    const a = expectAuditedWrite(/^UPDATE auth\.users SET role/, 'user_role');
    expect((a.before as { json: unknown }).json).toEqual({ target: `user:${USER_ID}`, email: 'target@example.org', role: 'editor' });
    expect((a.after as { json: unknown }).json).toEqual({ target: `user:${USER_ID}`, email: 'target@example.org', role: 'admin' });
  },
};

const auditedKeys = [
  ...Object.entries(API_ROUTES).flatMap(([path, methods]) =>
    Object.entries(methods ?? {})
      .filter(([, rule]) => rule?.write === 'audited')
      .map(([method]) => `${method} ${path}`),
  ),
  ...Object.entries(ACTIONS)
    .filter(([, rule]) => rule.write === 'audited')
    .map(([key]) => key),
].sort();

describe('F7 — every audited Studio write has an audit scenario', () => {
  it('scenarios cover exactly the surfaces declared write: audited', () => {
    expect(Object.keys(SCENARIOS).sort()).toEqual(auditedKeys);
  });
});

describe.each(auditedKeys)('F7 audit in the same transaction: %s', (key) => {
  it('writes the audit row in the write’s transaction, and nothing outside one', async () => {
    await SCENARIOS[key]();
    expect(untransactedWrites()).toEqual([]);
  });
});

describe('F7 — a failed audit insert fails the write (no silent un-audited change)', () => {
  it('weights: the route reports failure when the audit insert fails', async () => {
    rec.state.failAudit = true;
    const res = await post('@/app/api/studio/weights/route', { sourceWeight: 2 });
    expect(res.status).toBe(500);
  });

  it('overrides: the route reports failure when the audit insert fails', async () => {
    rec.state.failAudit = true;
    const res = await post('@/app/api/studio/override/route', { storyId: STORY_ID, kind: 'kill' });
    expect(res.status).toBe(500);
  });

  it('source lean: the action throws when the audit insert fails', async () => {
    rec.state.failAudit = true;
    const { updateSourceLean } = await import('@/app/studio/sources/actions');
    await expect(updateSourceLean(SOURCE_ID, 'left')).rejects.toThrow(/audit insert failed/);
  });
});

describe('F7 — guarded no-op writes leave no audit row', () => {
  it('an admin cannot demote themselves (checked against the DB row, not the form)', async () => {
    rec.state.rows = (text) =>
      text.includes('FROM auth.users WHERE id =') ? [{ email: ACTOR, role: 'admin' }] : defaultRows(text);
    const { setRoleAction } = await import('@/app/studio/admin/users/actions');
    await setRoleAction(form({ userId: USER_ID, email: 'spoofed@example.org', role: 'reader' }));
    expect(rec.state.log.some((s) => s.text.startsWith('UPDATE auth.users'))).toBe(false);
    expect(auditStmts()).toEqual([]);
  });

  it('an unknown source is refused before any write', async () => {
    rec.state.rows = (text) => (text.includes('FROM public.sources') ? [] : defaultRows(text));
    const { updateSourceLean } = await import('@/app/studio/sources/actions');
    await expect(updateSourceLean(SOURCE_ID, 'left')).rejects.toThrow(/Source not found/);
    expect(auditStmts()).toEqual([]);
  });

  it('an invalid lean is rejected by validation', async () => {
    const { updateSourceLean } = await import('@/app/studio/sources/actions');
    await expect(updateSourceLean(SOURCE_ID, 'far-out')).rejects.toThrow(/Invalid/);
    expect(rec.state.log).toEqual([]);
  });

  it('a Door B re-publish of an already-published job writes nothing new', async () => {
    rec.state.rows = (text) =>
      text.includes('WHERE draft_job_id =') ? [{ id: NEW_ID }] : defaultRows(text);
    const res = await post('@/app/api/studio/draft/[id]/publish/route', {});
    expect(res.status).toBe(200);
    expect(rec.state.log.filter((s) => isWrite(s.text))).toEqual([]);
  });
});

describe('M1 — the last admin can never be demoted', () => {
  const OTHER_ADMIN = 'other.admin@example.org';
  const adminTarget = (remaining: number) => (text: string) => {
    if (text.includes('FROM auth.users WHERE id =')) return [{ email: OTHER_ADMIN, role: 'admin' }];
    if (text.includes('count(*)') && text.includes('FROM auth.users')) return [{ n: remaining }];
    return defaultRows(text);
  };

  it('refuses a demotion that would leave zero admins: no UPDATE, no audit row', async () => {
    rec.state.rows = adminTarget(0);
    const { setRole } = await import('@/lib/studio/users');
    expect(await setRole(USER_ID, 'editor', ACTOR)).toBe('last_admin');
    expect(rec.state.log.some((s) => s.text.startsWith('UPDATE auth.users'))).toBe(false);
    expect(auditStmts()).toEqual([]);
  });

  it('serialises demotions: the lock is taken in the transaction before the admin count', async () => {
    rec.state.rows = adminTarget(0);
    const { setRole } = await import('@/lib/studio/users');
    await setRole(USER_ID, 'reader', ACTOR);
    const lock = rec.state.log.find((s) => s.text.includes('pg_advisory_xact_lock'));
    const count = rec.state.log.find((s) => s.text.includes('count(*)'));
    expect(lock).toBeDefined();
    expect(count).toBeDefined();
    expect(lock!.tx).not.toBeNull();
    expect(lock!.tx).toBe(count!.tx);
    expect(rec.state.log.indexOf(lock!)).toBeLessThan(rec.state.log.indexOf(count!));
  });

  it('allows the demotion when another admin remains', async () => {
    rec.state.rows = adminTarget(1);
    const { setRole } = await import('@/lib/studio/users');
    expect(await setRole(USER_ID, 'editor', ACTOR)).toBe('ok');
    expectAuditedWrite(/^UPDATE auth\.users SET role/, 'user_role');
  });

  it('the setRoleAction path refuses too (no audit row)', async () => {
    rec.state.rows = adminTarget(0);
    const { setRoleAction } = await import('@/app/studio/admin/users/actions');
    await setRoleAction(form({ userId: USER_ID, email: OTHER_ADMIN, role: 'editor' }));
    expect(auditStmts()).toEqual([]);
  });
});

describe('M3 — user admin actions never throw and never echo caller input', () => {
  it('reset link for an unknown user: refused, no token, no audit row', async () => {
    rec.state.rows = (text) => (text.includes('FROM auth.users WHERE id =') ? [] : defaultRows(text));
    const { resetLinkAction } = await import('@/app/studio/admin/users/actions');
    const out = await resetLinkAction(null, form({ userId: USER_ID, email: 'whoever@example.org' }));
    expect(out?.ok).toBe(false);
    expect(rec.state.log.some((s) => s.text.includes('INSERT INTO auth.password_reset_tokens'))).toBe(false);
    expect(auditStmts()).toEqual([]);
  });

  it('reset link message names the DB email, not the form-supplied one', async () => {
    const { resetLinkAction } = await import('@/app/studio/admin/users/actions');
    const out = await resetLinkAction(null, form({ userId: USER_ID, email: '<b>spoofed@evil.example</b>' }));
    expect(out?.ok).toBe(true);
    const message = out && out.ok ? out.message : '';
    expect(message).toContain('target@example.org');
    expect(message).not.toContain('spoofed');
  });

  it('reset link: a DB failure becomes a friendly error, not a throw', async () => {
    rec.state.reject = (text) => (text.includes('password_reset_tokens') ? new Error('connection reset') : null);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { resetLinkAction } = await import('@/app/studio/admin/users/actions');
    const out = await resetLinkAction(null, form({ userId: USER_ID }));
    spy.mockRestore();
    expect(out).toEqual({ ok: false, error: expect.any(String) });
    expect(JSON.stringify(out)).not.toContain('connection reset');
  });

  it('create: a unique-violation race is reported, not thrown', async () => {
    rec.state.reject = (text) =>
      text.startsWith('INSERT INTO auth.users')
        ? Object.assign(new Error('duplicate key value violates unique constraint "users_email_unique_idx"'), {
            code: '23505',
          })
        : null;
    const { createUserAction } = await import('@/app/studio/admin/users/actions');
    const out = await createUserAction(null, form({ email: 'race@example.org', role: 'editor' }));
    expect(out).toEqual({ ok: false, error: 'An account with that email already exists.' });
  });

  it('create: any other DB failure becomes a friendly error', async () => {
    rec.state.reject = (text) => (text.startsWith('INSERT INTO auth.users') ? new Error('disk full') : null);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { createUserAction } = await import('@/app/studio/admin/users/actions');
    const out = await createUserAction(null, form({ email: 'new2@example.org', role: 'editor' }));
    spy.mockRestore();
    expect(out?.ok).toBe(false);
    expect(JSON.stringify(out)).not.toContain('disk full');
  });
});

describe('L3 — history/revert validate input and only revert override rows', () => {
  it('revert refuses a non-uuid story id without touching the DB', async () => {
    const { revert } = await import('@/app/studio/story/[id]/actions');
    const out = await revert("x' OR 1=1 --", 9);
    expect(out.ok).toBe(false);
    expect(rec.state.log).toEqual([]);
  });

  it('revert refuses a non-integer audit id without touching the DB', async () => {
    const { revert } = await import('@/app/studio/story/[id]/actions');
    const out = await revert(STORY_ID, 1.5);
    expect(out.ok).toBe(false);
    expect(rec.state.log).toEqual([]);
  });

  it.each(['manual_create', 'doorb_publish', 'user_role'])('revert refuses a %s row (not an override)', async (action) => {
    rec.state.rows = (text) =>
      text.startsWith('SELECT action, before FROM rigwire.editorial_audit') ? [{ action, before: null }] : defaultRows(text);
    const { revert } = await import('@/app/studio/story/[id]/actions');
    const out = await revert(STORY_ID, 9);
    expect(out.ok).toBe(false);
    expect(rec.state.log.filter((s) => isWrite(s.text))).toEqual([]);
  });

  it('loadHistory rejects a non-uuid story id without touching the DB', async () => {
    const { loadHistory } = await import('@/app/studio/story/[id]/actions');
    await expect(loadHistory('not-a-uuid')).rejects.toThrow(/Invalid story id/);
    expect(rec.state.log).toEqual([]);
  });
});

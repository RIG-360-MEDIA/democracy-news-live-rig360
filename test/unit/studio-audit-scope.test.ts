// M2 — editors see the newsroom ledger, not admin configuration history. For a non-admin caller the
// audit listing excludes user management, source lean and ranking-weight rows (both the JSON API and
// the /studio/audit page). Story-scoped rows — overrides, manual_create, doorb_publish — stay visible.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => {
  interface Call {
    text: string;
    values: unknown[];
  }
  const state = { calls: [] as Call[], role: 'editor' };
  // Every call (statement or nested fragment) is recorded; the returned promise carries its own
  // text/values so the outer statement's values can be inspected.
  const sql = Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
      const call = { text: strings.join('$').replace(/\s+/g, ' ').trim(), values };
      state.calls.push(call);
      return Object.assign(Promise.resolve([]), call);
    }),
    { begin: vi.fn(), json: vi.fn() },
  );
  return { state, sql };
});

vi.mock('@/lib/db', () => ({ sql: h.sql, sqlAnalytics: h.sql }));
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => ({ user: { id: 'u', email: `${h.state.role}@example.org`, role: h.state.role } })),
}));
vi.mock('@/lib/studio/current-user', () => ({
  loadCurrentUser: vi.fn(async () => ({ id: 'u', email: `${h.state.role}@example.org`, role: h.state.role })),
}));

import { ADMIN_SCOPE_AUDIT_ACTIONS } from '@/lib/studio/audit-log';

const HIDDEN_FROM_EDITORS = ['user_create', 'user_role', 'user_reset_link', 'source_lean', 'weights_update'];

/** The values bound to the scope fragment, or null when the listing is unscoped. */
function scopeExclusion(): unknown[] | null {
  const frag = h.state.calls.find((c) => /action <> ALL\(\$\)/.test(c.text));
  return frag ? (frag.values[0] as unknown[]) : null;
}

beforeEach(() => {
  h.state.calls = [];
});

describe('M2 — admin-scope audit actions', () => {
  it('are exactly the configuration actions (manual_create and story actions stay visible)', () => {
    expect([...ADMIN_SCOPE_AUDIT_ACTIONS].sort()).toEqual([...HIDDEN_FROM_EDITORS].sort());
    expect(ADMIN_SCOPE_AUDIT_ACTIONS).not.toContain('manual_create');
    expect(ADMIN_SCOPE_AUDIT_ACTIONS).not.toContain('doorb_publish');
  });
});

describe.each([
  ['editor', true],
  ['admin', false],
] as const)('M2 — GET /api/studio/audit as %s', (role, excluded) => {
  it(excluded ? 'excludes config rows' : 'sees everything', async () => {
    h.state.role = role;
    const { GET } = await import('@/app/api/studio/audit/route');
    const res = await GET(new Request('http://localhost/api/studio/audit'));
    expect(res.status).toBe(200);
    const exclusion = scopeExclusion();
    if (excluded) expect([...(exclusion ?? [])].sort()).toEqual([...HIDDEN_FROM_EDITORS].sort());
    else expect(exclusion).toBeNull();
  });

  it(excluded ? 'still excludes config rows when filtering by a config action' : 'can filter by a config action', async () => {
    h.state.role = role;
    const { GET } = await import('@/app/api/studio/audit/route');
    const res = await GET(new Request('http://localhost/api/studio/audit?action=user_role'));
    expect(res.status).toBe(200);
    expect(scopeExclusion() !== null).toBe(excluded);
  });
});

describe.each([
  ['editor', true],
  ['admin', false],
] as const)('M2 — /studio/audit page as %s', (role, excluded) => {
  it(excluded ? 'excludes config rows' : 'sees everything', async () => {
    h.state.role = role;
    const { default: AuditPage } = await import('@/app/studio/audit/page');
    await AuditPage();
    const exclusion = scopeExclusion();
    if (excluded) expect([...(exclusion ?? [])].sort()).toEqual([...HIDDEN_FROM_EDITORS].sort());
    else expect(exclusion).toBeNull();
  });
});

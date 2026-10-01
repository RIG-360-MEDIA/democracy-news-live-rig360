// F8 — the declared Studio access policy. THE list every Studio surface must appear in.
//
// studio-role-matrix.test.ts discovers routes, pages/layouts and server actions from the filesystem
// and fails when one is missing here (or listed here but gone), so a new surface can't ship without
// a deliberate role decision. studio-audit-writes.test.ts requires an audit scenario for every entry
// marked `write: 'audited'`.
//
//   editor — newsroom work; satisfied by editor OR admin.
//   admin  — feed-wide configuration (sources, weights/sections, /studio/admin/*).
//   public — no Studio role needed (sign-out only).
//
// `write`:
//   audited — writes our DB; must write an editorial_audit row in the same transaction.
//   remote  — writes happen on the generation box (Draftsmith), which stamps X-Editor-Id itself;
//             nothing is written to our DB by this route.

export type Required = 'editor' | 'admin';
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type WriteKind = 'audited' | 'remote';

export interface RouteRule {
  role: Required;
  write?: WriteKind;
}

export const API_ROUTES: Record<string, Partial<Record<Method, RouteRule>>> = {
  '/api/studio/audit': { GET: { role: 'editor' }, POST: { role: 'editor', write: 'audited' } },
  '/api/studio/create': { POST: { role: 'editor', write: 'audited' } },
  '/api/studio/draft': { GET: { role: 'editor' }, POST: { role: 'editor', write: 'remote' } },
  '/api/studio/draft/[id]': { GET: { role: 'editor' }, PATCH: { role: 'editor', write: 'remote' } },
  '/api/studio/draft/[id]/flag': { POST: { role: 'editor', write: 'remote' } },
  '/api/studio/draft/[id]/publish': { POST: { role: 'editor', write: 'audited' } },
  '/api/studio/edit': { POST: { role: 'editor', write: 'audited' } },
  '/api/studio/embeds/search': { GET: { role: 'editor' } },
  // F9 — edit / unpublish is newsroom work; delete (soft) is admin-only.
  '/api/studio/manual/[id]': {
    PATCH: { role: 'editor', write: 'audited' },
    DELETE: { role: 'admin', write: 'audited' },
  },
  '/api/studio/generate-cluster': { POST: { role: 'editor', write: 'remote' } },
  '/api/studio/media/cluster': { GET: { role: 'editor' } },
  '/api/studio/media/search': { GET: { role: 'editor' } },
  '/api/studio/override': { POST: { role: 'editor', write: 'audited' } },
  '/api/studio/reorder': { POST: { role: 'editor', write: 'audited' } },
  '/api/studio/weights': { GET: { role: 'admin' }, POST: { role: 'admin', write: 'audited' } },
};

/** Server pages and layouts (key = URL path; layouts suffixed with " (layout)"). */
export const PAGES: Record<string, Required> = {
  '/studio (layout)': 'editor',
  '/studio': 'editor',
  '/studio/admin': 'admin',
  '/studio/admin/users': 'admin',
  '/studio/audit': 'editor',
  '/studio/create': 'editor',
  '/studio/draft/[id]': 'editor',
  '/studio/lens/[id]': 'editor',
  '/studio/merges': 'editor',
  '/studio/queue': 'editor',
  '/studio/ranking': 'admin',
  '/studio/sections': 'admin',
  '/studio/sources': 'admin',
  '/studio/story/[id]': 'editor',
  '/curate': 'editor',
};

export interface ActionRule {
  role: Required | 'public';
  write?: WriteKind;
  /** Valid arguments, so an allowed caller gets past input validation and reaches the DB. */
  args: () => unknown[];
}

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_ID = '22222222-2222-4222-8222-222222222222';
const STORY_ID = '33333333-3333-4333-8333-333333333333';

function form(fields: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
}

/** Server actions (key = "<file under src/app>#<export>"). */
export const ACTIONS: Record<string, ActionRule> = {
  'studio/admin/users/actions.ts#createUserAction': {
    role: 'admin',
    write: 'audited',
    args: () => [null, form({ email: 'new.editor@example.org', role: 'editor', displayName: 'New Editor' })],
  },
  'studio/admin/users/actions.ts#resetLinkAction': {
    role: 'admin',
    write: 'audited',
    args: () => [null, form({ userId: USER_ID, email: 'someone@example.org' })],
  },
  'studio/admin/users/actions.ts#setRoleAction': {
    role: 'admin',
    write: 'audited',
    args: () => [form({ userId: USER_ID, email: 'someone@example.org', role: 'editor' })],
  },
  'studio/signout-action.ts#signOutAction': { role: 'public', args: () => [] },
  'studio/sources/actions.ts#updateSourceLean': {
    role: 'admin',
    write: 'audited',
    args: () => [SOURCE_ID, 'center'],
  },
  'studio/story/[id]/actions.ts#loadHistory': { role: 'editor', args: () => [STORY_ID] },
  'studio/story/[id]/actions.ts#revert': { role: 'editor', write: 'audited', args: () => [STORY_ID, 7] },
};

export const FIXTURE_IDS = { USER_ID, SOURCE_ID, STORY_ID } as const;

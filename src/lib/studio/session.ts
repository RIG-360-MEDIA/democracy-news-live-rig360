// Editorial CMS — editor identity + THE authorization guard (epic 002, E7; F8 roles).
//
// requireRole() is the single role check for every Studio surface: API routes, pages and server
// actions all go through it (directly for actions, or via the thin guardApi/guardPage adapters in
// ./guard.ts). It distinguishes 401 (not signed in) from 403 (signed in, insufficient role) so API
// routes and pages can respond correctly per .claude/rules/api-conventions.md.
//
//   'editor' — newsroom work (desk, queue, stories, drafts, merges, manual stories, audit).
//              Satisfied by role editor OR admin.
//   'admin'  — feed-wide configuration (sources, weights/sections, /studio/admin/*). Admin only.
//   reader   — never satisfies either; a signed-in reader gets 403 everywhere in the Studio.
//
// H1 — the role is the one in auth.users NOW, not the JWT claim: the session only identifies the
// user (token subject); loadCurrentUser() re-reads the row on every guarded call (memoised per
// request). A demotion bites on the next request, a deleted account is treated as signed out (401),
// and a promotion needs no re-login. The edge middleware's JWT role check is only a backstop.
//
// The full route → role policy is enforced by test/unit/studio-role-matrix.test.ts, which fails
// when a new Studio route/page/action is added without a declared role.

import { auth } from '@/lib/auth';
import { isAdmin, isEditor } from '@/lib/auth/roles';

import { loadCurrentUser } from './current-user';

export type StudioRole = 'editor' | 'admin';

export interface EditorIdentity {
  /** Stable id used for audit/display — the account's current email. */
  id: string;
  role: string;
  isAdmin: boolean;
}

export type EditorGuard =
  | { ok: true; editor: EditorIdentity }
  | { ok: false; status: 401 | 403 };

function satisfies(required: StudioRole, role: string | null | undefined): boolean {
  return required === 'admin' ? isAdmin(role) : isEditor(role);
}

/** The DEV-ONLY local bypass. INERT in production (Vercel sets NODE_ENV=production); pinned by
 *  test/unit/studio-session.test.ts. NEVER set CMS_DEV_EDITOR in any deployed environment. */
function devBypassActive(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.CMS_DEV_EDITOR === '1';
}

/** Resolve the signed-in user and check they CURRENTLY hold `required` (or better). */
export async function requireRole(required: StudioRole): Promise<EditorGuard> {
  if (devBypassActive()) {
    return { ok: true, editor: { id: 'dev@local', role: 'admin', isAdmin: true } };
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, status: 401 };
  const current = await loadCurrentUser(userId);
  if (!current) return { ok: false, status: 401 };
  if (!satisfies(required, current.role)) return { ok: false, status: 403 };
  return {
    ok: true,
    editor: { id: current.email, role: current.role, isAdmin: isAdmin(current.role) },
  };
}

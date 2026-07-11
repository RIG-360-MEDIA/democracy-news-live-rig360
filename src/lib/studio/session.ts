// Editorial CMS — editor identity + authorization guard (epic 002, E7).
//
// The portal is auth-gated AND role-gated: a signed-in *reader* is not an editor.
// currentEditor() returns an identity only for editor/admin roles; the guards
// distinguish 401 (not signed in) from 403 (signed in, wrong role) so API routes
// and the layout can respond correctly per .claude/rules/api-conventions.md.

import { auth } from '@/lib/auth';
import { isAdmin, isEditor } from '@/lib/auth/roles';

export interface EditorIdentity {
  /** Stable id used for audit/display — email, falling back to name, then user id. */
  id: string;
  role: string;
  isAdmin: boolean;
}

export type EditorGuard =
  | { ok: true; editor: EditorIdentity }
  | { ok: false; status: 401 | 403 };

/** Resolve the current editor, or a 401/403 reason. Editor = role editor|admin. */
export async function requireEditor(): Promise<EditorGuard> {
  const session = await auth();
  const u = session?.user;
  if (!u) return { ok: false, status: 401 };
  if (!isEditor(u.role)) return { ok: false, status: 403 };
  return {
    ok: true,
    editor: { id: u.email ?? u.name ?? u.id, role: u.role, isAdmin: isAdmin(u.role) },
  };
}

/** Like requireEditor, but requires the admin role (feed-wide configuration). */
export async function requireAdmin(): Promise<EditorGuard> {
  const guard = await requireEditor();
  if (!guard.ok) return guard;
  if (!guard.editor.isAdmin) return { ok: false, status: 403 };
  return guard;
}

/** The signed-in editor's id for audit/display, or null if the caller is not an editor. */
export async function currentEditor(): Promise<string | null> {
  const guard = await requireEditor();
  return guard.ok ? guard.editor.id : null;
}

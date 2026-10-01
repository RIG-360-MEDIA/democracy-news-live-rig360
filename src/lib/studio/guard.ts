// Editorial CMS — transport adapters over requireRole() (F8 roles).
//
// These add NO policy of their own: they call requireRole() and translate its 401/403 into the
// response shape each surface needs.
//   guardApi(role)  — API routes: the standard { ok, data, error } envelope with 401 / 403.
//   guardPage(role) — server pages: redirect (401 → /signin, 403 → the most useful landing).
// Server actions call requireRole() directly and map the failure onto their own return type.

import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';

import { requireRole, type EditorIdentity, type StudioRole } from './session';

export type ApiGuard =
  | { ok: true; editor: EditorIdentity }
  | { ok: false; response: NextResponse };

const FORBIDDEN_MESSAGE: Record<StudioRole, string> = {
  editor: 'Editor access required',
  admin: 'Admin access required',
};

/** Envelope for a failed guard — shared so every Studio route speaks the same 401/403. */
export function guardFailure(status: 401 | 403, role: StudioRole): NextResponse {
  const message = status === 401 ? 'Not authenticated' : FORBIDDEN_MESSAGE[role];
  return NextResponse.json({ ok: false, data: null, error: { code: String(status), message } }, { status });
}

/** API-route guard: the caller returns `response` verbatim when `ok` is false. */
export async function guardApi(role: StudioRole): Promise<ApiGuard> {
  const guard = await requireRole(role);
  if (guard.ok) return guard;
  return { ok: false, response: guardFailure(guard.status, role) };
}

/** Page guard: returns the editor, or redirects (never returns) when the role is not held.
 *  An editor bounced off an admin page lands on the newsroom; a reader goes to the site home. */
export async function guardPage(role: StudioRole): Promise<EditorIdentity> {
  const guard = await requireRole(role);
  if (guard.ok) return guard.editor;
  if (guard.status === 401) redirect('/signin');
  const isEditor = role === 'admin' && (await requireRole('editor')).ok;
  redirect(isEditor ? '/studio' : '/');
}

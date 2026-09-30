'use server';

// Admin user-management actions (P07 S07.01.05). Every action re-checks requireAdmin() — server
// actions are public endpoints and must never trust the page that rendered the form.
import { revalidatePath } from 'next/cache';

import { BRAND } from '@/lib/brand';
import { createResetToken } from '@/lib/auth/reset-tokens';
import { requireAdmin } from '@/lib/studio/session';
import { createUser, emailTaken, normaliseEmail, ROLES, setRole, type Role } from '@/lib/studio/users';

export type LinkState = { ok: true; message: string; link: string } | { ok: false; error: string } | null;

function linkFor(token: string): string {
  return `${BRAND.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function parseRole(v: FormDataEntryValue | null): Role | null {
  return ROLES.includes(String(v) as Role) ? (String(v) as Role) : null;
}

export async function createUserAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: 'Admin access required.' };
  const email = normaliseEmail(String(form.get('email') ?? ''));
  const role = parseRole(form.get('role'));
  const name = String(form.get('displayName') ?? '').trim().slice(0, 120) || null;
  if (!email) return { ok: false, error: 'Enter a valid email address.' };
  if (!role) return { ok: false, error: 'Choose a role.' };
  if (await emailTaken(email)) return { ok: false, error: 'An account with that email already exists.' };
  const userId = await createUser(email, name, role);
  const token = await createResetToken(userId);
  console.info('[admin-users] created', { by: guard.editor.id, email, role });
  revalidatePath('/studio/admin/users');
  return { ok: true, message: `Account created for ${email}. Send them this one-time link to set a password (valid 72 h):`, link: linkFor(token) };
}

export async function resetLinkAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  const guard = await requireAdmin();
  if (!guard.ok) return { ok: false, error: 'Admin access required.' };
  const userId = String(form.get('userId') ?? '');
  const email = String(form.get('email') ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { ok: false, error: 'Unknown user.' };
  const token = await createResetToken(userId);
  console.info('[admin-users] reset link', { by: guard.editor.id, userId });
  return { ok: true, message: `One-time password link for ${email} (valid 72 h; any older link is revoked):`, link: linkFor(token) };
}

export async function setRoleAction(form: FormData): Promise<void> {
  const guard = await requireAdmin();
  if (!guard.ok) return;
  const userId = String(form.get('userId') ?? '');
  const email = String(form.get('email') ?? '');
  const role = parseRole(form.get('role'));
  if (!role || !/^[0-9a-f-]{36}$/i.test(userId)) return;
  // Lockout guard: an admin can't demote themselves.
  if (email.toLowerCase() === guard.editor.id.toLowerCase() && role !== 'admin') return;
  await setRole(userId, role);
  console.info('[admin-users] role', { by: guard.editor.id, userId, role });
  revalidatePath('/studio/admin/users');
}

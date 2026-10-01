'use server';

// Admin user-management actions (P07 S07.01.05). Every action re-checks requireRole('admin') — server
// actions are public endpoints and must never trust the page that rendered the form. Every write is
// audited atomically by the data layer (users.ts / reset-tokens.ts).
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { BRAND } from '@/lib/brand';
import { createResetToken } from '@/lib/auth/reset-tokens';
import { requireRole } from '@/lib/studio/session';
import { createUser, emailTaken, normaliseEmail, ROLES, setRole, type Role } from '@/lib/studio/users';

export type LinkState = { ok: true; message: string; link: string } | { ok: false; error: string } | null;

const userIdSchema = z.guid();
const EMAIL_TAKEN = 'An account with that email already exists.';

function linkFor(token: string): string {
  return `${BRAND.siteUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

function parseRole(v: FormDataEntryValue | null): Role | null {
  return ROLES.includes(String(v) as Role) ? (String(v) as Role) : null;
}

function parseUserId(v: FormDataEntryValue | null): string | null {
  const parsed = userIdSchema.safeParse(String(v ?? ''));
  return parsed.success ? parsed.data : null;
}

const LINK_FAILED = 'Could not generate a password link. Try again.';

export async function createUserAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  const guard = await requireRole('admin');
  if (!guard.ok) return { ok: false, error: 'Admin access required.' };
  const email = normaliseEmail(String(form.get('email') ?? ''));
  const role = parseRole(form.get('role'));
  const name = String(form.get('displayName') ?? '').trim().slice(0, 120) || null;
  if (!email) return { ok: false, error: 'Enter a valid email address.' };
  if (!role) return { ok: false, error: 'Choose a role.' };
  try {
    if (await emailTaken(email)) return { ok: false, error: EMAIL_TAKEN };
    // M3: a concurrent create can still win the race after the check — createUser reports it.
    const created = await createUser(email, name, role, guard.editor.id);
    if (!created.ok) return { ok: false, error: EMAIL_TAKEN };
    console.info('[admin-users] created', { by: guard.editor.id, userId: created.id, role });
    revalidatePath('/studio/admin/users');
    const issued = await issueLink(created.id, guard.editor.id);
    if (!issued) {
      return { ok: false, error: 'Account created, but the password link failed. Use “New link” on the list below.' };
    }
    return {
      ok: true,
      message: `Account created for ${issued.email}. Send them this one-time link to set a password (valid 72 h):`,
      link: linkFor(issued.token),
    };
  } catch (e: unknown) {
    console.error('[admin-users] create failed', { by: guard.editor.id, role, error: e });
    return { ok: false, error: 'Could not create the account. Try again.' };
  }
}

/** Issue a link, turning any DB failure into null (logged). Never throws. */
async function issueLink(userId: string, actor: string) {
  try {
    return await createResetToken(userId, actor);
  } catch (e: unknown) {
    console.error('[admin-users] reset link failed', { by: actor, userId, error: e });
    return null;
  }
}

export async function resetLinkAction(_prev: LinkState, form: FormData): Promise<LinkState> {
  const guard = await requireRole('admin');
  if (!guard.ok) return { ok: false, error: 'Admin access required.' };
  const userId = parseUserId(form.get('userId'));
  if (!userId) return { ok: false, error: 'Unknown user.' };
  let issued;
  try {
    issued = await createResetToken(userId, guard.editor.id);
  } catch (e: unknown) {
    console.error('[admin-users] reset link failed', { by: guard.editor.id, userId, error: e });
    return { ok: false, error: LINK_FAILED };
  }
  // M3: the user is verified inside the token transaction; a deleted/unknown id writes nothing.
  if (!issued) return { ok: false, error: 'Unknown user.' };
  console.info('[admin-users] reset link', { by: guard.editor.id, userId });
  // L4: the address shown is the one stored in auth.users, never the form's `email` field.
  return {
    ok: true,
    message: `One-time password link for ${issued.email} (valid 72 h; any older link is revoked):`,
    link: linkFor(issued.token),
  };
}

export async function setRoleAction(form: FormData): Promise<void> {
  const guard = await requireRole('admin');
  if (!guard.ok) return;
  const userId = parseUserId(form.get('userId'));
  const role = parseRole(form.get('role'));
  if (!role || !userId) return;
  // Lockout (self-demotion) and last-admin guards are enforced against the DB rows in setRole.
  let result;
  try {
    result = await setRole(userId, role, guard.editor.id);
  } catch (e: unknown) {
    console.error('[admin-users] role change failed', { by: guard.editor.id, userId, role, error: e });
    return;
  }
  if (result !== 'ok') {
    console.warn('[admin-users] role change refused', { by: guard.editor.id, userId, role, result });
    return;
  }
  console.info('[admin-users] role', { by: guard.editor.id, userId, role });
  revalidatePath('/studio/admin/users');
}

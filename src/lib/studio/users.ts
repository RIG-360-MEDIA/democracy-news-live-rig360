// Admin user management (DNL program P07 S07.01.05). DNL sign-up is invitation-only, so admins create
// accounts here; a new account has an unusable random password until the person opens the one-time
// set-password link. Server-only; callers must enforce requireAdmin().
import 'server-only';

import { randomBytes } from 'node:crypto';

import { hashPassword } from '@/lib/auth/password';
import { sql } from '@/lib/db';

export const ROLES = ['reader', 'editor', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: Date;
}

export async function listUsers(): Promise<UserRow[]> {
  return sql<UserRow[]>`
    SELECT id, email, display_name, role, created_at FROM auth.users ORDER BY role DESC, email
  `;
}

export function normaliseEmail(raw: string): string | null {
  const e = String(raw ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 ? e : null;
}

export async function createUser(email: string, displayName: string | null, role: Role): Promise<string> {
  const unusable = await hashPassword(randomBytes(32).toString('base64url'));
  const rows = await sql<{ id: string }[]>`
    INSERT INTO auth.users (email, password_hash, display_name, role)
    VALUES (${email}, ${unusable}, ${displayName}, ${role})
    RETURNING id
  `;
  await sql`INSERT INTO rigwire.user_preferences (user_id) VALUES (${rows[0].id}) ON CONFLICT (user_id) DO NOTHING`
    .catch(() => undefined); // RLS may require app.user_id; preferences are created on first login otherwise
  return rows[0].id;
}

export async function setRole(userId: string, role: Role): Promise<void> {
  await sql`UPDATE auth.users SET role = ${role}, updated_at = now() WHERE id = ${userId}`;
}

export async function emailTaken(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM auth.users WHERE lower(email) = ${email} LIMIT 1`;
  return rows.length > 0;
}

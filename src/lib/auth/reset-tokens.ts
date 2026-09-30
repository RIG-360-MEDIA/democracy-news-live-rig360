// One-time set/reset-password links (DNL program P07 S07.01.04, owner default O-7: no email — an
// admin generates the link in /studio/admin/users and sends it to the person). Only the SHA-256 of a
// token is stored, so a database leak can't be replayed; tokens are single-use and expire.
import 'server-only';

import { createHash, randomBytes } from 'node:crypto';

import { hashPassword } from '@/lib/auth/password';
import { sql } from '@/lib/db';

export const RESET_TTL_HOURS = 72;
export const MIN_PASSWORD_LENGTH = 10;

/** 32 random bytes, URL-safe. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** Returns an error message, or null when the password is acceptable. */
export function passwordProblem(pw: string): string | null {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (pw.length > 200) return 'Password is too long.';
  if (/^(.)\1+$/.test(pw)) return 'Password is too simple.';
  return null;
}

/** Create a single-use token for `userId`; any older unused tokens for that user are revoked. */
export async function createResetToken(userId: string): Promise<string> {
  const raw = generateToken();
  await sql.begin(async (tx) => {
    await tx`UPDATE auth.password_reset_tokens SET used = TRUE WHERE user_id = ${userId} AND used = FALSE`;
    await tx`
      INSERT INTO auth.password_reset_tokens (token, user_id, expires_at)
      VALUES (${hashToken(raw)}, ${userId}, now() + make_interval(hours => ${RESET_TTL_HOURS}))
    `;
  });
  return raw;
}

export type ConsumeResult = { ok: true; email: string } | { ok: false; error: string };

/** Atomically check + burn the token and set the new password. */
export async function consumeResetToken(raw: string, newPassword: string): Promise<ConsumeResult> {
  const problem = passwordProblem(newPassword);
  if (problem) return { ok: false, error: problem };
  if (!raw || raw.length < 20) return { ok: false, error: 'This link is invalid or has expired.' };
  const hash = await hashPassword(newPassword);
  return sql.begin(async (tx) => {
    const rows = await tx<{ user_id: string }[]>`
      SELECT user_id FROM auth.password_reset_tokens
       WHERE token = ${hashToken(raw)} AND used = FALSE AND expires_at > now()
       FOR UPDATE
    `;
    if (rows.length === 0) return { ok: false, error: 'This link is invalid or has expired.' } as const;
    const userId = rows[0].user_id;
    const users = await tx<{ email: string }[]>`
      UPDATE auth.users SET password_hash = ${hash}, updated_at = now() WHERE id = ${userId} RETURNING email
    `;
    await tx`UPDATE auth.password_reset_tokens SET used = TRUE WHERE user_id = ${userId}`;
    return { ok: true, email: users[0]?.email ?? '' } as const;
  });
}

// Editorial CMS — the signed-in user's CURRENT account state, read from auth.users (H1).
//
// The JWT's `role` claim is a snapshot from sign-in and lives as long as the cookie. requireRole()
// must not trust it: a demoted or deleted account has to lose Studio access on its very next request.
// So every guarded call re-reads the row here — one primary-key SELECT — memoised per request with
// React cache() (a page that checks admin, then editor, or a layout + page pair, reads it once).
//
// auth.users has no RLS (see src/lib/auth/config.ts), so no app.user_id context is needed.
import 'server-only';

import { cache } from 'react';
import { z } from 'zod';

import { sql } from '@/lib/db';

export interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

const userIdSchema = z.guid();

/** The account behind `userId` as it is NOW, or null if it no longer exists (or the id is not a
 *  uuid — a malformed token subject never reaches the DB). DB errors propagate: the guard fails
 *  closed rather than falling back to the JWT claim. */
export const loadCurrentUser = cache(async (userId: string): Promise<CurrentUser | null> => {
  if (!userIdSchema.safeParse(userId).success) return null;
  const rows = await sql<CurrentUser[]>`
    SELECT id, email, role FROM auth.users WHERE id = ${userId} LIMIT 1
  `;
  return rows[0] ?? null;
});

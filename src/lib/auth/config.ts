// src/lib/auth/config.ts
//
// Full Auth.js v5 config (Node runtime).
//
// Extends the edge-safe base in `./config.edge.ts` with the
// Credentials provider — which pulls in `verifyPassword` (native
// argon2 binding) and `sql` (postgres client). Both are fine in the
// Node runtime used by API routes and server actions; both would
// break the Edge runtime used by middleware.
//
// Session strategy: JWT.
//   - Stateless, scales horizontally without a session table lookup.
//   - The JWT carries `sub` = user UUID, `role`, and `onboardedAt`.
//   - Middleware decodes the JWT to gate routes.
//   - For DB queries, app code calls `withUser(userId, cb)` which
//     SETs `app.user_id` inside a transaction — RLS picks it up.

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql, withUser } from '@/lib/db';
import { verifyPassword } from './password';
import { authConfigEdge } from './config.edge';

import './types';   // register module augmentation

const CredentialsSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(8).max(200),
});

export const authConfig: NextAuthConfig = {
  ...authConfigEdge,
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const parsed = CredentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const normalised = email.trim().toLowerCase();

        // Step 1 — authenticate (auth.users has no RLS, so no app.user_id needed).
        const rows = await sql<
          { id: string; email: string; password_hash: string; role: string; display_name: string | null }[]
        >`
          SELECT id, email, password_hash, role, display_name
            FROM auth.users
           WHERE LOWER(email) = ${normalised}
           LIMIT 1
        `;

        const user = rows[0];
        if (!user) return null;

        const ok = await verifyPassword(password, user.password_hash);
        if (!ok) return null;

        // Step 2 — read onboarded_at inside RLS context (FORCE RLS on
        // user_preferences requires app.user_id to be set).
        const onboardedAt = await withUser(user.id, async (tx) => {
          const r = await tx<{ onboarded_at: Date | null }[]>`
            SELECT onboarded_at
              FROM rigwire.user_preferences
             WHERE user_id = ${user.id}
             LIMIT 1
          `;
          return r[0]?.onboarded_at ?? null;
        });

        return {
          id:           user.id,
          email:        user.email,
          name:         user.display_name ?? undefined,
          role:         user.role,
          onboardedAt:  onboardedAt ? onboardedAt.toISOString() : null,
        };
      },
    }),
  ],
};

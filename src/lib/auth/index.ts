// src/lib/auth/index.ts
//
// Auth.js v5 main exports.
// `auth()` is the universal session getter — use in:
//   - server components: `const session = await auth();`
//   - server actions:    same
//   - route handlers:    same
//   - middleware:        wraps the middleware handler
//
// `unstable_update()` lets a server action refresh the JWT mid-session
// without forcing the user to re-sign-in — used by the onboarding
// completion action to flip `onboardedAt` in the cookie immediately.

import NextAuth from 'next-auth';
import { authConfig } from './config';

export const {
  handlers,            // GET, POST for /api/auth/[...nextauth]/route.ts
  auth,                // server-side session getter
  signIn,              // server-side sign-in helper
  signOut,             // server-side sign-out helper
  unstable_update,     // server-side session refresh (v5 beta API)
} = NextAuth(authConfig);

export type { Session } from 'next-auth';

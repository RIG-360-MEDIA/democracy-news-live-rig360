// src/lib/auth/types.ts
//
// Auth.js v5 module augmentation.
// Adds `role` and `onboardedAt` to the session/user/JWT shapes so
// TypeScript knows about the fields we're persisting through the
// authorize → jwt → session pipeline.
//
// onboardedAt:
//   - string (ISO timestamp) when the user has completed onboarding
//   - null when they have not
//
// Middleware reads token.onboardedAt to gate /today + mode pages.

import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string | null;
      name?: string | null;
      image?: string | null;
      role: string;
      onboardedAt: string | null;
    };
  }

  interface User {
    role?: string;
    onboardedAt?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    sub?: string;
    role?: string;
    onboardedAt?: string | null;
  }
}

// src/app/api/auth/[...nextauth]/route.ts
//
// Auth.js v5 catch-all route handler.
// Auth.js dispatches /api/auth/signin, /signout, /callback, /session, etc.

import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;

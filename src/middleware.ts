// src/middleware.ts
//
// Next.js middleware powered by Auth.js v5's authorized() callback.
// Runs before every request to the matched paths. Auth.js decodes
// the JWT cookie and exposes auth.user; our edge config's
// `authorized` callback returns true/false to allow/redirect.
//
// IMPORTANT: We use the *edge* config here, not the full one.
// Middleware runs on Edge runtime, which can't load `@node-rs/argon2`
// (native binding) or `postgres` (Node net APIs). The edge config
// has neither — just JWT decode + `authorized()`.
//
// Protected paths (per authConfigEdge.callbacks.authorized):
//   - /onboarding/**
//   - /admin/**
// Everything else is public (landing, signin, signup, mode pages).

import NextAuth from 'next-auth';
import { authConfigEdge } from '@/lib/auth/config.edge';

export const { auth: middleware } = NextAuth(authConfigEdge);

export const config = {
  // Match everything except Next.js internals and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|woff2?|ttf|css|js)).*)'],
};

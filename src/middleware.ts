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
  // Only the paths whose answer depends on the session (or that DNL routes away). Public reader
  // pages, the sitemap, robots and every unknown URL (old-site links, bot scans) never run
  // middleware, so they stay CDN-cacheable: unknown URLs get the static 404, not a redirect into a
  // server-rendered front page (the Nov 2026 Hobby pause). `/` → /long-read is a next.config rewrite.
  // Keep in step with isPublicPath/isDnlPath in lib/auth/config.edge.ts; scripts/check-cache.mjs
  // fails the build if a public path starts matching here again.
  matcher: [
    '/studio/:path*', '/curate/:path*', '/onboarding/:path*', '/admin/:path*', '/signup/:path*',
    // Rig Wire mode pages: sign-in required there, redirected to the home on DNL
    '/minute/:path*', '/digest/:path*', '/all-sides/:path*', '/long-view/:path*', '/queue/:path*', '/today/:path*',
  ],
};

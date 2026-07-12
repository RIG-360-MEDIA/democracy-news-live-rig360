// src/lib/auth/config.edge.ts
//
// Edge-runtime-safe Auth.js config.
//
// The middleware runs on Edge — it cannot load native modules like
// `@node-rs/argon2` or the `postgres` client. So we keep this file
// free of any Node-only imports: no DB, no password hashing, no
// Credentials provider with an `authorize()` callback.
//
// The full config in `./config.ts` spreads this and adds the
// Credentials provider for the Node runtime (API route + server
// actions). Middleware only needs to decode the JWT and run the
// `authorized()` callback — both of which are Edge-safe.
//
// Canonical pattern: https://authjs.dev/guides/edge-compatibility

import type { NextAuthConfig } from 'next-auth';
import { NextResponse } from 'next/server';

import { isEditor } from './roles';
import './types';   // register module augmentation

/**
 * Build a redirect that stays on the host the visitor actually used.
 *
 * `new URL(path, request.nextUrl)` inherits request.nextUrl's origin, which on
 * Vercel can be the internal *.vercel.app deployment host — so a redirect (e.g.
 * `/` → `/long-read`) leaks that URL into the address bar instead of keeping the
 * custom domain (global.democracynewslive.com). We rebuild the URL from the
 * incoming Host header (x-forwarded-host preferred) so redirects always point
 * back at the domain the user typed.
 */
function hostSafeRedirect(pathname: string, request: { nextUrl: URL; headers: Headers }): NextResponse {
  const url = new URL(request.nextUrl.href);
  url.pathname = pathname;
  url.search = '';
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (host) url.host = host;
  return NextResponse.redirect(url);
}

/**
 * Routes that are always reachable without authentication.
 * Everything else requires a session AND a completed onboarding.
 */
function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/'
    || pathname.startsWith('/signin')
    || pathname.startsWith('/signup')
    || pathname.startsWith('/long-read')   // Worldwide — public news surface (read without login)
    || pathname.startsWith('/api/auth')
    || pathname.startsWith('/_next')
  );
}

/**
 * On the Democracy News Live deploy (DEPLOY_TARGET=dnl) only the DNL surfaces are exposed;
 * the six-mode Rig Wire landing is routed away (Rig Wire is a separate app that links here).
 * Everything not on this allowlist is redirected to the DNL home (/long-read).
 */
function isDnlPath(pathname: string): boolean {
  return (
    pathname === '/long-read' || pathname.startsWith('/long-read/')
    || pathname.startsWith('/studio')
    || pathname.startsWith('/curate')
    || pathname.startsWith('/signin')
    || pathname.startsWith('/signup')
    || pathname.startsWith('/onboarding')
    || pathname.startsWith('/api')
    || pathname.startsWith('/_next')
  );
}

export const authConfigEdge: NextAuthConfig = {
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },   // 30 days
  pages: {
    signIn: '/signin',
    error:  '/signin',
  },
  // Providers are added in the full config — middleware doesn't need them.
  providers: [],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: persist identity + onboarding marker into the token.
      if (user) {
        token.sub          = user.id;
        token.role         = (user as { role?: string }).role ?? 'reader';
        token.onboardedAt  = (user as { onboardedAt?: string | null }).onboardedAt ?? null;
      }

      // session.update() from a server action — used after the user
      // completes onboarding so the JWT picks up the new flag without
      // forcing a sign-out / sign-in.
      if (trigger === 'update' && session && typeof session === 'object') {
        const u = (session as { user?: Record<string, unknown> }).user;
        if (u && 'onboardedAt' in u) {
          token.onboardedAt = (u.onboardedAt as string | null) ?? null;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.sub)  session.user.id           = token.sub;
      if (token.role) session.user.role         = token.role as string;
      session.user.onboardedAt = (token.onboardedAt as string | null | undefined) ?? null;
      return session;
    },

    /**
     * Route gate.
     *
     * Three states:
     *   1. Public path → always allow.
     *   2. Authenticated + onboarded → allow.
     *   3. Authenticated but onboardedAt is NULL →
     *        allow only /onboarding (and public paths);
     *        redirect everything else to /onboarding.
     *   4. Not authenticated + non-public path → block (Auth.js
     *        sends them to pages.signIn).
     */
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;

      // (0) DNL deploy: expose only the Democracy News Live surfaces; send everything else
      // (the Rig Wire six-mode landing / mode pages) to the DNL home. Runs before all else.
      if (process.env.DEPLOY_TARGET === 'dnl' && !isDnlPath(pathname)) {
        return hostSafeRedirect('/long-read', request);
      }

      const isPublic     = isPublicPath(pathname);
      const isOnboarding = pathname.startsWith('/onboarding');

      // (1) public paths always pass
      if (isPublic) return true;

      // (4) not signed in + private path → bounce to signin
      if (!auth?.user) return false;

      // (E7) /studio + /curate are the internal editorial surfaces — require an editor/admin
      // role. A signed-in reader has no business here; send them to the feed.
      // (Each also re-checks server-side; this is the edge backstop.)
      const isEditorZone = pathname.startsWith('/studio') || pathname.startsWith('/curate');
      if (isEditorZone && !isEditor(auth.user.role)) {
        return hostSafeRedirect('/', request);
      }

      // (3) signed in but not yet onboarded
      if (!auth.user.onboardedAt) {
        if (isOnboarding) return true;
        // /studio + /curate are internal editor consoles (guarded server-side).
        // Editors are not readers — never force them through the reader onboarding wizard.
        if (isEditorZone) return true;
        // Use NextResponse.redirect so the browser URL bar updates
        // (plain Response.redirect renders the body without updating
        // the location bar in Next.js middleware).
        return hostSafeRedirect('/onboarding', request);
      }

      // (2) signed in + onboarded
      return true;
    },
  },
};

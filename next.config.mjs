/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Production runs on Vercel. `standalone` is kept so the app can still be self-hosted as a
  // fallback (node .next/standalone/server.js) — see DNL program P11 / failure-mode register.
  output: 'standalone',
  // Keep native Node-only packages out of the webpack bundle.
  // `@node-rs/argon2` ships a `browser` field that points at a wasm
  // re-export, which makes webpack think the named exports are
  // missing on the server bundle. Listing it here forces Next.js
  // to treat it as a Node-external `require()` at runtime.
  // `postgres` is also Node-only and benefits from the same treatment.
  serverExternalPackages: ['@node-rs/argon2', 'postgres'],
  // Brand baked in at build time so client components match the server (src/lib/brand.ts).
  env: {
    NEXT_PUBLIC_BRAND: process.env.DEPLOY_TARGET === 'dnl' || !process.env.DEPLOY_TARGET ? 'dnl' : 'rigwire',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'picsum.photos' }
    ]
  },
  poweredByHeader: false,
  async headers() {
    // P06 D-5. Enforced: framing, referrer, sniffing, permissions. CSP starts REPORT-ONLY (reports →
    // /api/csp-report) and is enforced after 48 h without legitimate violations.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://platform.twitter.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://platform.twitter.com https://syndication.twitter.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      'report-uri /api/csp-report',
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
      // The *.vercel.app deployment URLs duplicate production — keep them out of search indexes.
      {
        source: '/:path*',
        has: [{ type: 'host', value: '(?<sub>.*)\\.vercel\\.app' }],
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
  async redirects() {
    return [{ source: '/favicon.ico', destination: '/icon.png', permanent: true }];
  },
};

export default nextConfig;

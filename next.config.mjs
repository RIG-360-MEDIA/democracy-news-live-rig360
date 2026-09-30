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
  async headers() {
    return [
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

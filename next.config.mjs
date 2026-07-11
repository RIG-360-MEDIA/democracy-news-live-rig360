/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone output: build OFF the box, ship the self-contained ~150MB bundle
  // (.next/standalone) and run `node server.js` (~300MB) — no memory-hungry build
  // on the 15GB prod box, so the news pipeline can't be OOM-killed. (Phase-5 deploy.)
  output: 'standalone',
  // Keep native Node-only packages out of the webpack bundle.
  // `@node-rs/argon2` ships a `browser` field that points at a wasm
  // re-export, which makes webpack think the named exports are
  // missing on the server bundle. Listing it here forces Next.js
  // to treat it as a Node-external `require()` at runtime.
  // `postgres` is also Node-only and benefits from the same treatment.
  serverExternalPackages: ['@node-rs/argon2', 'postgres'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'picsum.photos' }
    ]
  }
};

export default nextConfig;

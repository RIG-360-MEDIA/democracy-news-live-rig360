// postbuild lock (Nov 2026 Hobby pause): fail the build if a public reader page stops being
// CDN-cacheable — i.e. it is no longer ISR, or middleware runs on it (or on unknown URLs).
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../.next/${f}`, import.meta.url)));
const prerender = read('prerender-manifest.json');
const mw = read('server/middleware-manifest.json').middleware['/'];
const matchers = (mw?.matchers ?? []).map((m) => new RegExp(m.regexp));
const runsMiddleware = (p) => matchers.some((r) => r.test(p));

const errors = [];
for (const r of ['/long-read', '/sitemap.xml']) {
  if (!prerender.routes[r]?.initialRevalidateSeconds) errors.push(`${r} is not ISR`);
}
if (!prerender.dynamicRoutes['/long-read/[slug]']) errors.push('/long-read/[slug] is not ISR');
for (const p of ['/', '/long-read', '/long-read/0b5c1e9e-0000-4000-8000-000000000000', '/sitemap.xml',
  '/robots.txt', '/google_feeds.xml', '/latestnews/some-old-story', '/content/servlet/RDESController']) {
  if (runsMiddleware(p)) errors.push(`middleware runs on public path ${p}`);
}
if (!runsMiddleware('/studio')) errors.push('middleware no longer guards /studio');

if (errors.length) {
  console.error('check-cache FAILED:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log('check-cache ok: front page, sitemap and stories are ISR; middleware only on session paths');

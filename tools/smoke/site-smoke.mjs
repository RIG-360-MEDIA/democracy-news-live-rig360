#!/usr/bin/env node
// Public-site smoke test (DNL program P05/P06). No dependencies.
// Usage: BASE=https://… node tools/smoke/site-smoke.mjs
// Checks status codes for the DNL surface, one real story page, gate redirects, auth endpoints.
const BASE = (process.env.BASE ?? 'http://localhost:3000').replace(/\/$/, '');
const expect = [
  ['/', [200]],
  ['/long-read', [200]],
  ['/signin', [200]],
  ['/api/auth/providers', [200]],
  ['/api/auth/csrf', [200]],
  ['/api/ticker', [200]],
  ['/minute', [307, 308]],
  ['/studio', [307, 308]],
  ['/long-read/00000000-0000-0000-0000-000000000000', [404]],
  ['/api/cron/image-scan', [401]],
];
let failed = 0;
async function hit(path, ok) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, { redirect: 'manual' });
  const pass = ok.includes(res.status);
  if (!pass) failed++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${res.status} ${String(Date.now() - t0).padStart(5)}ms ${path}`);
  return res;
}
for (const [p, ok] of expect) await hit(p, ok);
const html = await (await fetch(BASE + '/long-read')).text();
const story = html.match(/\/long-read\/[0-9a-f-]{36}/)?.[0];
if (story) await hit(story, [200]); else { failed++; console.log('FAIL no story link on /long-read'); }
console.log(failed ? `${failed} check(s) failed` : 'all site checks passed');
process.exit(failed ? 1 : 0);

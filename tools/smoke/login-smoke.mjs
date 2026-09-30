#!/usr/bin/env node
// Credentials login smoke test (DNL program P06 D-1 / P07). No dependencies.
// Usage: BASE=http://localhost:3310 QA_EDITOR_EMAIL=… QA_EDITOR_PASSWORD=… node tools/smoke/login-smoke.mjs
// Checks: csrf → credentials callback → session has role → /studio 200 → wrong password rejected.
const BASE = process.env.BASE ?? 'http://localhost:3310';
const EMAIL = process.env.QA_EDITOR_EMAIL;
const PASSWORD = process.env.QA_EDITOR_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.error('QA_EDITOR_EMAIL / QA_EDITOR_PASSWORD required');
  process.exit(2);
}

const jar = new Map();
const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
function absorb(res) {
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
async function req(path, init = {}) {
  const res = await fetch(BASE + path, {
    redirect: 'manual',
    ...init,
    headers: { cookie: cookieHeader(), ...(init.headers ?? {}) },
  });
  absorb(res);
  return res;
}
async function login(password) {
  const csrf = await (await req('/api/auth/csrf')).json();
  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken, email: EMAIL, password, callbackUrl: `${BASE}/studio`,
  });
  return req('/api/auth/callback/credentials', {
    method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
}

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

const bad = await login('definitely-wrong-password');
const badLoc = bad.headers.get('location') ?? '';
check('wrong password rejected', !badLoc.endsWith('/studio') || badLoc.includes('error'), `${bad.status} ${badLoc}`);
jar.clear();

const ok = await login(PASSWORD);
check('login redirects', ok.status >= 300 && ok.status < 400, `${ok.status} ${ok.headers.get('location')}`);
const session = await (await req('/api/auth/session')).json();
check('session has user', Boolean(session?.user), '');
check('session role editor/admin', ['editor', 'admin'].includes(session?.user?.role), `role=${session?.user?.role}`);
const studio = await req('/studio');
check('studio 200 when signed in', studio.status === 200, `${studio.status}`);

const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `${failed} check(s) failed` : 'all login checks passed');
process.exit(failed ? 1 : 0);

// tests/validate-worldwide.mjs
//
// Extensive live validation harness for the Worldwide (/long-read) product.
// Exercises API contracts, every scope, list<->detail consistency, read quality,
// rendered-HTML integrity, and live DB data-quality. Run with the dev server on
// :3001 AND the SSH tunnel (:5433) up:
//   node tests/validate-worldwide.mjs
// Prints "<n> passed, <m> failed" and lists every failure. Exit 1 if any fail.

import fs from 'fs';
import postgres from 'postgres';

const BASE = 'http://localhost:3001';
const DSN = (fs.readFileSync('.env.local', 'utf8').match(/ANALYTICS_DB_URL=["']?([^"'\n\r]+)/) || [])[1];
const sql = postgres(DSN, { idle_timeout: 8 });

let pass = 0;
const failures = [];
const warnings = []; // DB-owned data-health metrics the front-end can't fix at source (tracked, non-fatal)
function check(cat, name, cond, detail = '') {
  if (cond) pass++;
  else failures.push(`[${cat}] ${name}${detail ? ` — ${detail}` : ''}`);
}
function warn(cat, name, cond, detail = '') {
  if (cond) pass++;
  else warnings.push(`[${cat}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function getJSON(p) {
  const r = await fetch(BASE + p, { cache: 'no-store' });
  let j = null;
  try { j = await r.json(); } catch { /* non-json */ }
  return { status: r.status, j };
}
async function getHTML(p) {
  const r = await fetch(BASE + p, { cache: 'no-store' });
  return { status: r.status, html: await r.text() };
}
function flatten(data) {
  const all = [];
  for (const u of data.topStories) {
    if (u.kind === 'hub') u.members.forEach((m) => all.push(m));
    else all.push(u);
  }
  data.sections.forEach((s) => s.stories.forEach((c) => all.push(c)));
  return all;
}

async function waitForServer(tries = 45) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(BASE + '/api/worldwide?scope=world', { cache: 'no-store' }); if (r.status) return; } catch { /* not up yet */ }
    await new Promise((s) => setTimeout(s, 2000));
  }
  throw new Error('dev server never became reachable at ' + BASE);
}

async function run() {
  await waitForServer();
  // ===== 1. API contract & error paths =====
  const w = await getJSON('/api/worldwide?scope=world');
  check('api', 'world 200', w.status === 200, `status ${w.status}`);
  check('api', 'world envelope {ok,data,error}', !!(w.j && w.j.ok === true && 'data' in w.j && 'error' in w.j));
  check('api', 'world topStories is array', Array.isArray(w.j?.data?.topStories));
  check('api', 'world sections is array', Array.isArray(w.j?.data?.sections));
  const bad = await getJSON('/api/worldwide?scope=ZZ9');
  check('api', 'invalid scope -> 400', bad.status === 400, `status ${bad.status}`);
  check('api', 'invalid scope ok=false envelope', !!(bad.j && bad.j.ok === false && bad.j.error));
  const shown = await getJSON('/api/worldwide/shown?scope=world');
  check('api', 'shown 200 + ids[]', shown.status === 200 && Array.isArray(shown.j?.data?.ids));
  check('api', 'malformed slug -> 404', (await getHTML('/long-read/not-a-uuid')).status === 404);
  check('api', 'ghost uuid -> 404', (await getHTML('/long-read/00000000-0000-0000-0000-000000000000')).status === 404);

  // ===== 2. Every scope =====
  const scopes = ['world', 'in', 'us', 'gb', 'au', 'ng', 'cn'];
  const sampleIds = [];
  for (const sc of scopes) {
    // the user-facing PAGE route (what the scope chips link to) must render real content
    const pg = await getHTML('/long-read' + (sc === 'world' ? '' : '?scope=' + sc));
    // real long-read page (not an auth redirect) — a sparse scope is valid, so check the masthead, not size
    check('page', `${sc} page renders`, pg.status === 200 && /Worldwide edition/.test(pg.html), `status ${pg.status}, ${Math.round(pg.html.length / 1000)}kb`);
    const r = await getJSON('/api/worldwide?scope=' + sc);
    if (r.status !== 200 || !r.j?.ok) { check('scope', `${sc} returns ok`, false, `status ${r.status}`); continue; }
    const all = flatten(r.j.data);
    check('scope', `${sc} has stories`, all.length > 0, `${all.length} cards`);
    if (all.length === 0) continue;
    const maxD = Math.max(...all.map((c) => c.freshnessSeconds / 86400));
    check('freshness', `${sc} every card <= 7d old`, maxD <= 7.05, `max ${maxD.toFixed(1)}d`);
    const ids = all.map((c) => c.id);
    check('dedup', `${sc} no duplicate cards`, new Set(ids).size === ids.length, `${ids.length - new Set(ids).size} dupes`);
    const titleless = all.filter((c) => !c.title || /^\s*\*\*/.test(c.title) || !c.title.trim());
    check('quality', `${sc} no titleless cards`, titleless.length === 0, `${titleless.length} titleless`);
    const slug = all.filter((c) => c.title && (/\.(cms|html?|php|aspx?|jsp|ece|amp|stm)\b/i.test(c.title) || (!/\s/.test(c.title) && /\d/.test(c.title) && !/\p{L}{4,}/u.test(c.title))));
    check('quality', `${sc} no slug/filename headlines`, slug.length === 0, `${slug.length} slug-titles`);
    const nonEng = all.filter((c) => { const L = (c.title.match(/\p{L}/gu) || []).length; return L > 0 && (c.title.match(/[A-Za-z]/g) || []).length / L < 0.5; });
    check('quality', `${sc} titles are English`, nonEng.length === 0, `${nonEng.length} non-English`);
    // all-lowercase ONLY matters for Latin-script titles; non-cased scripts (Malayalam/Japanese/Hindi)
    // equal their own lowercase and are perfectly valid multilingual headlines.
    const lower = all.filter((c) => c.title && /[a-z]/.test(c.title) && c.title === c.title.toLowerCase());
    check('quality', `${sc} no all-lowercase Latin headlines`, lower.length === 0, `${lower.length} all-lowercase`);
    if (sc === 'world') check('scope', 'world has aroundTheWorld', r.j.data.aroundTheWorld.length > 0);
    all.filter((c) => c.hasArticle).slice(0, 4).forEach((c) => sampleIds.push(c.id));
  }

  // ===== 3. list<->detail consistency (dead-link + read quality) =====
  const uniq = [...new Set(sampleIds)].slice(0, 24);
  let dead = 0, thin = 0, degenBody = 0, noByline = 0;
  for (const id of uniq) {
    const r = await getHTML('/long-read/' + id);
    if (r.status !== 200) { dead++; continue; }
    // count <p> blocks with >=30 chars of actual text (strip inner <span>/<strong> from the markdown renderer)
    const paras = (r.html.match(/<p[^>]*>[\s\S]*?<\/p>/g) || []).filter((p) => p.replace(/<[^>]+>/g, '').trim().length >= 30).length;
    if (paras < 2) thin++;
    if (/no facts available|source ledger|no corroborated/i.test(r.html)) degenBody++;
    if (!/Rig Wire/i.test(r.html)) noByline++;
  }
  check('reads', 'no hasArticle card 404s (dead links)', dead === 0, `${dead}/${uniq.length} non-200`);
  check('reads', 'reads have >= 2 paragraphs', thin === 0, `${thin}/${uniq.length} thin`);
  check('reads', 'no degenerate "no facts" body', degenBody === 0, `${degenBody} degenerate`);
  check('reads', 'every read has By Rig Wire byline', noByline === 0, `${noByline} missing byline`);

  // ===== 4. rendered-HTML integrity (/long-read) =====
  const lr = await getHTML('/long-read');
  check('html', 'no dead href="#" links', (lr.html.match(/href="#"/g) || []).length === 0, `${(lr.html.match(/href="#"/g) || []).length} dead`);
  check('html', 'exactly one <h1>', (lr.html.match(/<h1[\s>]/g) || []).length === 1, `${(lr.html.match(/<h1[\s>]/g) || []).length} h1s`);
  check('html', 'no titleless "**" in rendered cards', !/>\s*\*\*[^<]*</.test(lr.html));
  check('html', 'no Application error overlay text', !/Application error: a (server|client)-side exception/i.test(lr.html));

  // ===== 5. live DB data quality =====
  const g = (await sql`SELECT max(updated_at) latest FROM analytics.story_generated_v8`)[0];
  check('pipeline', 'gen produced in last 24h', new Date(g.latest).getTime() > Date.now() - 24 * 3600 * 1000, `latest ${g.latest}`);
  const surf = (await sql`
    WITH g AS (SELECT DISTINCT ON(story_id) story_id,headline,status,strategy FROM analytics.story_generated_v8 ORDER BY story_id,updated_at DESC)
    SELECT count(*)::int n,
      count(*) FILTER (WHERE g.headline ILIKE '%no facts%' OR g.headline ILIKE '%source ledger%')::int degen,
      count(*) FILTER (WHERE g.headline IS NULL OR btrim(g.headline)='' OR g.headline LIKE '**%' OR g.headline LIKE ' **%')::int titleless
    FROM analytics.story_clusters_v8 c JOIN g USING(story_id)
    WHERE g.status LIKE 'PUBLISHABLE%' AND g.strategy<>'stub' AND c.redirected_to IS NULL AND c.suppression_reason IS NULL
      AND c.independent_source_count>=2 AND EXISTS(SELECT 1 FROM analytics.story_facts_v8 f WHERE f.story_id=c.story_id)`)[0];
  check('data', '0 degenerate in surfaceable set', surf.degen === 0, `${surf.degen}`);
  const tlPct = surf.n ? (surf.titleless / surf.n) * 100 : 0;
  // DB-owned: the generator still emits "**"/titleless headlines for some stories. The front-end now
  // filters/cleans these so they never SURFACE (asserted above), but the corpus rate is the DB's root fix.
  warn('db-health', 'corpus titleless rate < 5%', tlPct < 5, `${tlPct.toFixed(1)}% (${surf.titleless}/${surf.n})`);

  // ===== 6. dedup cross-check: nothing surfaced is redirected/suppressed =====
  const surfaced = flatten((await getJSON('/api/worldwide?scope=world')).j.data).map((c) => c.id);
  if (surfaced.length) {
    const b = (await sql`SELECT count(*)::int n FROM analytics.story_clusters_v8 WHERE story_id = ANY(${surfaced}) AND (redirected_to IS NOT NULL OR suppression_reason IS NOT NULL)`)[0];
    check('dedup', 'no redirected/suppressed cluster surfaced', b.n === 0, `${b.n} leaked`);
  }

  console.log(`\n=== VALIDATION: ${pass} passed, ${failures.length} failed, ${warnings.length} db-health warning(s) ===`);
  if (failures.length) { console.log('FAILURES (front-end, must fix):'); failures.forEach((f) => console.log('  x ' + f)); }
  if (warnings.length) { console.log('DB-HEALTH (owned by DB chat, non-fatal):'); warnings.forEach((w) => console.log('  ! ' + w)); }
  await sql.end();
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.log('HARNESS ERROR:', e.message); process.exit(2); });

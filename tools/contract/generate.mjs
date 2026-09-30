#!/usr/bin/env node
// Generate contracts/reader-schema.json (DNL program P05 T3).
// 1. Scan src/**/*.{ts,tsx} for `schema.table` references in the reader/CMS schemas.
// 2. Read the live column list of each table from a reference DB (CONTRACT_DB_URL).
// 3. Keep only columns whose name appears as a word in the source → the columns the app can touch.
// Usage: CONTRACT_DB_URL=postgres://… node tools/contract/generate.mjs
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const SCHEMAS = ['analytics', 'public', 'rigwire', 'editorial', 'auth'];
const IGNORE = new Set(['public.news', 'rigwire.com', 'auth.uid', 'auth.user', 'analytics.now_sim',
  'analytics.replay_clock', 'analytics.reset_clock', 'analytics.tick', 'rigwire.draft_jobs',
  'analytics.youtube_clips_v2', 'rigwire.news']); // comments / string literals, not queries

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f) && !/\.test\./.test(f)) out.push(p);
  }
  return out;
}

const src = walk('src').map((f) => readFileSync(f, 'utf8')).join('\n');
const re = new RegExp(`\\b(${SCHEMAS.join('|')})\\.([a-z_][a-z0-9_]*)\\b`, 'g');
const tables = [...new Set([...src.matchAll(re)].map((m) => `${m[1]}.${m[2]}`))]
  .filter((t) => !IGNORE.has(t)).sort();
// bare `articles` / `sources` (search_path public) are used too
for (const t of ['public.articles', 'public.sources']) if (!tables.includes(t)) tables.push(t);

const url = process.env.CONTRACT_DB_URL;
if (!url) { console.error('CONTRACT_DB_URL required'); process.exit(2); }
const sql = postgres(url, { max: 1, prepare: false });
const words = new Set(src.match(/[a-z_][a-z0-9_]*/g));
const contract = { generated_at: new Date().toISOString(), tables: {} };
for (const t of tables.sort()) {
  const [schema, table] = t.split('.');
  const cols = await sql`SELECT column_name FROM information_schema.columns
                         WHERE table_schema = ${schema} AND table_name = ${table} ORDER BY ordinal_position`;
  const used = cols.map((c) => c.column_name).filter((c) => words.has(c));
  contract.tables[t] = { columns: used, present_in_reference: cols.length > 0 };
}
await sql.end();
mkdirSync('contracts', { recursive: true });
writeFileSync('contracts/reader-schema.json', JSON.stringify(contract, null, 2) + '\n');
const missing = Object.entries(contract.tables).filter(([, v]) => !v.present_in_reference).map(([k]) => k);
console.log(`contract: ${tables.length} tables, ${Object.values(contract.tables).reduce((n, v) => n + v.columns.length, 0)} columns`);
if (missing.length) console.log('NOT in reference DB (review!):', missing.join(', '));

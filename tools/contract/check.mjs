#!/usr/bin/env node
// Check a database against contracts/reader-schema.json (DNL program P05 T3).
// Fails (exit 1) listing every missing table/column — the class of bug that 500'd the site when
// the reader DB lacked public.sources, rigwire.domain_reputation or a migration's column.
// Usage: CONTRACT_DB_URL=postgres://… node tools/contract/check.mjs [--allow-missing t1,t2]
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

const url = process.env.CONTRACT_DB_URL;
if (!url) { console.error('CONTRACT_DB_URL required'); process.exit(2); }
const allowIdx = process.argv.indexOf('--allow-missing');
const allow = new Set(allowIdx > 0 ? process.argv[allowIdx + 1].split(',') : []);
const contract = JSON.parse(readFileSync('contracts/reader-schema.json', 'utf8'));
const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 30 });
const problems = [];
for (const [t, spec] of Object.entries(contract.tables)) {
  const [schema, table] = t.split('.');
  const cols = new Set((await sql`SELECT column_name FROM information_schema.columns
      WHERE table_schema = ${schema} AND table_name = ${table}`).map((r) => r.column_name));
  if (cols.size === 0) {
    if (!allow.has(t)) problems.push(`MISSING TABLE ${t} (or no privilege to see it)`);
    continue;
  }
  for (const c of spec.columns) if (!cols.has(c)) problems.push(`MISSING COLUMN ${t}.${c}`);
}
await sql.end();
if (problems.length) {
  console.error(`contract check FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log(`contract check OK: ${Object.keys(contract.tables).length} tables` +
  (allow.size ? ` (allowed missing: ${[...allow].join(', ')})` : ''));

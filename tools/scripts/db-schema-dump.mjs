// tools/scripts/db-schema-dump.mjs
// Deterministic schema reference generator for the RIG Surveillance DB.
// Reads live structure (public + analytics) and WRITES docs/DATABASE-SCHEMA.md.
// No measured numbers are authored by an LLM — this script emits structure +
// approximate scale straight from the catalog. Re-run any session to refresh:
//   node tools/scripts/db-schema-dump.mjs
import postgres from 'postgres';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const url = env.match(/^ANALYTICS_DB_URL=(.+)$/m)[1].trim();
const sql = postgres(url, { prepare: false, max: 3, idle_timeout: 8, connect_timeout: 20 });

// Domain classification by table-name pattern (for grouping the reference).
const DOMAINS = [
  ['Content — Articles (RSS/web)', /^articles$|^article_/],
  ['Content — Newspaper clippings', /^clippings$|^clipping_|^newspaper_/],
  ['Content — YouTube', /^youtube|^pending_youtube/],
  ['Entities & resolution', /^entity_|^entities_/],
  ['Story layer (analytics — clustering keeper)', /^story_/],
  ['Civic / district surveillance', /^mv_district|^districts$|^district_|^acled|^mandi|^power_grid|^weather|^welfare|^air_quality|^assembly_constituencies|^coverage_/],
  ['Social monitoring', /^social_/],
  ['Campaign monitor (cm_*)', /^cm_/],
  ['Newsroom / broadcast', /^newsroom_/],
  ['Government documents', /^govt_/],
  ['Narrative / events / dossiers', /^narrative_|^event_|^dossier|^entity_dossier|^audit_decisions|^brief|^top_stories|^collection/],
  ['Users & product', /^user|^users$|^journalist_|^impersonation|^analyst_|^notification|^alerts$|^velocity/],
  ['Ops / infra', /^celery_|^kombu_|^mc_|^source|^govt_collection|^dateline|^district_geo|^topic_categ/],
  ['Backups / scratch (deletion candidates)', /_bak|_backup|backup_|^_bak|^_backup|^entities_extracted_bak/],
];
const domainOf = (n) => (DOMAINS.find(([, re]) => re.test(n)) || ['Other / uncategorised'])[0];

function fmtRows(r) {
  const n = Number(r);
  if (n < 0) return '?';
  if (n >= 1e6) return `~${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `~${(n / 1e3).toFixed(0)}k`;
  return `~${n}`;
}

try {
  const tables = await sql`
    SELECT n.nspname AS schema, c.relname AS name,
           CASE c.relkind WHEN 'r' THEN 'table' WHEN 'm' THEN 'matview' WHEN 'v' THEN 'view' END AS kind,
           c.reltuples::bigint AS approx_rows
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname IN ('public','analytics') AND c.relkind IN ('r','m','v')
    ORDER BY n.nspname, c.relname`;

  const cols = await sql`
    SELECT table_schema, table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema IN ('public','analytics')
    ORDER BY table_schema, table_name, ordinal_position`;
  const colsBy = {};
  for (const c of cols) {
    const k = `${c.table_schema}.${c.table_name}`;
    (colsBy[k] ||= []).push(`${c.column_name} ${c.data_type}${c.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
  }

  const fks = await sql`
    SELECT tc.table_schema, tc.table_name, kcu.column_name,
           ccu.table_schema AS ref_schema, ccu.table_name AS ref_table, ccu.column_name AS ref_col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.table_schema=kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.table_schema=tc.table_schema
    WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema IN ('public','analytics')
    ORDER BY 1,2`;

  const matviews = await sql`
    SELECT schemaname, matviewname, definition FROM pg_matviews
    WHERE schemaname IN ('public','analytics') ORDER BY 1,2`;

  // jsonb shapes for the content pillars (keys present in the first array element)
  const jsonbShapes = {};
  for (const [tbl, col] of [['articles', 'entities_extracted'], ['articles', 'claims_extracted'], ['clippings', 'entities_extracted'], ['youtube_clips_v2', 'entities_extracted']]) {
    try {
      const r = await sql.unsafe(
        `SELECT jsonb_object_keys(e.elem) AS k FROM ${tbl}, LATERAL jsonb_array_elements(${col}) e(elem)
         WHERE jsonb_typeof(${col})='array' AND ${col} IS NOT NULL LIMIT 200`);
      jsonbShapes[`${tbl}.${col}`] = [...new Set(r.map(x => x.k))].sort();
    } catch (e) { jsonbShapes[`${tbl}.${col}`] = [`(err: ${e.message})`]; }
  }

  // group tables by domain
  const byDomain = {};
  for (const t of tables) (byDomain[domainOf(t.name)] ||= []).push(t);

  // ---- build markdown ----
  let md = '';
  md += '# RIG Surveillance — Database Schema Reference (GENERATED)\n\n';
  md += '> **Auto-generated** by `tools/scripts/db-schema-dump.mjs` from the live DB.\n';
  md += '> Do not hand-edit — re-run the script to refresh. Structural truth only;\n';
  md += '> row figures are catalog estimates (`pg_class.reltuples`), not exact counts.\n';
  md += `> Schemas covered: \`public\`, \`analytics\`. Tables/views: ${tables.length}.\n\n`;
  md += '## How to query\n\n```\nssh -i ~/.ssh/rig_hetzner root@<RIG_BOX_IP> \\\n  "docker exec rig-postgres psql -U rig -d rig -tAc \\"<SQL>\\""\n```\n';
  md += 'Read-only by default. Always LIMIT/aggregate. `entities_extracted` etc. are jsonb arrays — guard with `jsonb_typeof(col)=\'array\'`.\n\n';
  md += '## Table of contents\n\n';
  for (const [dom] of DOMAINS.concat([['Other / uncategorised', null]])) {
    if (byDomain[dom]?.length) md += `- ${dom} (${byDomain[dom].length})\n`;
  }
  md += '\n---\n\n';

  for (const [dom] of DOMAINS.concat([['Other / uncategorised', null]])) {
    const list = byDomain[dom];
    if (!list?.length) continue;
    md += `## ${dom}\n\n`;
    for (const t of list) {
      const key = `${t.schema}.${t.name}`;
      md += `### \`${key}\` — ${t.kind}, ${fmtRows(t.approx_rows)} rows\n\n`;
      const cl = colsBy[key] || [];
      md += cl.map(c => `- \`${c}\``).join('\n') + '\n\n';
    }
  }

  md += '---\n\n## Foreign-key relationships\n\n';
  if (fks.length) {
    md += '| From | Column | → | References |\n|---|---|---|---|\n';
    for (const f of fks) md += `| \`${f.table_schema}.${f.table_name}\` | \`${f.column_name}\` | → | \`${f.ref_schema}.${f.ref_table}.${f.ref_col}\` |\n`;
  } else md += '_No declared foreign keys (relationships are by convention, not enforced)._\n';
  md += '\n';

  md += '---\n\n## jsonb shapes (content pillars)\n\n';
  for (const [k, keys] of Object.entries(jsonbShapes)) {
    md += `- \`${k}\` element keys: ${keys.map(x => `\`${x}\``).join(', ')}\n`;
  }
  md += '\n';

  md += '---\n\n## Materialized view definitions\n\n';
  for (const m of matviews) {
    md += `### \`${m.schemaname}.${m.matviewname}\`\n\n\`\`\`sql\n${m.definition.trim()}\n\`\`\`\n\n`;
  }

  mkdirSync(new URL('../../docs/', import.meta.url), { recursive: true });
  writeFileSync(new URL('../../docs/DATABASE-SCHEMA.md', import.meta.url), md);

  console.log(`WROTE docs/DATABASE-SCHEMA.md`);
  console.log(`tables/views=${tables.length} fks=${fks.length} matviews=${matviews.length}`);
  console.log('domains:', Object.entries(byDomain).map(([d, l]) => `${d}=${l.length}`).join(' | '));
} catch (e) {
  console.error('DUMP ERROR:', e.message);
} finally {
  await sql.end({ timeout: 5 });
}

#!/usr/bin/env node
/**
 * Build the SAME-EVENT labeled pair list for edge-scorer calibration.
 * Deterministic: reads cluster-golden.json + cluster-recall-set.json, emits
 * labeled pairs. NO model, NO invented numbers — pure set construction.
 *
 * Golden real shape: { groups:[{ id, type, expected, article_ids:[...] }] }
 * Recall real shape: { events:[{ key, article_ids_recalled, article_ids_isolated }] }
 *
 * Output:
 *   docs/fixtures/edge-pairs-2026-05-31.csv          (a_id,b_id,label,source,group_key,kind)
 *   docs/fixtures/edge-pairs-2026-05-31.summary.txt  (computed counts — the source of truth)
 *   label = same_event | not_same_event | grayzone
 */
const fs = require('fs');
const path = require('path');
const F = (p) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
const golden = F('docs/fixtures/cluster-golden.json');
const recall = F('docs/fixtures/cluster-recall-set.json');

const pairs = [];
const seen = new Set();
const addPair = (a, b, label, source, key, kind) => {
  if (!a || !b || a === b) return false;
  const [x, y] = a < b ? [a, b] : [b, a];
  const k = `${x}|${y}`;
  if (seen.has(k)) return false;
  seen.add(k);
  pairs.push({ a: x, b: y, label, source, key, kind });
  return true;
};
const withinPairs = (ids, label, source, key, kind, cap) => {
  const u = [...new Set((ids || []).filter(Boolean))];
  let n = 0, capped = 0;
  for (let i = 0; i < u.length; i++)
    for (let j = i + 1; j < u.length; j++) {
      if (cap && n >= cap) { capped++; continue; }
      if (addPair(u[i], u[j], label, source, key, kind)) n++;
    }
  return capped;
};

// type -> same-event label. blob_negative EXCLUDED (pairwise ambiguous — it's a
// cluster-level split test, not clean pair labels). singleton/fn_singleton have
// <=1 member -> no within-pairs.
const TYPE_LABEL = {
  true_cluster: 'same_event',
  grayzone_merge: 'same_event',        // expected=merge -> truth is same event (hard positive)
  fp_bait_earnings: 'not_same_event',  // look-alike, different event (hard negative)
  fp_bait_template: 'not_same_event',
  grayzone_separate: 'not_same_event', // expected=separate
  grayzone_borderline: 'grayzone',     // genuinely ambiguous -> gray band, not hard train
};
const EXCLUDE = new Set(['blob_negative', 'singleton', 'fn_singleton']);

const notes = [];
// ---- GOLDEN within-group ----
for (const g of golden.groups || []) {
  if (EXCLUDE.has(g.type)) continue;
  const label = TYPE_LABEL[g.type];
  if (!label) { notes.push(`skip unknown type=${g.type} (${g.id})`); continue; }
  withinPairs(g.article_ids, label, 'golden', g.id, g.type, 60);
}
// ---- GOLDEN cross true_cluster reps => clean different-event negatives ----
const reps = (golden.groups || []).filter((g) => g.type === 'true_cluster' && (g.article_ids || []).length)
  .map((g) => ({ id: g.article_ids[0], key: g.id }));
let crossAdded = 0;
const CROSS_CAP = 400; // keep negatives from swamping; LOG what we cap
outer:
for (let i = 0; i < reps.length; i++)
  for (let j = i + 1; j < reps.length; j++) {
    if (crossAdded >= CROSS_CAP) { notes.push(`cross_true capped at ${CROSS_CAP} (of ${reps.length * (reps.length - 1) / 2} possible)`); break outer; }
    if (addPair(reps[i].id, reps[j].id, 'not_same_event', 'golden_cross', `${reps[i].key}~${reps[j].key}`, 'cross_true')) crossAdded++;
  }
// ---- RECALL within-event (same-event); drop topic-streams ----
const TOPIC = new Set(['ebola_drc', 'iran_us_deal', 'rubio_india', 'ipl_kkr_dc', 'russia_oreshnik', 'akunuri_murali']);
for (const e of recall.events || []) {
  if (TOPIC.has(e.key)) continue;
  const mem = [...(e.article_ids_recalled || []), ...(e.article_ids_isolated || [])];
  const capped = withinPairs(mem, 'same_event', 'recall', e.key, 'recall_event', 60);
  if (capped) notes.push(`recall ${e.key}: capped ${capped} pairs (>60)`);
}

// ---- write CSV ----
const header = 'a_id,b_id,label,source,group_key,kind';
fs.writeFileSync(path.join(__dirname, '../docs/fixtures/edge-pairs-2026-05-31.csv'),
  header + '\n' + pairs.map((p) => `${p.a},${p.b},${p.label},${p.source},${p.key},${p.kind}`).join('\n') + '\n');

// ---- write SUMMARY (computed counts = source of truth) ----
const tally = (f) => pairs.reduce((m, p) => ((m[p[f]] = (m[p[f]] || 0) + 1), m), {});
const lines = [
  `edge-pairs-2026-05-31 — built ${new Date().toISOString?.() || 'NA'}`,
  `total_pairs=${pairs.length}`,
  `by_label=${JSON.stringify(tally('label'))}`,
  `by_source=${JSON.stringify(tally('source'))}`,
  `by_kind=${JSON.stringify(tally('kind'))}`,
  ...notes.map((n) => `note: ${n}`),
];
fs.writeFileSync(path.join(__dirname, '../docs/fixtures/edge-pairs-2026-05-31.summary.txt'), lines.join('\n') + '\n');
console.log(lines.join('\n'));

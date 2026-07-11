#!/usr/bin/env node
/**
 * Edge-scorer fit harness — language-pair-conditional same-event classifier.
 *
 * Reads a features+labels CSV produced by the DB chat's CANONICAL pair_scores
 * extractor (train/serve consistency), fits an interpretable logistic-regression
 * weight vector PER language regime (en-en / en-indic / indic-indic), and reports
 * honest out-of-fold metrics + the two band thresholds (same / gray / different).
 *
 * INVARIANTS (this script exists because the analytics chat fabricated numbers 6×):
 *   - It writes ZERO hand-typed numbers. Every figure is COMPUTED from the CSV.
 *   - The weights it emits ARE the deliverable; the DB chat transcribes them into
 *     the scorer spec. The analytics chat does not retype them.
 *   - No data file -> it prints the input contract and exits 2. It never invents.
 *
 * Usage:
 *   node scripts/fit-edge-scorer.cjs <features.csv> [--report out.json]
 *        [--target-same 0.95] [--target-diff 0.95] [--folds 5]
 *   node scripts/fit-edge-scorer.cjs --selftest     (synthetic data, LOUDLY labelled)
 *
 * Expected CSV columns (header required), one row per labelled pair:
 *   a_id,b_id,label,a_language,b_language,
 *   trgm_subject,trgm_title,shared_actors,shared_speakers,shared_locations,
 *   shared_primary_loc,idf_loc_score,canonical_url_match,event_date_match,
 *   length_ratio,time_diff_hours,same_source
 *   label ∈ {same_event, not_same_event, grayzone}; grayzone rows are HELD OUT
 *   of training and routed to the LLM-judge eval.
 */
'use strict';
const fs = require('fs');

// ---------- language regime ----------
const INDIC = new Set(['te', 'hi', 'kn', 'bn', 'ml', 'ta', 'mr', 'gu', 'pa', 'or', 'as', 'ne']);
const langClass = (l) => (l === 'en' ? 'en' : INDIC.has(l) ? 'indic' : 'other');
const regimeOf = (a, b) => {
  const [x, y] = [langClass(a), langClass(b)].sort();
  return `${x}-${y}`;
};

// ---------- feature set (order is the weight order emitted) ----------
const FEATURES = [
  'trgm_subject', 'trgm_title', 'shared_actors', 'shared_speakers', 'shared_locations',
  'shared_primary_loc', 'idf_loc_score', 'canonical_url_match', 'event_date_match',
  'length_ratio', 'time_diff_hours', 'same_source', 'shared_numbers',
];
// Features that may ONLY push toward same-event (validated 2026-06-02: shared
// specific numbers — "82 dead" in both — is evidence FOR same-event; numeric
// *divergence* is NOT evidence against, so a learned negative weight here is a
// thin-data artifact, flagged post-fit, not a real signal.
const POSITIVE_ONLY = new Set(['shared_numbers']);
const num = (v) => {
  if (v === '' || v == null) return 0;            // null -> 0 (coverage gaps flagged upstream)
  if (v === 't' || v === 'true' || v === 'True') return 1;
  if (v === 'f' || v === 'false' || v === 'False') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---------- CSV ----------
function parseCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.length);
  if (!lines.length) throw new Error('empty CSV');
  const header = lines[0].split(',');
  const idx = (name) => header.indexOf(name);
  for (const c of [...FEATURES, 'label', 'a_language', 'b_language'])
    if (idx(c) < 0) throw new Error(`CSV missing required column: ${c}`);
  return lines.slice(1).map((line) => {
    const c = line.split(',');
    return {
      a_id: c[idx('a_id')], b_id: c[idx('b_id')],
      label: c[idx('label')],
      regime: regimeOf(c[idx('a_language')], c[idx('b_language')]),
      same_source: num(c[idx('same_source')]) === 1,
      x: FEATURES.map((f) => num(c[idx(f)])),
    };
  });
}

// ---------- standardisation (params returned for serve-time reuse) ----------
function fitScaler(rows) {
  const n = FEATURES.length;
  const mean = Array(n).fill(0), std = Array(n).fill(0);
  for (const r of rows) for (let j = 0; j < n; j++) mean[j] += r.x[j];
  for (let j = 0; j < n; j++) mean[j] /= (rows.length || 1);
  for (const r of rows) for (let j = 0; j < n; j++) std[j] += (r.x[j] - mean[j]) ** 2;
  for (let j = 0; j < n; j++) std[j] = Math.sqrt(std[j] / (rows.length || 1)) || 1;
  return { mean, std };
}
const scale = (x, s) => x.map((v, j) => (v - s.mean[j]) / s.std[j]);

// ---------- logistic regression (deterministic: zero init, batch GD, L2) ----------
function fitLogReg(X, y, { iters = 4000, lr = 0.1, l2 = 1e-3 } = {}) {
  const n = X.length, d = X[0].length;
  const w = Array(d).fill(0); let b = 0;
  const sig = (z) => 1 / (1 + Math.exp(-z));
  for (let it = 0; it < iters; it++) {
    const gw = Array(d).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b; for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const e = sig(z) - y[i];
      for (let j = 0; j < d; j++) gw[j] += e * X[i][j];
      gb += e;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * (gw[j] / n + l2 * w[j]);
    b -= lr * (gb / n);
  }
  return { w, b };
}
const proba = (x, m) => 1 / (1 + Math.exp(-(m.b + x.reduce((s, v, j) => s + v * m.w[j], 0))));

// ---------- deterministic k-fold (stable hash of pair id, NOT Math.random) ----------
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function oofPredict(rows, folds, fitOpts) {
  const sorted = [...rows].sort((a, b) => hash(a.a_id + a.b_id) - hash(b.a_id + b.b_id));
  const pred = new Map();
  for (let k = 0; k < folds; k++) {
    const train = sorted.filter((_, i) => i % folds !== k);
    const test = sorted.filter((_, i) => i % folds === k);
    if (!train.length || !test.length) continue;
    const sc = fitScaler(train);
    const m = fitLogReg(train.map((r) => scale(r.x, sc)), train.map((r) => (r.label === 'same_event' ? 1 : 0)), fitOpts);
    for (const r of test) pred.set(r.a_id + r.b_id, proba(scale(r.x, sc), m));
  }
  return pred;
}

// ---------- thresholds + metrics from OOF scores ----------
function thresholdsAndMetrics(rows, pred, targetSame, targetDiff) {
  const scored = rows.map((r) => ({ s: pred.get(r.a_id + r.b_id), pos: r.label === 'same_event', ss: r.same_source }))
    .filter((r) => r.s != null).sort((a, b) => a.s - b.s);
  const P = scored.filter((r) => r.pos).length, N = scored.length - P;
  // high threshold: smallest s where precision(predict same | score>=s) >= targetSame
  let high = 1.01;
  for (const cut of scored.map((r) => r.s)) {
    const above = scored.filter((r) => r.s >= cut);
    const prec = above.length ? above.filter((r) => r.pos).length / above.length : 1;
    if (prec >= targetSame) { high = cut; break; }
  }
  // low threshold: largest s where precision(predict different | score<s) >= targetDiff
  let low = -0.01;
  for (const cut of [...scored.map((r) => r.s)].reverse()) {
    const below = scored.filter((r) => r.s < cut);
    const prec = below.length ? below.filter((r) => !r.pos).length / below.length : 1;
    if (prec >= targetDiff) { low = cut; break; }
  }
  const gray = scored.filter((r) => r.s >= low && r.s < high);
  const ssNeg = scored.filter((r) => r.ss && !r.pos);
  const ssFalseMerge = ssNeg.filter((r) => r.s >= high).length;
  return {
    n: scored.length, positives: P, negatives: N,
    low_threshold: low, high_threshold: high,
    gray_fraction: scored.length ? gray.length / scored.length : null,
    gray_count: gray.length,
    same_band_precision: (() => { const a = scored.filter((r) => r.s >= high); return a.length ? a.filter((r) => r.pos).length / a.length : null; })(),
    diff_band_precision: (() => { const a = scored.filter((r) => r.s < low); return a.length ? a.filter((r) => !r.pos).length / a.length : null; })(),
    same_source_neg: ssNeg.length,
    same_source_false_merge: ssFalseMerge,
    same_source_false_merge_rate: ssNeg.length ? ssFalseMerge / ssNeg.length : null,
  };
}

// ---------- main ----------
function run(rows, opts, tag) {
  const train = rows.filter((r) => r.label === 'same_event' || r.label === 'not_same_event');
  const gray = rows.filter((r) => r.label === 'grayzone');
  const byRegime = {};
  for (const r of train) (byRegime[r.regime] ||= []).push(r);

  const report = { tag, total_rows: rows.length, trainable: train.length, grayzone_heldout: gray.length, regimes: {} };
  console.log(`\n=== edge-scorer fit ${tag ? '(' + tag + ')' : ''} ===`);
  console.log(`rows=${rows.length}  trainable=${train.length}  grayzone_heldout=${gray.length}`);

  for (const [regime, rs] of Object.entries(byRegime).sort()) {
    const pos = rs.filter((r) => r.label === 'same_event').length;
    const neg = rs.length - pos;
    const block = { n: rs.length, positives: pos, negatives: neg };
    if (pos < 10 || neg < 10) {
      block.status = 'INSUFFICIENT_DATA (need >=10 pos and >=10 neg)';
      console.log(`\n[${regime}] n=${rs.length} pos=${pos} neg=${neg} -> ${block.status}`);
      report.regimes[regime] = block; continue;
    }
    const pred = oofPredict(rs, opts.folds, { iters: opts.iters, lr: opts.lr, l2: opts.l2 });
    const m = thresholdsAndMetrics(rs, pred, opts.targetSame, opts.targetDiff);
    const sc = fitScaler(rs);
    const finalModel = fitLogReg(rs.map((r) => scale(r.x, sc)), rs.map((r) => (r.label === 'same_event' ? 1 : 0)), { iters: opts.iters, lr: opts.lr, l2: opts.l2 });
    block.metrics = m;
    block.weights = Object.fromEntries(FEATURES.map((f, j) => [f, finalModel.w[j]]));
    block.intercept = finalModel.b;
    block.scaler = { mean: Object.fromEntries(FEATURES.map((f, j) => [f, sc.mean[j]])), std: Object.fromEntries(FEATURES.map((f, j) => [f, sc.std[j]])) };
    report.regimes[regime] = block;
    console.log(`\n[${regime}] n=${rs.length} pos=${pos} neg=${neg}`);
    console.log(`  thresholds: low=${m.low_threshold.toFixed(4)} high=${m.high_threshold.toFixed(4)}  gray=${(m.gray_fraction * 100).toFixed(1)}% (${m.gray_count})`);
    console.log(`  same-band precision=${m.same_band_precision == null ? 'NA' : m.same_band_precision.toFixed(4)}  diff-band precision=${m.diff_band_precision == null ? 'NA' : m.diff_band_precision.toFixed(4)}`);
    console.log(`  same-source false-merge=${m.same_source_false_merge}/${m.same_source_neg}${m.same_source_false_merge_rate == null ? '' : ' = ' + (m.same_source_false_merge_rate * 100).toFixed(2) + '%'}`);
    console.log(`  weights: ${FEATURES.map((f, j) => `${f}=${finalModel.w[j].toFixed(3)}`).join('  ')}`);
    // positive-only guard: a negative learned weight on these is a thin-data
    // artifact (numeric divergence is NOT evidence against same-event — validated
    // 2026-06-02). Flag it; don't silently ship it.
    const posViol = FEATURES.map((f, j) => ({ f, w: finalModel.w[j] }))
      .filter((x) => POSITIVE_ONLY.has(x.f) && x.w < -1e-6);
    if (posViol.length) {
      block.positiveOnlyViolations = posViol.map((x) => ({ feature: x.f, weight: x.w }));
      for (const v of posViol)
        console.log(`  ⚠ positive-only WARN: ${v.f}=${v.w.toFixed(3)} < 0 — thin-data artifact; treat as 0 / do not lock.`);
    }
  }
  return report;
}

function selftest() {
  console.log('############################################################');
  console.log('## SYNTHETIC SELF-TEST — NOT REAL DATA — DO NOT TRANSCRIBE ##');
  console.log('############################################################');
  // deterministic synthetic: same_event pairs have high trgm + shared entities;
  // negatives have low. Two regimes. Proves the math runs end-to-end.
  const rows = [];
  const mk = (i, regime, pos) => {
    const lang = regime === 'en-en' ? ['en', 'en'] : ['en', 'te'];
    const base = pos ? 0.8 : 0.2;
    const j = (i % 7) / 20;
    return {
      a_id: `${regime}-${pos}-a${i}`, b_id: `${regime}-${pos}-b${i}`,
      label: pos ? 'same_event' : 'not_same_event', regime,
      same_source: i % 5 === 0,
      // 13 features incl. shared_numbers (last) — positive pairs share numbers
      x: [base + j, base - j, pos ? 2 : 0, 0, pos ? 1 : 0, pos ? 1 : 0, base, 0, pos ? 1 : 0, 1, pos ? 2 : 50, i % 5 === 0 ? 1 : 0, pos ? 2 : 0],
    };
  };
  for (let i = 0; i < 40; i++) { rows.push(mk(i, 'en-en', true), mk(i, 'en-en', false), mk(i, 'en-indic', true), mk(i, 'en-indic', false)); }
  run(rows, { folds: 5, iters: 2000, lr: 0.1, l2: 1e-3, targetSame: 0.95, targetDiff: 0.95 }, 'SYNTHETIC-SELFTEST');
  console.log('\n## END SYNTHETIC SELF-TEST — these numbers are fake by construction ##');
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const path = argv.find((a) => !a.startsWith('--'));
  const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? Number(argv[i + 1]) : def; };
  const reportPath = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;
  const opts = { folds: opt('--folds', 5), iters: 4000, lr: 0.1, l2: 1e-3, targetSame: opt('--target-same', 0.95), targetDiff: opt('--target-diff', 0.95) };

  if (!path || !fs.existsSync(path)) {
    console.log('No features CSV provided. This harness fits the edge scorer from the');
    console.log('DB chat\'s canonical pair_scores extractor output. Expected columns:');
    console.log('  a_id,b_id,label,a_language,b_language,');
    console.log('  ' + FEATURES.join(','));
    console.log('  label ∈ {same_event,not_same_event,grayzone} (grayzone held out).');
    console.log('\nUsage: node scripts/fit-edge-scorer.cjs <features.csv> [--report out.json]');
    console.log('       node scripts/fit-edge-scorer.cjs --selftest');
    process.exit(2);
  }
  const rows = parseCsv(fs.readFileSync(path, 'utf8'));
  const report = run(rows, opts, path.split(/[\\/]/).pop());
  if (reportPath) { fs.writeFileSync(reportPath, JSON.stringify(report, null, 2)); console.log(`\nWROTE ${reportPath}`); }
  console.log('\n^ COMPUTED output. DB chat transcribes weights/thresholds into the scorer spec; analytics chat does not retype them.');
}
main();

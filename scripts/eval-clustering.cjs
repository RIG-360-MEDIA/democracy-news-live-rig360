#!/usr/bin/env node
/**
 * Clustering eval harness — the re-baseline gate.
 *
 * Scores a CLUSTERING OUTPUT (article_id -> cluster_id partition) against the
 * hand-built fixtures:
 *   docs/fixtures/cluster-golden.json     (134 groups: must-link / cannot-link / alone)
 *   docs/fixtures/cluster-recall-set.json (20 verified same-event events = must-link)
 *
 * Metrics (all COMPUTED from the partition — no hand-typed numbers, ever):
 *   - B-cubed precision / recall / F1   (over articles in known ground-truth groups)
 *   - must-link satisfaction            (same-event pairs landed together)
 *   - cannot-link violation / FALSE-MERGE rate   (look-alikes wrongly merged — precision killer)
 *   - anti-blob                         (blob_negative groups MUST split; global article:source cap)
 *   - singleton integrity              (alone-articles stay alone)
 *   - coverage                          (fixture articles present in the clustering output)
 *
 * INVARIANTS (this harness exists because the analytics chat fabricated numbers):
 *   - Writes ZERO hand-typed figures. Every number is computed from the input.
 *   - No clustering CSV -> prints the input contract + exits 2. Never invents a score.
 *   - The GATE verdict (GREEN/RED) is derived from computed metrics vs the bars
 *     passed in (or printed as INFO if --bars not given — bars get locked at re-baseline).
 *
 * Usage:
 *   node scripts/eval-clustering.cjs <clustering.csv> [--report out.json]
 *        [--bcubed-f1 0.0] [--max-false-merge 1.0] [--source-ratio 5]
 *   node scripts/eval-clustering.cjs --selftest
 *
 * clustering.csv columns (header required):
 *   article_id,cluster_id[,source_id]
 *   - article_id : uuid, matches the fixtures' article ids
 *   - cluster_id : the predicted story id (any stable string)
 *   - source_id  : optional, enables the article:source anti-blob ratio
 *
 * NOTE on V4: the clustering output MUST be produced from the V4 corpus
 * (embedding_revision='v4-tr-title-1024'); the ~3,527 V0 stragglers are excluded
 * upstream by that filter. This harness scores the partition it is given — keep
 * the V4 filter in the job that produces clustering.csv.
 */
'use strict';
const fs = require('fs');
const path = require('path');

// ───────────────────────── fixtures ─────────────────────────
function loadFixtures() {
  const g = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/fixtures/cluster-golden.json'), 'utf8'));
  const r = JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/fixtures/cluster-recall-set.json'), 'utf8'));
  return { golden: g.groups || [], recall: r.events || [] };
}

// topic-streams dropped from recall (verified-recall doc): bad denominators
const TOPIC_DROP = new Set(['ebola_drc', 'iran_us_deal', 'rubio_india', 'ipl_kkr_dc', 'russia_oreshnik', 'akunuri_murali']);

/**
 * Build ground-truth constraint sets from the fixtures.
 *  mustLink  : groups whose articles SHOULD share one cluster  (true_cluster, grayzone_merge, recall events)
 *  cannotIn  : groups whose articles are DIFFERENT events -> must NOT all be one cluster (fp_bait*, grayzone_separate)
 *  blobs     : blob_negative groups -> MUST split into >=2 clusters
 *  alone     : singleton articles -> SHOULD be alone
 */
function buildConstraints({ golden, recall }) {
  const mustLink = [], cannotIn = [], blobs = [], alone = [];
  for (const grp of golden) {
    const ids = (grp.article_ids || []).filter(Boolean);
    if (!ids.length) continue;
    switch (grp.type) {
      case 'true_cluster':
      case 'grayzone_merge':
        mustLink.push({ key: grp.id, ids, src: 'golden:' + grp.type }); break;
      case 'fp_bait_earnings':
      case 'fp_bait_template':
      case 'grayzone_separate':
        cannotIn.push({ key: grp.id, ids, src: 'golden:' + grp.type }); break;
      case 'blob_negative':
        blobs.push({ key: grp.id, ids, src: 'golden:blob_negative' }); break;
      case 'singleton':
        if (ids.length === 1) alone.push({ key: grp.id, id: ids[0] }); break;
      // fn_singleton / grayzone_borderline -> not hard-scored (ambiguous by design)
      default: break;
    }
  }
  for (const ev of recall) {
    if (TOPIC_DROP.has(ev.key)) continue;
    const ids = [...(ev.article_ids_recalled || []), ...(ev.article_ids_isolated || [])].filter(Boolean);
    if (ids.length >= 2) mustLink.push({ key: 'recall:' + ev.key, ids, src: 'recall' });
  }
  // Reconcile OVERLAPPING must-link groups: if golden true_cluster and a recall
  // event share an article, they describe the same event -> merge into one truth
  // class (union-find), else a perfect partition scores <100% (overlap artifact).
  const merged = mergeOverlapping(mustLink);
  return { mustLink: merged, cannotIn, blobs, alone };
}

/** Union-find merge of must-link groups that share any article id. */
function mergeOverlapping(groups) {
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { parent.set(find(a), find(b)); };
  groups.forEach((_, i) => parent.set(i, i));
  const owner = new Map(); // article -> first group index seen
  groups.forEach((g, i) => {
    for (const id of g.ids) {
      if (owner.has(id)) union(i, owner.get(id)); else owner.set(id, i);
    }
  });
  const byRoot = new Map();
  groups.forEach((g, i) => {
    const r = find(i);
    const m = byRoot.get(r) || { keys: [], ids: new Set(), srcs: new Set() };
    m.keys.push(g.key); g.ids.forEach((id) => m.ids.add(id)); m.srcs.add(g.src);
    byRoot.set(r, m);
  });
  return [...byRoot.values()].map((m) => ({ key: m.keys.join('+'), ids: [...m.ids], src: [...m.srcs].join(',') }));
}

// ───────────────────────── partition ─────────────────────────
function parseClusteringCsv(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim().length);
  if (!lines.length) throw new Error('empty clustering CSV');
  const header = lines[0].split(',').map((s) => s.trim());
  const ai = header.indexOf('article_id'), ci = header.indexOf('cluster_id'), si = header.indexOf('source_id');
  if (ai < 0 || ci < 0) throw new Error('clustering CSV needs columns: article_id,cluster_id[,source_id]');
  const cluster = new Map();   // article_id -> cluster_id
  const source = new Map();    // article_id -> source_id
  for (const line of lines.slice(1)) {
    const c = line.split(',');
    const a = (c[ai] || '').trim();
    if (!a) continue;
    cluster.set(a, (c[ci] || '').trim());
    if (si >= 0 && c[si] != null) source.set(a, (c[si] || '').trim());
  }
  return { cluster, source };
}

// ───────────────────────── metrics ─────────────────────────
/** B-cubed over articles that appear in a known ground-truth group (must-link ∪ alone). */
function bcubed(part, constraints) {
  // truth partition: each must-link group = a class; each alone article = singleton class
  const truth = new Map(); // article -> truth-class
  for (const g of constraints.mustLink) for (const id of g.ids) if (!truth.has(id)) truth.set(id, g.key);
  for (const a of constraints.alone) if (!truth.has(a.id)) truth.set(a.id, 'alone:' + a.id);

  // only score articles present in BOTH truth and the predicted partition
  const scored = [...truth.keys()].filter((id) => part.cluster.has(id));
  if (!scored.length) return { precision: null, recall: null, f1: null, scored: 0, truthArticles: truth.size };

  // index predicted clusters and truth classes (restricted to scored set)
  const predMembers = new Map(), truthMembers = new Map();
  for (const id of scored) {
    const p = part.cluster.get(id), t = truth.get(id);
    (predMembers.get(p) || predMembers.set(p, []).get(p)).push(id);
    (truthMembers.get(t) || truthMembers.set(t, []).get(t)).push(id);
  }
  let P = 0, R = 0;
  for (const id of scored) {
    const p = part.cluster.get(id), t = truth.get(id);
    const pm = predMembers.get(p), tm = truthMembers.get(t);
    let inter = 0;
    const tset = new Set(tm);
    for (const o of pm) if (tset.has(o)) inter++;
    P += inter / pm.length;   // correct / predicted-together
    R += inter / tm.length;   // correct / truth-together
  }
  P /= scored.length; R /= scored.length;
  const f1 = P + R ? (2 * P * R) / (P + R) : 0;
  return { precision: P, recall: R, f1, scored: scored.length, truthArticles: truth.size };
}

/** must-link pair satisfaction (same predicted cluster). */
function mustLinkSat(part, groups) {
  let pairs = 0, ok = 0, scoredGroups = 0;
  const per = [];
  for (const g of groups) {
    const ids = g.ids.filter((id) => part.cluster.has(id));
    if (ids.length < 2) continue;
    scoredGroups++;
    let gp = 0, gok = 0;
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      gp++; if (part.cluster.get(ids[i]) === part.cluster.get(ids[j])) gok++;
    }
    pairs += gp; ok += gok;
    per.push({ key: g.key, pairs: gp, satisfied: gok, rate: gp ? gok / gp : null });
  }
  return { pairs, satisfied: ok, rate: pairs ? ok / pairs : null, scoredGroups, per };
}

/** cannot-link / false-merge: pairs that should be APART but are together. */
function falseMerge(part, cannotGroups) {
  // within each cannot-group, all distinct pairs are different events -> must be apart
  let pairs = 0, violated = 0;
  const offenders = [];
  for (const g of cannotGroups) {
    const ids = g.ids.filter((id) => part.cluster.has(id));
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      pairs++;
      if (part.cluster.get(ids[i]) === part.cluster.get(ids[j])) { violated++; offenders.push({ key: g.key, a: ids[i], b: ids[j], cluster: part.cluster.get(ids[i]) }); }
    }
  }
  return { pairs, violated, rate: pairs ? violated / pairs : null, offenders: offenders.slice(0, 20) };
}

/** anti-blob: blob_negative groups must split; global article:source ratio cap. */
function antiBlob(part, blobs, sourceRatioCap) {
  // 1) blob_negative groups must NOT collapse to a single cluster
  const blobResults = blobs.map((b) => {
    const ids = b.ids.filter((id) => part.cluster.has(id));
    const clusters = new Set(ids.map((id) => part.cluster.get(id)));
    return { key: b.key, articles: ids.length, distinctClusters: clusters.size, split: clusters.size >= 2 || ids.length < 2 };
  });
  const blobsHeld = blobResults.every((b) => b.split);

  // 2) global: any predicted cluster whose article:distinct-source ratio exceeds cap
  const members = new Map();
  for (const [a, c] of part.cluster) (members.get(c) || members.set(c, []).get(c)).push(a);
  const oversized = [];
  let maxRatio = null;
  for (const [c, arts] of members) {
    const srcs = new Set();
    let haveSrc = 0;
    for (const a of arts) { const s = part.source.get(a); if (s) { srcs.add(s); haveSrc++; } }
    if (!haveSrc) continue; // ratio needs source_id
    const ratio = arts.length / Math.max(1, srcs.size);
    if (maxRatio == null || ratio > maxRatio) maxRatio = ratio;
    if (sourceRatioCap != null && ratio > sourceRatioCap && arts.length >= 8) oversized.push({ cluster: c, articles: arts.length, sources: srcs.size, ratio: +ratio.toFixed(2) });
  }
  return { blobsHeld, blobResults, maxArticleSourceRatio: maxRatio, oversized: oversized.slice(0, 20), ratioMeasured: maxRatio != null };
}

/** singleton integrity: alone-articles should not share a cluster with anyone else. */
function singletonIntegrity(part, aloneList) {
  // build cluster sizes
  const size = new Map();
  for (const [, c] of part.cluster) size.set(c, (size.get(c) || 0) + 1);
  let scored = 0, ok = 0; const violated = [];
  for (const a of aloneList) {
    if (!part.cluster.has(a.id)) continue;
    scored++;
    const c = part.cluster.get(a.id);
    if ((size.get(c) || 0) <= 1) ok++; else violated.push({ key: a.key, id: a.id, clusterSize: size.get(c) });
  }
  return { scored, ok, rate: scored ? ok / scored : null, violated: violated.slice(0, 20) };
}

function coverage(part, constraints) {
  const all = new Set();
  for (const g of constraints.mustLink) for (const id of g.ids) all.add(id);
  for (const g of constraints.cannotIn) for (const id of g.ids) all.add(id);
  for (const b of constraints.blobs) for (const id of b.ids) all.add(id);
  for (const a of constraints.alone) all.add(a.id);
  let present = 0; for (const id of all) if (part.cluster.has(id)) present++;
  return { fixtureArticles: all.size, presentInClustering: present, rate: all.size ? present / all.size : null };
}

// ───────────────────────── run + gate ─────────────────────────
function evaluate(part, fixtures, bars, tag) {
  const constraints = buildConstraints(fixtures);
  const cov = coverage(part, constraints);
  const bc = bcubed(part, constraints);
  const ml = mustLinkSat(part, constraints.mustLink);
  const fm = falseMerge(part, constraints.cannotIn);
  const ab = antiBlob(part, constraints.blobs, bars.sourceRatio);
  const si = singletonIntegrity(part, constraints.alone);

  const report = {
    tag, generatedFrom: 'computed', coverage: cov,
    bcubed: bc, mustLink: { rate: ml.rate, pairs: ml.pairs, satisfied: ml.satisfied, groups: ml.scoredGroups },
    falseMerge: { rate: fm.rate, violated: fm.violated, pairs: fm.pairs, offenders: fm.offenders },
    antiBlob: { blobsHeld: ab.blobsHeld, blobResults: ab.blobResults, maxArticleSourceRatio: ab.maxArticleSourceRatio, oversized: ab.oversized, ratioMeasured: ab.ratioMeasured },
    singleton: { rate: si.rate, ok: si.ok, scored: si.scored, violated: si.violated },
    mustLinkPerGroup: ml.per,
  };

  // GATE — only assert bars that were provided; otherwise INFO
  const checks = [];
  const push = (name, pass, detail) => checks.push({ name, pass, detail });
  if (bars.bcubedF1 != null) push('bcubed_f1', bc.f1 != null && bc.f1 >= bars.bcubedF1, `${fmt(bc.f1)} >= ${bars.bcubedF1}`);
  if (bars.maxFalseMerge != null) push('false_merge_rate', fm.rate != null && fm.rate <= bars.maxFalseMerge, `${fmt(fm.rate)} <= ${bars.maxFalseMerge}`);
  push('anti_blob_held', ab.blobsHeld, ab.blobResults.map((b) => `${b.key}:${b.distinctClusters}cl`).join(' '));
  if (bars.minMustLink != null) push('must_link_rate', ml.rate != null && ml.rate >= bars.minMustLink, `${fmt(ml.rate)} >= ${bars.minMustLink}`);
  if (bars.minCoverage != null) push('coverage', cov.rate != null && cov.rate >= bars.minCoverage, `${fmt(cov.rate)} >= ${bars.minCoverage}`);

  const asserted = checks.filter((c) => c.detail !== undefined);
  const verdict = asserted.length ? (asserted.every((c) => c.pass) ? 'GREEN' : 'RED') : 'INFO (no bars asserted — lock at re-baseline)';
  report.gate = { verdict, checks };
  return report;
}

const fmt = (x) => x == null ? 'NA' : (typeof x === 'number' ? (Math.abs(x) <= 1 ? (x * 100).toFixed(1) + '%' : x.toFixed(2)) : String(x));

function printReport(rep) {
  console.log(`\n=== clustering eval ${rep.tag ? '(' + rep.tag + ')' : ''} ===`);
  const c = rep.coverage;
  console.log(`coverage: ${c.presentInClustering}/${c.fixtureArticles} fixture articles in clustering (${fmt(c.rate)})`);
  const b = rep.bcubed;
  console.log(`B-cubed:  P=${fmt(b.precision)}  R=${fmt(b.recall)}  F1=${fmt(b.f1)}   (scored ${b.scored} articles)`);
  console.log(`must-link: ${fmt(rep.mustLink.rate)}  (${rep.mustLink.satisfied}/${rep.mustLink.pairs} pairs, ${rep.mustLink.groups} groups)`);
  console.log(`FALSE-MERGE: ${fmt(rep.falseMerge.rate)}  (${rep.falseMerge.violated}/${rep.falseMerge.pairs} cannot-link pairs)  <- precision killer`);
  console.log(`anti-blob: blobs-held=${rep.antiBlob.blobsHeld}  maxArticle:SourceRatio=${rep.antiBlob.ratioMeasured ? rep.antiBlob.maxArticleSourceRatio : 'NA (no source_id)'}  oversized=${rep.antiBlob.oversized.length}`);
  console.log(`singleton: ${fmt(rep.singleton.rate)}  (${rep.singleton.ok}/${rep.singleton.scored} stayed alone)`);
  console.log('\nGATE: ' + rep.gate.verdict);
  for (const ck of rep.gate.checks) console.log(`  [${ck.pass ? 'PASS' : 'FAIL'}] ${ck.name}: ${ck.detail}`);
  if (rep.falseMerge.offenders.length) {
    console.log('\nfalse-merge offenders (first few):');
    for (const o of rep.falseMerge.offenders.slice(0, 5)) console.log(`  ${o.key}: ${o.a.slice(0, 8)} + ${o.b.slice(0, 8)} both in ${String(o.cluster).slice(0, 12)}`);
  }
}

// ───────────────────────── self-test ─────────────────────────
function selftest() {
  console.log('############################################################');
  console.log('## SYNTHETIC SELF-TEST — fixture-derived partitions — fake  ##');
  console.log('############################################################');
  const fixtures = loadFixtures();
  const constraints = buildConstraints(fixtures);

  // PERFECT clustering: every must-link group its own cluster, each cannot-link
  // article its own cluster, singletons alone, blobs split per-article.
  const perfect = new Map(), src = new Map();
  for (const g of constraints.mustLink) for (const id of g.ids) perfect.set(id, 'C_' + g.key);
  for (const g of constraints.cannotIn) g.ids.forEach((id, i) => perfect.set(id, 'X_' + g.key + '_' + i));
  for (const b of constraints.blobs) b.ids.forEach((id, i) => perfect.set(id, 'B_' + b.key + '_' + i));
  for (const a of constraints.alone) perfect.set(a.id, 'S_' + a.id);
  for (const id of perfect.keys()) src.set(id, 'src_' + (Math.abs(hash(id)) % 50));
  printReport(evaluate({ cluster: perfect, source: src }, fixtures,
    { bcubedF1: 0.95, maxFalseMerge: 0.01, minMustLink: 0.95, sourceRatio: 5, minCoverage: 0.99 }, 'PERFECT (should be GREEN)'));

  // BROKEN clustering: everything in ONE cluster (the 29,798-blob shape).
  const broken = new Map();
  for (const id of perfect.keys()) broken.set(id, 'ONE_BIG_BLOB');
  printReport(evaluate({ cluster: broken, source: src }, fixtures,
    { bcubedF1: 0.95, maxFalseMerge: 0.01, minMustLink: 0.95, sourceRatio: 5, minCoverage: 0.99 }, 'ALL-ONE-CLUSTER (should be RED: false-merge + anti-blob fail)'));
  console.log('\n## END SELF-TEST — perfect must be GREEN, all-one-blob must be RED ##');
}
function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h | 0; }

// ───────────────────────── main ─────────────────────────
function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--selftest')) return selftest();
  const file = argv.find((a) => !a.startsWith('--'));
  const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? Number(argv[i + 1]) : d; };
  const bars = {
    bcubedF1: argv.includes('--bcubed-f1') ? opt('--bcubed-f1') : null,
    maxFalseMerge: argv.includes('--max-false-merge') ? opt('--max-false-merge') : null,
    minMustLink: argv.includes('--min-must-link') ? opt('--min-must-link') : null,
    minCoverage: argv.includes('--min-coverage') ? opt('--min-coverage') : null,
    sourceRatio: opt('--source-ratio', 5),
  };
  const reportPath = argv.includes('--report') ? argv[argv.indexOf('--report') + 1] : null;

  if (!file || !fs.existsSync(file)) {
    console.log('Clustering eval harness — the re-baseline gate.');
    console.log('No clustering CSV given. Expected: article_id,cluster_id[,source_id]');
    console.log('  (clustering.csv must be produced from the V4 corpus:');
    console.log("   embedding_revision='v4-tr-title-1024'; V0 stragglers excluded upstream.)");
    console.log('\nUsage: node scripts/eval-clustering.cjs <clustering.csv> \\');
    console.log('         [--bcubed-f1 N] [--max-false-merge N] [--min-must-link N] \\');
    console.log('         [--min-coverage N] [--source-ratio N] [--report out.json]');
    console.log('       node scripts/eval-clustering.cjs --selftest');
    console.log('\nBars are unset by default -> verdict = INFO. They get LOCKED at the re-baseline.');
    process.exit(2);
  }
  const fixtures = loadFixtures();
  const part = parseClusteringCsv(fs.readFileSync(file, 'utf8'));
  const rep = evaluate(part, fixtures, bars, path.basename(file));
  printReport(rep);
  if (reportPath) { fs.writeFileSync(reportPath, JSON.stringify(rep, null, 2)); console.log(`\nWROTE ${reportPath}`); }
  console.log('\n^ COMPUTED from the partition. DB chat transcribes the locked scorecard; analytics chat retypes nothing.');
}
main();

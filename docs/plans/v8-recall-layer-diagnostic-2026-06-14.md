# _v8 recall-layer diagnostic — localize the recall loss BEFORE the θ-sweep

**Why:** θ=0.668 eval → P=93.0% (beats 91%) but **R=42.4% (below 54% bar)**, must-link
10.4%. Before burning a ~2h ingestion-pause on a 6-point θ-sweep, prove the recall loss is
threshold-bound (sweep fixes it) and not candidate-gen-bound (sweep is wasted). The graph is
thin — 434,088 edges / 274,426 nodes ≈ 1.6 edges/node — so ANN-recall is a live suspect.

## The probe (read-only, minutes, no pause)
Source of truth = the recall set: `docs/fixtures/cluster-recall-set.json` (20 events,
`article_ids_recalled`). For every WITHIN-EVENT article pair (these SHOULD be co-clustered),
classify it against the _v8 build (`run_id=1781406460`):

For each pair (a,b):
- **L0 — no edge in `story_edges_v8`** → candidate-gen/ANN never surfaced the pair. θ-sweep
  CANNOT recover these. Fix = raise HNSW `ef_search` (query-time) and/or candidate-K.
- **L1 — edge exists, score < 0.668** → scorer threshold too strict. θ-sweep toward 0.62
  DOES recover these. This is the case that justifies the sweep.
- **L2 — edge exists, score ≥ 0.668, but a,b in DIFFERENT story_ids** → not a threshold or
  ANN problem; Leiden resolution / scorer pair-vs-cluster gap. Sweep won't fix; resolution does.

Report the 3-way split (counts + % of scored pairs), and for L1 the score histogram in
[0.55, 0.668] (shows how much recall a drop to 0.64 / 0.62 actually buys).

## Decision tree (analytics locks off the counts)
- **L0 dominates** → DON'T sweep yet. Re-run candidate-gen with higher ef_search/K first
  (cheaper than 6 re-clusters), then one eval. The 434K/274K thinness predicts this.
- **L1 dominates** → fire `run_v8_sweep.sh` (0.62–0.668). The sweep is the right tool;
  use the L1 histogram to pick the candidate θ range instead of blind 6 points.
- **L2 dominates** → sweep won't help; revisit Leiden resolution / the pair scorer.

## Also before adopt — materialize the SPLIT (cheap, no re-cluster)
The eval'd members are BASE clusters; the 55 discriminator SPLITs are computed but not
written. Materializing = reassign each SPLIT cluster's members to their Leiden
sub-community story_ids (a member-reassignment, NOT a re-cluster, NO pause). Do this, then
re-eval at 0.668 → that is the TRUE _v8 false-merge (expected well below 37.9%, since the
offenders sit in `0d6c8848` which is already marked SPLIT). Note: split only touches the
≥100 giants, so it does NOT change recall on the normal-size recall-set events — recall and
false-merge are separate populations, fixed by separate levers.

## Order of operations
1. Run the probe (above) → localize recall layer.
2. Materialize SPLIT → re-eval 0.668 → true false-merge.
3. THEN, only if L1: fire the sweep off-peak. If L0: fix ef_search first.
No 2h pause until step 1 says the pause buys recall.

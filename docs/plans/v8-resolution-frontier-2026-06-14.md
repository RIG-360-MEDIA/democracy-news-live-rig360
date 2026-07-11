# _v8 <100-split resolution frontier — the deciding both-ways probe (read-only, no pause)

The clustering-param lever's LAST test. res 3.0 shatters legit small stories (confetti:
654→9,141 pieces, a legit India-data-centre story → 8 fragments); base (no <100 split)
under-merges (FM 31%). Question: does a MIDDLE resolution separate the junk over-merges
(46bd4ff7-type) WITHOUT shattering legit small stories (2a2dca43-type)? If yes → that's the
adopt config. If no → over-merge and legit story are structurally indistinguishable at this
signal → it's a scorer/embedding job, and the lever is CLOSED. _v8 = run_id 1781406460.
Raw grid → `/tmp/v8_res_frontier.txt`; analytics reads/locks.

## Sweep
Apply the <100 split at **res ∈ {1.2, 1.5, 1.8, 2.2}**, member-reassignment on the existing
build (no re-cluster, no pause). Anchor the grid with the two known points already measured:
base/no-split (FM 31.0 / R 39.6) and res 3.0 (FM 8.6 / R 31.8). So the frontier is visible
end to end.

## Anti-confetti guard (apply at every res — this is the fix for res 3.0's failure)
Only ACCEPT a cluster's split if the partition yields **≥2 sub-communities each ≥5 members**
with the rest a small residual; if a split produces mostly tiny/singleton pieces, **leave the
cluster intact** (don't emit confetti). Report, per res: clusters split, avg pieces/split,
singleton-piece %. A healthy operating point splits FEW clusters into 2–3 coherent pieces, not
many into dozens.

## Re-eval BOTH metrics at every res (the gate)
- **Precision:** false-merge (target **< ~15%**).
- **Recall:** B-cubed recall + must-link — must hold **≥ ~39%** (the materialized-split
  baseline). Report GLOBAL recall AND recall on the small/normal recall-set events only
  (the population the <100 split actually touches — global is confounded by the mega-events
  the split never reaches).
- Over-fragmentation count (above).

## Decision rule (analytics locks off the grid)
- **A res clears iff FM < ~15% AND recall ≥ ~39% AND low over-fragmentation** (splits yield
  few, ≥5-member coherent pieces). If several clear, pick the one MAXIMIZING recall. → that +
  the giant split = the adopt config.
- **If NONE clears** → the clustering-param lever is closed. The over-merge is structurally
  indistinguishable from a legit story at the edge signal → scorer/embedding work (bigger).
  Then the honest call is **adopt-anyway**: general B-cubed precision is already high; the
  residual is ~3 adversarial-bait clusters; a high-general-precision live layer beats a
  13-day-dead keeper, with those ~3 over-merges as bounded post-launch cleanup.

## Report
The full grid: res → FM, recall(global), recall(small-events), clusters-split,
pieces/split, singleton%. Raw. No DB writes, no re-cluster, no pause. This grid IS the
adopt-or-invest decision surface.

# Clustering Golden Set — regression fixture
**File:** `cluster-golden.json` · **Built:** 2026-05-29 · **Threshold proven:** 0.83
**Source:** prototype clustering on the full last-7-day corpus (10,610 articles) +
regex FP-bait, hand-adjudicated.

## What it is
134 labeled groups of real article IDs the clusterer must handle correctly.
Each group has `article_ids`, a `type`, an `expected` outcome, and a `note`.

| Type | Count | Expected |
|---|---|---|
| `true_cluster` | 83 | MERGE into one cluster |
| `blob_negative` | 2 | SPLIT — single-linkage chain, must NOT be one cluster |
| `fp_bait_earnings` | 5 | SEPARATE — different companies, template-similar |
| `fp_bait_template` | 4 | SEPARATE — store-hours / gold-rate / horoscope listicles |
| `grayzone_merge` | 19 | MERGE — same story at 0.78–0.83 (mostly cross-lingual) |
| `grayzone_separate` | 3 | SEPARATE — same template, different event |
| `grayzone_borderline` | 3 | judgment call — do not hard-fail |
| `singleton` | 13 | ALONE |
| `fn_singleton` | 2 | KNOWN cross-lingual miss — should have merged (recall gap) |

## How to use (the regression test)
Re-cluster each group's `article_ids` with the candidate clusterer, then check:
- `merge` → all ids land in one cluster
- `separate` / `split` → ids land in >1 cluster
- `alone` → id stays a singleton
Score pairwise P/R + B-cubed + per-category. Run on every model/threshold/algo change.

## Two calibration findings this set surfaced (shape the build)

### 1. Blob signature = article:source ratio ≥ 3
The two `blob_negative` groups are single-linkage chains: 14 articles / 4 sources
(ratio 3.5) and **55 articles / 4 sources (ratio 13.75)** — mixing Ebola with
cricket, SpaceX with a constable's car crash. Clean clusters sit at ratio ≤ 2.5
(coal-mine 27/20 = 1.35, petrol 42/20 = 2.1). **Guard: mutual-kNN edges + cap the
article:source ratio (~3) and re-split above it.** This is the #1 build instruction.

### 2. 0.83 sacrifices cross-lingual recall — lower to ~0.80 behind the guard
19 `grayzone_merge` pairs are genuine same-story matches sitting at **0.80–0.82,
just under 0.83** — and most are cross-lingual (EN↔TE↔HI↔OD). Plus a Kannada
"China coal mine" article was left a singleton (`fn_singleton`) — a clear miss.
So 0.83 is precise but **drops cross-lingual matches**. Because the blob guard
(finding #1) gives precision independently, we can **lower the threshold to ~0.80
for recall and let the guard hold precision.** Evidence-based resolution of the
threshold tension. (Kannada/Odia are weakest — lowest-resource in LaBSE.)

### Bonus: the cross-encoder reranker's exact job
The FP-bait shows the precision trap is **same-template / different-entity**:
different companies' Q4 results, different football matches ("MW38 Man City v Villa"
vs "Spurs v Everton"), different heatwave regions. The set also keeps the TRUE
same-company earnings (Pine Labs, Eicher) — so the reranker must *distinguish*
"same template" from "same event," not just down-weight templates.

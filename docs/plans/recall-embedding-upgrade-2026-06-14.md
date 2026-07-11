# Future Enhancement — Story-Engine Recall / Embedding Upgrade

**Status:** DEFERRED (post-launch, gated). **Not a launch blocker.** Created 2026-06-14.
**Owner when picked up:** DB/engine chat. **Analytics:** the A/B eval gate.

> One-line: swap LaBSE for a retrieval-trained multilingual embedder (+ a cross-encoder reranker
> on hard pairs, + full-text chunked input) to lift same-event recall — but ONLY after launch and
> ONLY if real usage proves recall actually bites. The cheap A/B sample is the trigger, not a hunch.

---

## The problem this addresses
Story-engine recall is candidate-gen-bound (probe-proven 2026-06-14): same-event-different-angle
articles sit at MID cosine (~0.5–0.7), below `CAND_COS=0.80`, so they never become candidates.
Proven NOT fixable by θ-sweep or ef_search. The loss is NARROW — normal/small stories cluster at
68–100% (member-fit ~0.92); recall only collapses on a few large multi-angle mega-events (the
Iran deal = ~2/3 of all misses). See `story-engine-prelaunch` memory + the `v8-recall-*` probe
docs.

## Why this is DEFERRED, not done now
1. **Not the blocker.** The launch gate is the forward-loop join-hardening (Phase 0), which this
   doesn't touch.
2. **Already designed around.** Worldwide's **B+ event hub** presents mega-events as
   angle-substories under one umbrella — turning most of the "recall miss" into intentional
   coverage (same pattern as Google News "Full Coverage"). The payoff this upgrade buys is largely
   already captured.
3. **Premature before shipping.** We haven't seen real behavior. The "title-only → full-text"
   theory was already WRONG once and killed by measurement; don't commit a half-day rebuild on a
   hunch.
4. **It's a real workstream, not just a rerun.** New model + full-text chunking + cross-encoder
   integration + the full re-verify-one-clean-recipe dance (the v4 saga). Compute is ~half a day;
   the build is more.

## The three levers (do them in ONE re-embed + recluster pass)
1. **Swap LaBSE → a retrieval-trained multilingual embedder** (BGE-M3 / multilingual-E5-large /
   Cohere-multilingual family). LaBSE was trained for *bitext mining* (translation matching), not
   *same-event* similarity; retrieval-trained models place "Iran markets" and "Iran military"
   closer. Stays on-box, no API cost. Keep multilingual — a frontier English embedder may be WORSE
   at Telugu/Hindi event-matching (LaBSE's actual strength, and why it was chosen).
2. **Cross-encoder / local-LLM judge on borderline pairs only.** Our bi-encoder compares
   independent vectors and can't *read two articles together*. A cross-encoder (e.g. bge-reranker)
   judges the hard near-threshold pairs jointly — highest accuracy-per-dollar because it's only the
   ambiguous few. (If using an LLM judge instead, restrict to the few-hundred truly-ambiguous; do
   NOT run an LLM over tens of thousands of pairs.)
3. **Full-text, cleaned + chunked input.** Today we embed title + ~1024-char lead; the shared event
   context often lives deeper in the body. Strip boilerplate (the model caps ~512 tokens) and chunk.

## ETAs — compute only (no coding), one combined pass
**The swing factor: run the re-embed on the 4090 (TRIJYA-7), not the Hetzner CPU box.**

| Step | On 4090 | On Hetzner CPU |
|---|---|---|
| Re-embed 274K (new model + full-text chunked) — the dominant cost | ~2–4 h | ~8–12 h+ (overnight) |
| HNSW index build (new column) | ~20–40 min | ~20–40 min |
| Recluster (candidate-gen + scorer + Leiden) | ~25 min | ~25 min |
| + cross-encoder rerank (borderline pairs only) | +~15–30 min | +~1–2 h |
| Re-enrich (SQL aggregation, no LLM) | ~15 min | ~15 min |
| Eval (golden 134 + recall 20) | ~10 min | ~10 min |
| **TOTAL (all three)** | **~3.5–5.5 h** | **overnight (~10–15 h)** |

Lever 1 alone (title+lead, no full-text) is faster to embed (~30–90 min on the 4090).

## The gate to actually do it (measure-first)
1. **Trigger:** post-launch, real usage shows recall bites — fragmented normal stories users
   notice, or B+ hubs grouping poorly. Until then, don't.
2. **Cheap A/B FIRST (~15–30 min):** embed ONLY the recall-set + a few-thousand-article sample
   under the candidate model; confirm it lifts same-event recall **without** hurting precision.
   Build-dark, new column.
3. **Only if the A/B wins → commit the full re-embed** (the table above), build-dark into a new
   column, re-verify single-recipe (no seam — the v4 lesson), re-index, recluster, re-eval, then
   swap behind the parachute.

## Possible bonus (a reason it might move up the list)
Better embeddings → cleaner candidate edges → could reduce the forward-loop's false-joins. BUT the
join guards (junk filter, corroboration, template guard) are needed REGARDLESS, so this is not a
reason to do embeddings before Phase-0 hardening — just a reason to keep it on the list.

## Related deferred fast-follows (separate, also non-blocking)
- **alias-cleanup-v2** (precision): purge generic junk over-extractions (theresa may / mick price /
  tumkur city / domestic) at the extraction layer — fixes the ~3 over-merges the clustering-param
  lever couldn't.
- **subject_country accuracy**: international stories tagged by dominant *source* geography (affects
  country scope, not World).
- **real per-dateline timeline** (FR-013 is summary-only in v1).

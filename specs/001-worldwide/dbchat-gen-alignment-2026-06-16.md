# Content-gen ↔ front-page alignment contract (2026-06-16)

## The issue (communication / contract)
A card opens to a real read only if that story already has a published article. Today ~32 do, so
most cards are stubs. Worse: the gen-cron picks stories by the **engine's raw `importance_score`**,
but the **front page picks by a DIFFERENT ranking** (recency-gated + pile-demoted, recomputed in the
Next app). So the cron generates for stories the page may not show, and skips stories it does show.
We need the cron to generate for **exactly the set the front page surfaces.**

Since the cron is Python on the box and my ranking lives in the (not-yet-deployed) Next app, the
contract below is the **exact selection logic** for the cron to replicate. (Once the app deploys
on the box — Phase 5 — the cron can instead just call `/api/worldwide` and read the shown ids; until
then, replicate this.)

## What I need (the target set to generate)
Each cron cycle, generate a published article for every story in **A ∪ B** that lacks a current
PUBLISHABLE article — skip-unchanged (don't regen unless `fact_version` moved).

**Set A — top ~500 by the FRONT-PAGE importance** (this is the recency-gate + pile-demotion the
page uses; port verbatim):
```sql
-- pool = surfaced, non-junk
WHERE sc.suppression_reason IS NULL
  AND sc.independent_source_count IS NOT NULL
  AND sc.representative_title !~* '(share price|top picks|result 20[0-9]{2}|gainers (and|&) losers|dream ?11|sensex|nifty|share market)'
-- importance (maxd.m = max(last_seen_at) over the corpus; f.fc = fact count; a = representative article):
importance = round((
    ( 1.0*ln(1+sc.independent_source_count)
    + 0.5*ln(1+least(coalesce(f.fc,0),15))
    + (CASE coalesce(a.source_tier,2) WHEN 1 THEN 1.0 WHEN 2 THEN 0.3 ELSE 0.0 END) )
  * (0.15 + 0.85*exp(-extract(epoch FROM (maxd.m - sc.last_seen_at))/86400.0/1.5))   -- recency GATE
  * (CASE WHEN g.strategy='stub' AND g.status ILIKE '%HELD%' THEN 0.25 ELSE 1.0 END) -- pile demotion
)::numeric, 2)
ORDER BY importance DESC LIMIT 500
```
This naturally prioritises **recent + coherent** stories (a huge-but-old or multi-event pile sinks),
which is exactly what the page shows.

**Set B — the split angle-stories (hub members):** every `algo_version='night-repair-v8'` child
cluster with `last_seen_at` within the last ~4 days. These are the members of the "Full coverage"
hubs on the page — each needs its own article so the hubs are fully clickable.

**Skip:** multi-event piles (Guard-C SEVERAL → `strategy='stub'`); do NOT spend gen on them — correct.

## How it should work (per cycle)
1. Recompute A ∪ B (above).
2. For each not-yet-published / fact_version-changed story → run the gen pipeline (gen_hybrid → verify
   → store), Guard-C gating as built.
3. Verifier: gpt-oss-120b, temp-0 + 2-of-3 majority (not pinned) — as set.
4. Skip-unchanged so it converges; cron cadence as-is.

## What to verify + report back (raw)
- **Coverage of the shown set:** of Set A∪B, what % now have a PUBLISHABLE non-stub article. Target → most of A∪B.
- **Hub members specifically:** of the night-repair-v8 children (Set B), what % have articles (so hubs aren't half-empty).
- Fill cadence (articles/cycle), any gen failures, Guard-C-held count.
- **The acceptance test:** re-run `GET /api/worldwide?scope=world` → the `hasArticle=true` count across `topStories` + `sections` should climb from a handful toward most. Send me that count.

## The durable fix (Phase 5)
Once the Next app is deployed on the box, replace the replicated SQL with: cron calls
`/api/worldwide` (+ a small `?shown=1` shown-set endpoint I'll add) → reads the exact surfaced ids →
generates those. Single source of truth, no SQL duplication. For now, the contract above.

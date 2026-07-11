# Story-Enrichment Spec — the per-story "data sheet" (2026-06-12)

**From:** analytics chat (design). **Status:** spec, build AFTER `_v8` clustering
+ the over-merge split rule land. Pairs with `content-gen-design-2026-06-03.md`
(this is its upstream input) and `worldwide-build-spec-2026-05-30.md` (the consumer).

---

## Why this exists
The product currently fights dirty article-level fields: ~39% of stories tagged
`OTHER`, alias-overreach entities ("Congress"=4 parties), AEM hallucinations
patched consumer-side (textual.py/posture.py). The durable fix is a **single
clean, verified record per story** — the "story data sheet" — written by an LLM
pass downstream of clustering. Every section, ranking, and content-gen reads the
sheet, NOT the raw matviews. This retires the consumer-side patches.

**Pipeline position:** ingest → cluster (`_v8`) → over-merge split → **story
enrichment (this)** → product/content-gen.

---

## Two tiers (do NOT LLM-generate everything)
- **Tier 1 — LIGHT enrichment, ALL new stories** (~1,500/day, free on 4090 Qwen).
  The clean fact-sheet ranking + sections need on every candidate. Cheap.
- **Tier 2 — HEAVY prose generation, WINNERS only** (~few hundred/day that
  surface). Full Atlantic-style article. This is content-gen-design's job; the
  Tier-1 sheet is its input. Out of scope here except as the contract.

## Consolidate, do NOT re-extract from scratch
Articles already carry `entities_extracted`, claims, quotes, numbers,
`summary_executive`; the story aggregates them (`story_facts/quotes/...`). The
LLM **cleans and merges** these into one record + fills gaps — it does not re-read
raw text blind. Lean on the trustworthy signal (clean top-3 co-mention entities);
fix the dirty parts (topic=OTHER, alias-overreach).

## The story data sheet (Tier-1 fields — start small, grow on demand)
| Field | Risk | Source |
| --- | --- | --- |
| `topic` (never OTHER) | low | LLM classify from content |
| `headline` + `dek` | low | LLM from members |
| `scope` (country/region) | low | clean from article_locations + LLM |
| `subject_entities` (the real actors, deduped) | low-med | clean the top-3 keeper entities |
| `summary` (faithful, short) | med | LLM, grounded |
| `facts` (value + unit + source) | **HIGH** | verified-only (see below) |
| `timeline` (multi-source) | med | from member dates |
| `perspectives`/stance (later, All Sides) | med | from article_stances |

Don't speculatively build a giant schema — add a field when a consumer needs it.

## Verifier-FIRST, tier by risk (banked rule — non-negotiable)
- **Low-risk (topic/headline/scope):** classify freely; sanity-check only.
- **HIGH-risk (facts, numbers, quotes, claims about named living people = libel):**
  must be **verified against the source articles before storing.** Never store an
  LLM-extracted number/quote blind. Build + prove the faithfulness verifier BEFORE
  trusting extracted facts. On verify-fail → drop the fact, fall back to the
  extractive value, never publish unverified.

## Re-run trigger — material change, NOT per article
A story is a living cluster. Re-running per attached article = the Iran story
(4,310 arts) firing 4,310×. Instead:

1. **Formation:** 1 run when the story is born.
2. **State-signature gate (deterministic, no LLM):** hash the story's
   {independent-source set + entity set + fact set}. Re-enrich only when the
   signature shifts beyond a small threshold — i.e. a NEW independent source, a
   NEW entity/number/claim, or a size milestone (1→3→10). 50 reprint articles that
   add nothing → signature barely moves → no run.
3. **Debounce:** ≤1 re-run per story per N hours; batch the window's changes into
   one pass.
4. **Freeze:** once a story stops materially changing (or ages out of the live
   window), stop re-enriching. Old stories frozen permanently.
5. **Partial re-run (optimization, later):** topic rarely changes once set —
   re-run only the parts new articles touched (timeline/facts/summary). v1: redo
   the light sheet.

**Volume:** ~1,500 formations + a few hundred re-runs/day ≈ ~2,000 calls/day,
free on local Qwen3-32B. 95% single-article stories = exactly 1 run, ever.

---

## Open / re-confirm
- Exact state-signature threshold + debounce window N → calibrate on `_v8`.
- Verifier contract (source-grounded? miss-rate? quote/number/libel coverage) —
  the linchpin, shared with content-gen-design §6.
- Model: local Qwen3-32B on the 4090 (free per-call) — confirm latency at
  ~2,000/day batch.

## Owner split
Analytics: this spec + the field schema + verifier eval design. Product/DB chat:
the enrichment job + storage (`analytics.story_enrichment_*` or sheet columns).
Build AFTER `_v8` + split rule are locked.

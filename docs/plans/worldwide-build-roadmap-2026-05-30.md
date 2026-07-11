# Worldwide — Build Roadmap (phased, dependency-aware)
**Date:** 2026-05-30 · Companion to `worldwide-build-spec-2026-05-30.md`.
Read the spec for *what/why*; this is *what to build, in what order, and what each step gates.*
**Owners:** 🟦 this chat (analytics + app) · 🟧 database chat (substrate/pipeline)

---

## Dependency map (which feature affects which)
```
embed-at-ingest ─┐
substrate drain ─┼─► CLUSTERING (story pool) ─┬─► every section
model pin ───────┘                            ├─► Around the World
                                              ├─► Who's in the News
                                              └─► content-gen (winners only)
CLUSTERING ─► importance score ─► ranking ─┬─► what shows in each section
region tagging ─► scope filter ────────────┴─► all sections re-scope + Around the World
ranking ─► materialized editions ─► the page reads it
kill-switch ─► (runs before) ─► content-gen
verifier (source-grounded) ─► gates ─► content-gen ─► story/lead/Opinion/Intelligence quality
```
**One-line:** nothing reader-facing works until **clustering** exists; clustering is only good once **embed-at-ingest + drain** are healthy; content-gen is gated by **clustering + the verifier**.

---

## PHASE 0 — Unblock the pipeline 🟧 (gates freshness/completeness of everything)
| # | Step | Unblocks |
|---|---|---|
| 0.1 | **embed-at-ingest** — decouple embedding into a standalone task, <10 min SLO | fresh clustering + content |
| 0.2 | **substrate drain caught-up** (10-min auto-tick) | fresh primary_subject / locations / events |
| 0.3 | **pin LaBSE model revision** (change = full re-embed) | prevents silent vector corruption |
*Nothing reader-facing. But everything downstream is degraded until this lands.*

## PHASE 1 — Clustering engine (the spine) 🟦 design+eval / 🟧 production (gates EVERY section)
| # | Step | Owner | Gated by |
|---|---|---|---|
| 1.1 | `analytics.story_clusters` schema (article→story + tags: source_count, subject_region, topic, freshness, importance) | 🟦 | — |
| 1.2 | **multi-signal matcher prototype** (labse + entities_extracted + location + event_type + quotes; **mutual-kNN + ratio guard**; **roundup-skip** via article_type; **cross-lingual** via primary_subject) | 🟦 | 1.1 |
| 1.3 | **re-baseline eval** (golden + recall, multi-signal) on *healthy* data → **lock threshold + weights** | 🟦 | Phase 0, 1.2 |
| 1.4 | **production clustering job** — incremental, progressive enrichment, writes story_clusters | 🟧 | 1.3 |
**Unblocks:** all sections, Around the World, Who's in the News, content-gen.

## PHASE 2 — The editor: selection / ranking / editions / kill-switch 🟦 (gates what shows)
| # | Step | Gated by |
|---|---|---|
| 2.1 | **importance score** (composite — entity source-diversity + counts + recency; replaces `3.11`) | 1.4 |
| 2.2 | **subject-region tagging** on stories (continent + nation) — the scope mechanism | 1.4 |
| 2.3 | **ranking + diversity floors** per (scope × section) | 2.1, 2.2 |
| 2.4 | **materialized editions** job → `worldwide_edition_items`, rebuilt every few min | 2.3 |
| 2.5 | **kill-switch** `worldwide_overrides` (backfill + audit; **runs before content-gen**) | 1.4 |
**Unblocks:** page population, the scope filter, content-gen ordering.

## PHASE 3 — The Worldwide page (app) 🟦 (the reader experience; shippable v1 w/o gen)
*Shell can be built in parallel against mock editions; wire to real editions after Phase 2.*
| # | Step | Gated by |
|---|---|---|
| 3.1 | **scope filter** UI + wiring (World / Nation) | 2.2 |
| 3.2 | convert existing sections hardcoded → **read editions** (Top Stories, More Top Stories, Most Read, Live ticker, Politics, Climate, Sports, Investigations, Military, Latest) | 2.4 |
| 3.3 | **re-sourced sections:** Opinion (real opinion/analysis) · In Pictures (media-rich) · Watch (article-embedded YT) · in-story tweets/video · Intelligence (placeholder → gen) | 2.4 |
| 3.4 | **Around the World** country grid (World scope; country gate threshold from validation) | 2.2, 2.4 |
| 3.5 | **Who's in the News** (entity spotlight + tap-through to entity feed) | 1.4 |
**Unblocks:** shippable v1 page with real headlines/summaries (before content-gen).

## PHASE 4 — Content generation (the natural articles) 🟦
*Verifier confirmation (4.1) can start day 1, in parallel.*
| # | Step | Gated by |
|---|---|---|
| 4.1 | **CONFIRM + eval the verifier** — source-grounded? miss-rate? quotes/numbers/libel? | (independent — start now) |
| 4.2 | **generation pipeline** — single-source first, generate-then-verify, on-fail→regenerate→fallback `summary_executive` | 1.4, 4.1 |
| 4.3 | per-story **cache** + **generate-on-selection** (after kill-switch) | 2.5, 4.2 |
| 4.4 | wire generated articles into sections (lead = full · band = dek+summary · story pages) | 4.3, 3.2 |
| 4.5 | **multi-source synthesis** (v1.5) | 4.4 |
**Affects:** story/lead content quality, Opinion, Intelligence.

## PHASE 5 — v2 / polish 🔭
Developing Now · Across-[nation]-states · Intelligence-as-full-LLM-briefing · advanced importance · bias features → All Sides · broader sources (per-country, video).

---

## Build order & parallel tracks
- **Critical path:** 0 → 1 → 2 → 3 (shippable v1 page with real summaries).
- **Parallel:** app shell (3.1–3.3 against mock editions) while 1–2 build · verifier eval (4.1) from day 1 · eval re-baseline (1.3) waits on Phase 0.
- **First shippable milestone:** Phases 0–3 = the live Worldwide page (clustered stories, scope filter, all sections, real headlines/summaries). **Content-gen (Phase 4) layers on next** — the page works before it, gets richer with it.

## Discuss-one-by-one checklist (decisions inside each)
- 1.2 signal weights · 1.3 threshold · 2.1 importance formula · 2.2 nation list · 3.4 country gate number · 4.1 verifier contract · 4.2 register/length rules.

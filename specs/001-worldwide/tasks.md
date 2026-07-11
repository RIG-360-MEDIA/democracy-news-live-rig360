# Tasks: Worldwide

`[P]` = parallelizable (independent file/lane). Lanes: **ENG** = DB/engine chat (Hetzner Python),
**WEB** = product chat (Next.js). Phases per `plan.md`. Phase 0 (ENG) and Phase 1 (WEB) run in
parallel from the start.

## Phase 0 — Freshness loop (ENG) — LAUNCH GATE
- T001 Backlog query + HNSW match harness (top-K clustered neighbors per unclustered article).
- T002 Decision logic: JOIN (best existing story ≥θ) / NEW (Leiden on fresh sub-batch) / WAIT.
- T003 [P] Stable-ID assignment (Jaccard) — joined keep id, new get fresh; append-only.
- T004 [P] Incremental guards: §2b, size×core, F-1/F-3; giant-split on any story crossing ≥100.
- T005 Touched-story re-enrich (extend `story_enrich_v8.py`) + importance recompute + counts.
- T006 Hourly beat/cron pointed at `_v8`; idempotent; pause kill-switch.
- T007 Weekly full re-baseline job (build-dark → swap behind parachute).
- T008 Eval: planted-article join test; golden/recall vs batch; blob check; freshness metric.

## Phase 1 — Front page + read API (WEB) — buildable now on snapshot
- T101 [P] `lib/worldwide/db.ts` — read-only Postgres client to Hetzner `_v8`.
- T102 `lib/worldwide/ranking.ts` — port `sections.sql` (pool + importance + diversity).
- T103 [P] `lib/worldwide/types.ts` — StoryCard/FrontPage DTOs (from data-model).
- T104 `app/api/worldwide/route.ts` — GET front page; envelope; scope param; caching; freshnessSeconds.
- T105 [P] `components/worldwide/section.tsx` + `story-card.tsx` (Tailwind, typography, modes.ts).
- T106 `app/worldwide/page.tsx` — fetch + render sections; scope toggle.
- T107 Verify: matches validated section output; p95 <1s; suppressed/junk absent; scope-pure.

## Phase 2 — EventHub (WEB) — layers on Phase 1
- T201 `lib/worldwide/eventhub.ts` — read-time grouping (dominant entity + window → umbrella).
- T202 Wire hubs into `/api/worldwide` topStories (inline umbrellas).
- T203 [P] `components/worldwide/event-hub-card.tsx` + `app/worldwide/event/[hubId]/page.tsx`.
- T204 Verify: Iran set → one umbrella → hub of angle-stories; non-qualifiers standalone.

## Phase 3 — Content-gen + verifier (ENG) — long pole, backend
- T301 `content_gen_v8.py` — feed surfaced story facts/quotes/sources → generator (Cerebras).
- T302 Wire faithfulness verifier; store article ONLY if it passes; fact-version stamp.
- T303 [P] `story_generated_v8` table; regen trigger on Phase-0 "enrichment stale" flag.
- T304 Eval: 50-story faithfulness audit = 0 fabricated claims (SC-006); failures store nothing.
- T305 Quota-aware pacing (Cerebras/groq); backfill surfaced stories.

## Phase 4 — Story page (WEB) — depends on Phase 3
- T401 [P] `lib/worldwide/number-gate.ts` (value+unit+multi-source → gated).
- T402 `app/api/worldwide/story/[id]/route.ts` — article + enrichment; 404 policy; stub fallback.
- T403 [P] `components/worldwide/story-read.tsx` — article, sources, facts, timeline, quotes, perspectives.
- T404 `app/worldwide/[storyId]/page.tsx` — render; apply number-gate; stub when unenriched.
- T405 Verify: full read end-to-end; every fact links a source; bare numbers gated; stub never dead.

## Cross-cutting
- T901 [P] Observability: per-route p95 + `freshnessSeconds` dashboard (the staleness signal).
- T902 [P] Kill-switch + parachute wiring for the user-visible flip (product OLD→NEW).
- T903 Launch gate check: Phase 0 live + Phase 1/2 verified + first-breaking-news-burst watch.

## Dependencies
Phase 0 ∥ Phase 1 ∥ (Phase 3 after enrichment, already done). Phase 2 after Phase 1. Phase 4
after Phase 3. **User-visible launch needs Phase 0 + 1 (+2).** Full product needs 3 + 4.

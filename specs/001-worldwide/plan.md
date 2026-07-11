# Implementation Plan: Worldwide — Story Reading Layer

**Branch**: `001-worldwide` | **Date**: 2026-06-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification at `specs/001-worldwide/spec.md`

## Summary

Build the Worldwide reading layer over the adopted `_v8` story engine: a live, ranked,
scoped newspaper front page (P1), mega-event hubs (B+), and an enrichment-backed story page
with a faithfulness-verified generated article (P2). The hard prerequisite — discovered during
planning — is **freshness**: `_v8` is a frozen batch snapshot (already ~14h stale, 3,500
articles unclustered) with NO forward process. So **Phase 0 builds the hourly forward-clustering
loop** before any user-visible launch. The front page is buildable against the snapshot
immediately for dev; it cannot go live until Phase 0 keeps it fresh.

## Technical Context

**Frontend**: Next.js (App Router) + Tailwind + the four-family typography system.
**Read API**: Rig Wire's FIRST live API (the prototype was static `*-data.ts`; `api-conventions.md`
named Worldwide as the trigger). REST+JSON, the `ApiResponse<T>` envelope, App-Router route
handlers querying Postgres read-only.
**Engine/Storage**: PostgreSQL on Hetzner (4-core/15GB) — `analytics.story_*_v8` + `_v8`
enrichment. Python engine jobs (forward-clustering, enrichment, content-gen) on the box.
**LLM**: Cerebras `gpt-oss-120b` for content-gen (backend, async — never in the request path).
**Testing**: manual per `testing.md` today (build + tsc + visual); golden/fixture eval for the
engine pieces (reuse `cluster-golden`/`recall-set`, the content-gen verifier suite).
**Project Type**: web (frontend + read API) + backend engine jobs.
**Performance**: front-page read p95 < 1s (SC-001); content-gen off the request path.
**Constraints**: small box — forward pass touches only the recent backlog, not 274K; reuse the
HNSW index already built on `labse_embedding_v4`.
**Scale**: ~178K stories, ~4.6K surfaced-enriched, ~hundreds of new articles/hour.

## Constitution Check

*Gates from `CLAUDE.md` + `.claude/rules/code-style.md`.*

- **Less code / surgical**: reuse what's built — the validated `sections.sql` ranking, the
  content-gen recipe, the faithfulness verifier, the `_v8` HNSW index. Net-new is the read API,
  the page UI, EventHub grouping, and the forward loop. PASS (no speculative abstraction).
- **Mode folder sealed**: `src/components/worldwide/` imports only from `brand/` + `lib/` —
  not other mode folders. PASS by design.
- **Data colocation vs live data**: Worldwide intentionally breaks the static `*-data.ts`
  pattern (it's live) — explicitly sanctioned by `api-conventions.md`. Not a violation.
- **`modes.ts` SSOT**: any Worldwide mode metadata lives in `modes.ts`, not hardcoded. GATE.
- **Immutability / Tailwind-first / typography system**: standard rules apply. GATE.
- **API envelope + errors + caching** per `api-conventions.md` (no `v1`, no verbs, the
  `ApiResponse<T>` shape, `s-maxage` on reads, no raw stack traces). GATE.

## Project Structure

```text
specs/001-worldwide/
├── spec.md            # done
├── plan.md            # this file
├── enrichment-on-v8-kickoff-2026-06-14.md   # done (Phase pre-req, shipped)
├── data-model.md      # NEXT: the DTO + table contract
├── contracts/         # NEXT: API route contracts (worldwide, story/[id])
└── tasks.md           # LATER: granular task list

# Frontend + read API (product-chat lane, Next.js repo)
src/
├── app/worldwide/page.tsx                    # front page
├── app/worldwide/[storyId]/page.tsx          # story page
├── app/worldwide/event/[hubId]/page.tsx      # event hub
├── app/api/worldwide/route.ts                # GET front page (scope param)
├── app/api/worldwide/story/[id]/route.ts     # GET one story
├── components/worldwide/                      # sealed: section, card, hub, story-read
└── lib/worldwide/                             # ranking query, eventhub grouping, DTOs,
                                               #   number-gate, verifier (built), db client

# Engine jobs (DB-chat lane, Hetzner Python)
backend/.../forward_cluster_v8.py             # Phase 0 hourly loop
backend/.../story_enrich_v8.py                # exists — extend for incremental re-enrich
backend/.../content_gen_v8.py                 # Phase 3 generation+verify job
```

## Implementation Phases (the HOW, in ship order)

### Phase 0 — Freshness: hourly forward-clustering *(DB-chat / engine; LAUNCH PREREQ)*
**Goal**: new articles continuously flow into stories; `_v8` stops being a frozen snapshot.
**How**: an hourly job over the embedded-but-unclustered backlog (`labse_embedding_v4 NOT NULL`
AND not in `story_cluster_members_v8`). Per article: ANN-match (HNSW on the v4 column) →
refit-scorer at θ=0.668 → **join** the best existing story (append member; bump last_seen_at +
counts; mark its enrichment stale), **start** a new story if it only links to other new ones,
or **wait** as a singleton. Stable IDs (Jaccard) so stories don't churn under readers. Carry the
existing guards (§2b, size×core, giant-split for any new ≥100). Touched stories re-enriched
incrementally (extend `story_enrich_v8.py`) and re-ranked. **Periodic full re-baseline (weekly)**
to correct incremental drift.
**Done when**: backlog drains within the hour; a planted new article on an existing event joins
its story within one cycle; golden/recall eval holds vs the batch baseline; drift watch in place.
**Risks**: drift (→ weekly re-baseline); a new article bridging two stories into a blob (→ guards
must run incrementally); box load (→ backlog-only, indexed). First-breaking-news-burst watch.

### Phase 1 — Front page + read API *(product-chat; buildable NOW on the snapshot)*
**Goal**: the ranked, scoped newspaper front page.
**How**: port the validated `sections.sql` ranking into `lib/worldwide` as a parameterized
read; expose `GET /api/worldwide?scope=world|<ISO>` returning the section lists in the
`ApiResponse<T>` envelope (cacheable `s-maxage`). Build `page.tsx` → section + card components
(Tailwind, typography, `modes.ts`). All fields exist on `_v8`; Stage-3 edge-checks already PASS.
**Done when**: front page renders World + a country scope, ranked, diversity-capped, scope-pure,
no suppressed/junk; p95 < 1s; matches the validated section output.

### Phase 2 — EventHub grouping (B+) *(product-chat; layers on Phase 1)*
**Goal**: a mega-event shows as one umbrella card → hub of focused angle-stories.
**How**: a read-time step in `lib/worldwide` after ranking — group stories sharing a dominant
entity within a recent window into one umbrella (importance = aggregate of members); others
stay standalone. `event/[hubId]/page.tsx` lists members. **Display-only** — no DB/cluster change
(FR-022–025). Needs each story's dominant entity exposed in the read.
**Done when**: the Iran cluster-set renders as one umbrella → hub of its angle-stories; a
mis-group is cosmetic; non-qualifying stories render standalone.

### Phase 3 — Content-gen + verifier wiring *(DB-chat / engine; the long pole, backend-only)*
**Goal**: a faithful, synthesized article per surfaced story.
**How**: a backend job feeds a surfaced story's `story_facts_v8`/quotes/sources to the (built)
generator → runs the (built) faithfulness verifier → stores the article + fact-version stamp
ONLY if it passes (FR-009/010). Regenerate on material fact/stance change (FR-016); the forward
loop's "enrichment stale" flag triggers it. Off the request path; results cached in a
`story_generated_v8` table.
**Done when**: surfaced stories have a stored, verifier-passed article; a faithfulness audit
(50 stories) shows 0 fabricated claims (SC-006); failed-verification stories store no article.

### Phase 4 — Story page *(product-chat; depends on Phase 3)*
**Goal**: the read surface.
**How**: `GET /api/worldwide/story/[id]` returns the stored article (if any) + enrichment sheets
from the DB; `[storyId]/page.tsx` renders article + sources + key facts + timeline (v1 summary)
+ quotes + perspectives. Apply the **S-1 number-gate** at display (FR-012). No enrichment →
**sources-only stub** (FR-021).
**Done when**: a surfaced story reads end-to-end with all sections; every displayed fact links a
source; bare numbers pass the gate; an unenriched story degrades to a stub, never a dead link.

## Ship slices
- **Dev milestone**: Phases 1+2 on the snapshot — a working front page to look at.
- **Launch gate (user-visible)**: Phase 0 (freshness) MUST be live, behind the kill-switch +
  parachute, with the first-burst watch. Front page can go live on Phase 0+1+2.
- **Full product**: + Phases 3+4 (the read).

## Cross-cutting (per `api-conventions.md`)
- Envelope `ApiResponse<T>` on every response; HTTP status carries semantics.
- Reads: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. No raw stack traces;
  `traceId` on 5xx. No `v1`, no verbs in routes, ≤1 nesting level.
- Observability before launch: per-route p95, and `freshness_seconds` of served data (the Phase-0
  staleness — directly answers "how old is this front page").

## NOT in v1 (named fast-follows, non-blocking)
subject_country accuracy (international stories tagged by source geography) · real per-dateline
timeline (FR-013 is summary-only) · alias-cleanup-v2 (the ~3 over-merges + junk entities) ·
event-linkage embedding (mega-event recall) · default-scope personalization.

## Next artifact
`tasks.md` (granular, per-phase task list) — and `data-model.md` + `contracts/` for the DTO and
the two API route shapes. Phase 0 and Phase 1 can start in parallel (different lanes).

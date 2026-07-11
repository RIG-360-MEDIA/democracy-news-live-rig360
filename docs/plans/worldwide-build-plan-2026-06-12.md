# Worldwide — Full Build Plan to Fully Operational (2026-06-12)

Master sequence from today's state to a live Worldwide page. Supersedes the
ordering in `worldwide-build-roadmap-2026-05-30.md` with everything learned this
session. Specs referenced: `worldwide-build-spec-2026-05-30.md` (what),
`clustering-rerun-kickoff-2026-06-12.md`, `story-enrichment-spec-2026-06-12.md`,
`faithfulness-verifier-spec-2026-06-12.md`, `content-gen-design-2026-06-03.md`.

**Owners:** A=analytics(design/eval/app/section-queries) · D=DB chat(clustering/
migrations/jobs) · P=product(backend/wiring).

## State today (the starting line)
- Clustering live but PARKED (job_7); embeddings caught up (~4min lag).
- UI shell exists (`src/components/long-read/`) on 100% MOCK data.
- Ranking + section queries PROTOTYPED on the live pool — work.
- Enrichment + verifier SPECCED, not built. No data API (only auth). No editions
  table, no kill-switch mechanism. ~39% stories tagged OTHER (pre-topic-fix data).

---

## STAGE 0 — Foundation: clustering quality  [D, in flight]
0.1 `_v8` whole-corpus rerun at caught-up embeddings.
0.2 Re-baseline clustering threshold via golden(134)+recall(20) eval.
0.3 Over-merge split rule (jaccard + bridge-demote + few-subs-rescue + LLM
    residual); RE-CONFIRM all params on _v8 (the 34-sample gap was an artifact).
0.4 Fix `independent_source_count` — currently == source_count (wire-dedup no-op);
    needed so real coverage beats reprint volume in ranking.
**Gate:** _v8 adopted over job_7 (precision holds, recall up, split rule green).

## STAGE 1 — Continuous clustering (forward-mode)  [D] — THE UNTESTED MOTION
1.1 Make clustering run INCREMENTALLY: new articles attach-or-form stories live
    (not one-shot whole-corpus). This is what turns a snapshot into a live product.
1.2 Apply the split rule on the incremental path.
1.3 Watch the first breaking-news burst (never tested).
**Gate:** stories form/update continuously within minutes of ingest; no blob-blowup.

## STAGE 2 — Clean per-story data: verifier + enrichment  [A spec, P/D build]
2.1 **Faithfulness verifier FIRST** — golden set → verifier → FN≈0 on high-risk.
    (Linchpin; everything below trusts it.)
2.2 Story-enrichment Tier-1 "data sheet" on every story: clean topic (kills
    OTHER), headline+dek, scope, clean subject entities (kills alias-overreach),
    summary, VERIFIED facts.
2.3 Re-run trigger: formation → state-signature gate → debounce → freeze.
**Gate:** every surfaced story has a clean, verified sheet; OTHER ≈ gone; facts pass verify.

## STAGE 3 — Ranking & selection (automated editor)  [A]
3.1 Lock importance formula: indep-sources (log-bounded) + recency + capped facts
    + source-quality/tier + prominence; SCOOP RULE (single strong article can win).
3.2 Topic-diversity floor — EXCLUDING OTHER/null (don't cap the catch-all).
3.3 Section queries, all sections: Top Stories(+ticker/Most Read), Politics,
    Climate&Science, Sports, Investigations, Military; + entity/section specials.
3.4 Non-clustered section sourcing + feasibility audit: Opinion (real opinion
    art), In Pictures (image-rich ≥8-10 media), Watch (article-embedded video),
    Intelligence (LLM briefing), Around the World (country grid, coverage-gated),
    Who's in the News (entity spotlight).
3.5 Scope filter (subject-region; World adds Around-the-World grid; nation filters).
3.6 Kill-switch: veto table + backfill + audit, runs BEFORE generation.
**Gate:** each section produces good picks on enriched data, both scopes; junk gone.

## STAGE 4 — Content generation (winners only)  [P, behind Stage-2 verifier]
4.1 Generate-then-verify: full Atlantic-voice article per winner; single-source
    first; on fail regenerate; after N fails fall back to extractive summary.
4.2 Per-placement rendering: lead=full · band=headline+dek+short · ticker=one line.
4.3 Cache keyed by story; regen only on material change (same trigger as 2.3).
**Gate:** winners have faithful generated prose; nothing unverified ships.

## STAGE 5 — Serving: API + editions + wiring  [A/P]
5.1 Materialized editions: `worldwide_edition_items` table + rebuild job (every
    few min) per (scope × section). Page reads the cached edition.
5.2 Read API endpoints (REST+JSON envelope, cache headers) per `api-conventions`.
5.3 Wire the UI: replace every mock `*-data.ts` with live fetches, behind a
    FEATURE FLAG defaulting to static (build dark).
**Gate:** page renders real editions fast (reads cache); flag off = old behavior.

## STAGE 6 — Eval, hardening, launch  [A/P]
6.1 Re-run all eval gates at caught-up state: clustering P/R, verifier FN,
    enrichment topic-coverage, section-pick quality.
6.2 Observability: per-route p99, `freshness_seconds`, cacheHit (mandatory pre-launch).
6.3 Both-ways QA: scope flip, mobile (iPhone 12), front page reads clean.
6.4 FLIP the feature flag live — behind kill-switch + parachute (`story_*_old`),
    watch the first burst.
**Gate:** LIVE.

## STAGE 7 — Post-launch / v2  [logged, NOT blocking]
All Sides (Blindspot/Sources-Disagree), Developing Now (live timelines),
Across-[nation]'s-states, multi-source synthesis depth, Matryoshka embeddings,
Tier-C facts, full alias-cleanup-v2 upstream.

---

## Operational threads (keep green throughout)
- embed-at-ingest (fixed today; monitor — it was the 28h stall).
- topic tagging forward-fix (landed; monitor OTHER rate on new articles).
- forward-mode cadence (Stage 1 — the single biggest unproven risk).

## Critical path (the spine)
0 → 1 (forward-mode) → 2 (verifier→enrichment) → 3 (ranking/sections) →
4 (content-gen) → 5 (serving) → 6 (launch). Stage 4 can lag (ship reading
extractive summaries first, layer prose later). The two hardest unknowns:
**Stage 1 forward-mode** and **Stage 2 verifier FN-rate**.

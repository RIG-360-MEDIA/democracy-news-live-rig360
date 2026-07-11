# Phase 0 — Hourly forward-clustering — DB chat kickoff (LAUNCH GATE)

**From:** analytics. **Why:** `_v8` is the adopted live keeper but it's a FROZEN batch snapshot
— last clustered 2026-06-13 17:36, ~3,500 articles embedded-but-unclustered since, growing.
This is exactly what killed job_7. Build the **hourly forward loop** so new articles flow into
stories. Freshness target = **hourly** (user decision). Full context: `plan.md` Phase 0.

## Goal
Every ~hour, drain the embedded-but-unclustered backlog into `_v8` stories: each new article
**joins** an existing story, **starts** a new one, or **waits** as a singleton — keeping
`_v8` continuously fresh, with stories stable under readers.

## The loop (per cycle)
1. **Backlog** = `articles` WHERE `labse_embedding_v4 IS NOT NULL` AND `substrate_status='ok'`
   AND id NOT IN `story_cluster_members_v8` (the ~3,500 now + new arrivals).
2. **Match** each backlog article: HNSW ANN on `labse_embedding_v4` (the index we built) →
   top-K neighbors that are ALREADY in a story → score candidate edges with the refit scorer
   (`edge-fit-report-2026-06-03-refit.json`) at θ=0.668.
3. **Decide**:
   - **JOIN**: best link ≥ θ to an existing story → append the article to THAT story (the single
     best one — never merge two existing stories via one article; that's blob-formation).
   - **NEW**: links only to other backlog (unclustered) articles → run the normal
     Leiden+scorer on that fresh sub-batch → emit new stories.
   - **WAIT**: links to nothing ≥ θ → singleton story (own 1-article story; may grow next cycle).
4. **Stable IDs** (Jaccard): joined stories KEEP their id; new stories get fresh stable ids.
   Append-only on existing stories — do NOT re-shuffle existing members each cycle (readers
   must not see stories churn).
5. **Guards (carry forward, run incrementally)**: §2b template-suppression, size×core gate, F-1
   rep-title refresh on join, F-3 subject_country. If a story crosses **≥100** via joins, run
   the over-merge giant-split discriminator on it (θ_jaccard=0.195, GENERIC_DF_MIN=54 — the
   locked _v8 params).
6. **Touched stories** → mark enrichment stale → incremental re-enrich (extend
   `story_enrich_v8.py`) → recompute importance, bump `last_seen_at`, source/article counts.
   Surfaced (multi-source) touched stories → flag for content-gen regen (Phase 3 hook).

## Schedule + safety
- **Hourly** beat/cron job (the old cluster-importance beat was disabled in the decommission —
  add a NEW one pointed at `_v8`).
- **Idempotent** (re-running a cycle must not double-assign) and **pausable** (a kill-switch to
  stop the loop instantly — `_v8` writes are now LIVE, not build-dark).
- Parachute intact: `story_*_job7` + `story_*_old` remain the rollback.
- **Weekly full re-baseline**: a whole-corpus re-run (build-dark → swap behind parachute) to
  correct the drift incremental assignment always accumulates. Schedule it.

## Eval / done-when (report raw)
- Backlog drains within the hour (freshness_seconds < ~3600 steady-state).
- **Planted-article test**: inject a known new article on an existing live event → it JOINS that
  story within one cycle (not a new singleton).
- Golden(134) + recall(20) hold vs the batch baseline (forward loop must not degrade quality).
- **No blob formation**: no new ≥100 cluster appears that fails the giant-split discriminator.
- Report per cycle: backlog size, join/new/wait split, any new ≥100 cluster + its split verdict,
  drift indicator, freshness_seconds. Any LLM use (only the giant-split sports-residual) + quota.

## Out of scope
Content-gen itself (Phase 3 — it consumes the "regen" flag this loop sets). The page/API (Phase
1, product chat).

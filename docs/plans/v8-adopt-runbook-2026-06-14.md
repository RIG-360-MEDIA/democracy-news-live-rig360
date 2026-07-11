# _v8 ADOPT runbook — promote behind the parachute (decided 2026-06-14)

Decision (analytics, user go/no-go = GO "adopt behind parachute"): promote **`_v8` + GIANT-split
only** as the live `analytics.story_*` keeper, swapping the DEAD job_7. **Product stays on OLD
(kill-switch) — no user-visible change yet.** Instantly reversible. The blessed config and its
scorecard:

- **Blessed = _v8 (run_id 1781406460) WITH the ≥100 giant-split materialized.** NOT base _v8,
  NOT the <100 split (frontier proved <100 split can't clear both gates — do NOT apply it).
- Scorecard: B-cubed P ~94% · recall ~40% (≥39 normal-story 68–100%) · false-merge ~31% on the
  adversarial bait set (~3 clusters) · giants split, no mega-blob survives.

## What "adopt behind parachute" means operationally
1. **Confirm the giant-split is PERSISTED** into the _v8 keeper tables (the 55 SPLIT decisions /
   ~18,277 member reassignments used for the re-eval) — not just an eval-time CSV artifact. The
   adopt state must equal the eval'd state.
2. **Promote _v8 to the keeper** the product layer resolves to as NEW (rename/swap/view — DB
   chat's mechanism). Record run provenance (run_id, algo_version, as_of).
3. **PARACHUTE INVARIANTS — do not violate:**
   - Do NOT drop job_7's `analytics.story_*` — retain as rollback (rename, e.g. `story_*_job7`).
   - Do NOT drop the existing `story_*_old` (37,982).
   - Old `public.event_clusters` / `story_threads` stay product-read until the user flips.
4. **Kill-switch stays on OLD.** Product (`stories.py`, `OSINT_STORY_SOURCE`) keeps reading the
   old source. This adopt makes _v8 *ready and blessed*; it does NOT show it to users. The
   user-visible flip is a SEPARATE later go (product chat), after a soak + the burst watch.

## Rollback (one-liner, must be ready before promote)
Flip `OSINT_STORY_SOURCE` back to OLD (if flipped) AND/OR re-point the keeper to `story_*_job7`.
Document the exact command so rollback is seconds, not archaeology.

## Watch (the one motion never tested — forward-mode/live cadence)
- **Blob-alarm:** alert if any new cluster crosses the mega-blob signature (size + low core +
  multi-sub-community + one bridge actor) — the over-merge class, live.
- **First breaking-news burst:** the live-cadence path was never exercised. Watch the first
  real burst closely (cluster sizes, fragmentation, latency).

## The two fast-follow tickets (non-clustering — the residual defects)
1. **PRECISION → alias-cleanup-v2 (DB chat, days):** purge generic over-extractions (theresa
   may / mick price / tumkur city / domestic …) at the EXTRACTION layer so they never become a
   scorer feature. Param-tuning can't cut the multi-edge web; the durable fix is upstream. Also
   folds in the bare-common-noun alias drops already banked (Congress/Ali/Samithi).
2. **RECALL → event-linkage embedding (the v4-saga workstream):** mega-event angle-divergence
   ("Iran markets" vs "Iran military" diverge in title AND lead → genuinely far in v4 space).
   A full-text/different/fine-tuned recipe + full re-embed (build-dark, verify single-recipe,
   re-index, re-cluster, re-eval). Gate on a SAMPLE A/B first (proved necessary: the title-only
   theory was already wrong once). Bundle the vernacular-passthrough lead bug
   (`lead_text_translated` carrying untranslated Telugu/Marathi).

## Open PRODUCT decision (after adopt, before user-visible flip) — not clustering
Mega-events: show as ONE big card, or as angle-substories (markets / military / diplomacy)?
The "recall miss" on giants is largely this choice. Analytics to tee up as a user question.

## Owner split
DB chat: the promote + parachute rename + provenance + alias-cleanup-v2 + the embedding re-embed.
Analytics: blessed-config sign-off (done), the embedding A/B eval, the mega-event question.
Product: the user-visible kill-switch flip (separate go), stories.py rollback wiring.

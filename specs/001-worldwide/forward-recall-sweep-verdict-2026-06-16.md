# Forward-loop recall sweep — VERDICT: do NOT arm either config (2026-06-16)

Analytics ran the precision check: each proposed JOIN's article title joined to its TARGET
story's representative_title (via story_clusters_v8). Method: `scratch/worldwide/fwd_recall_sweep.mjs`.

## Result
- df200@0.10: JOIN 406; df150@0.12: JOIN 323 (df150 drops 83 of df200's — a MIX of real errors + some legit).
- **BOTH configs still leak cross-event JOINs** — concentrated in SPORTS (and a little diplomacy):
  - df200: Scotland↔Bolivia, IND-AFG-ODI↔unrelated-cricket, Modi-France↔Modi-G7, Ben-Stokes magnet.
  - df150 (the "tighter" one): a "Spain/France Women's-FIFA" magnet glues Neuer/Germany, Curaçao,
    England-equipment, Nagelsmann, Lamine-Yamal — different football events.
- The gate IS clean for hard news (IAF crash, Redmi, FSSAI, Kennedy Center, Philippine quake, TMC).

## Root cause
Sports/recurring events share **non-generic** entities (player names, team names, "World Cup 2026")
that the high-DF generic filter doesn't exclude but that recur across DIFFERENT matches → Jaccard
passes → wrong join. Entity-Jaccard reduces but cannot eliminate this class. Same recurring-event
wall as the giant-split sports residual.

## DECISION: do NOT arm. Pick a path:

### Option A (recommended) — freshness via scheduled MINI-BATCH re-cluster, not incremental JOIN
The incremental single-edge JOIN has now failed precision twice. The BATCH clustering path is
PROVEN (it built _v8) and handles sports via community structure + the giant-split discriminator.
→ Re-cluster the recent window (recent _v8 + the ~17.9k backlog) on a ~15–30 min cron using the
existing `cluster_job_7` path. Heavier than incremental but the window is small (full 273K ran in
~23 min, so a window is minutes). Sidesteps the single-edge magnet entirely. Robust.

### Option B — keep incremental, add two gates, re-sweep
1. JOIN-time **date-proximity** gate (join only within a tight window of the story's recent
   activity — kills different-match-different-day). 2. **SPORTS-band**: much higher Jaccard bar or a
   per-join LLM check for SPORTS topic. Then re-dry-run → I re-sweep. Risk: sports same-day-different-
   match still leaks; iterative.

### Option C — arm for NON-SPORTS only (interim)
The gate is clean for hard news. Arm the loop but **quarantine SPORTS (and recurring-diplomacy)
joins → WAIT**, let the nightly batch/janitor handle them. Gets live freshness for the bulk now;
sports stay a-day-stale until A or B lands.

## Recommendation
**Option A** (mini-batch re-cluster) — it reuses the proven machinery and ends the incremental-join
precision whack-a-mole. If A's compute cadence is a problem, **Option C** as the interim. Do NOT arm
either Jaccard config as-is. Freshness stays blocked until A/C; the 17.9k backlog stays unarmed.

## Note
The gate's NON-sports precision is genuinely good — so C is a safe partial win available immediately.

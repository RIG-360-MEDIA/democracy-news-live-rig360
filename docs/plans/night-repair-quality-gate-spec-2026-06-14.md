# Spec — Night-Repair Quality Gate (the missing rail for unattended trust)

**Status:** SPEC (analytics-designed, DB-chat-implemented). **Blocks:** arming the nightly janitor
unattended. Created 2026-06-14. Pairs with `nightly-story-repair-pass-2026-06-14.md`.

> Problem: the current eval-gate (`verify_batch.py`) is **structural only** — it catches orphans,
> lost members, undersized clusters. It does NOT catch a **wrong-but-structurally-valid** action:
> the LLM cleanly splits a coherent story into perfect-looking-but-wrong children, or ejects an
> article that actually belonged. That passes today silently. This gate closes that hole so the
> janitor can run unattended.

## Principle
Verify the LLM's action with an **independent, deterministic** method — not another LLM (circular).
The split itself was decided by the LLM; the gate asks a *different* question with a *different*
signal: **"do the children actually look like distinct events / does the ejected article actually
not belong?"** Two independent methods must agree before a destructive change stands.

## The three gates (run per batch, after apply, before the batch is allowed to stand)

### Gate B — Per-split distinctness *(PRIMARY — the sensitive one)*
For each SPLIT, compute the **mean pairwise cross-child entity Jaccard** of the children (the
exact discriminator signal: top-5 clean `entities_extracted` per child, mean pairwise Jaccard).
- **PASS** if cross-child Jaccard **< θ_keep (0.195, locked _v8 value)** → children are genuinely
  distinct events → the split is real.
- **FAIL** if **≥ θ_keep** → the children still share a core → they were the SAME event → the LLM
  over-split a coherent story → **reject this split.**
This is the over-merge discriminator run *in reverse, as a verifier*: a split only stands if the
deterministic discriminator ALSO judges the pieces separable. Catches exactly the
shatter-a-coherent-story failure the structural gate misses.
Also per child: internal coherence (member-fit / member entity-overlap) must be healthy — a child
that's itself incoherent means the partition was arbitrary.

### Gate C — Per-eject validity
For each EJECTED article: its cosine to the **post-eject parent centroid** must be **< CAND_COS
(0.80)**. If it was ≥0.80, it plausibly belonged → **reject the eject** (false eject).

### Gate A — Global fixture regression *(BACKSTOP)*
Pre-batch: dump `_v8` membership → run `eval-clustering.cjs` (golden 134 + recall 20) → baseline
scorecard. Post-batch: same → compare.
- **FAIL** if B-cubed/must-link **recall drops > 1.0 pt** (the janitor must not shred legit groups)
  OR cannot-link/false-merge **rises** (a split shouldn't create merges; sanity check).
- Note: the fixtures are small, so a batch may touch zero fixture stories → no change → this is a
  coarse backstop, NOT the primary gate. **Gate B is the sensitive one** because it evaluates the
  *touched* stories directly.

## Decision logic
- Evaluate every split/eject in the batch against B/C; run A once.
- **Per-STORY rollback (not whole-batch):** a story failing Gate B/C → roll back ONLY that story
  (the writer's `ONLY_STORY` + `ROLLBACK`), keep the passing ones. Whole-batch rollback only if
  Gate A fails (corpus-level regression).
- **Auto-halt** (`touch .night_repair_HALTED`) + alert if: Gate A fails, OR the per-story FAIL rate
  exceeds a ceiling (e.g. >20% of the batch fails B/C → the detector is misbehaving tonight, stop).
- **PASS** → batch stands; log the gate scorecard alongside `story_repair_log_v8`.

## Calibration (measure-first — do this BEFORE arming)
1. Run Gate B/C **retroactively on the validated-good batch 1781442293** (10 splits / 46 children /
   2 ejects — analytics already eyeballed these as correct). **Every split MUST pass Gate B
   (cross-child Jaccard < 0.195) and every eject Gate C.** If a known-good action FAILS, the
   threshold is wrong → tune it until the known-good batch is green. This anchors the thresholds to
   reality instead of guesses.
2. Then run on a deliberately-BAD case (force a split of a known-coherent control story) → Gate B
   MUST catch it (cross-child Jaccard ≥ θ). Both-ways: passes the good, catches the bad.

## Folds in: lock PARTITION_RES
Sweep PARTITION_RES ∈ {0.8, 1.0, 1.2, 1.5} for the split partition; pick the value that **maximizes
mean cross-child distinctness (lowest cross-child Jaccard) WITHOUT over-fragmenting** (no dust /
children stay event-sized). The res that makes children most distinct = the right partition
granularity. Confirms or replaces the current 1.0 default with an eval-backed value.

## Integration (nightly pipeline)
`detect+plan → apply → ` **`quality_gate (A+B+C)`** ` → per-story rollback of failures → re-enrich
survivors → log`. The gate sits between apply and "batch stands." Reuses: `eval-clustering.cjs`
(Gate A), the discriminator's entity-Jaccard (Gate B), the v4 embeddings + centroid (Gate C), the
writer's `ROLLBACK/ONLY_STORY` (action).

## What this gate does NOT do (honest limits)
- It can't catch a split that's *entity-distinct but still editorially one story* (rare; the
  fixtures + the eventual B+ hub absorb this).
- It trusts `entities_extracted` cleanliness (junk entities → alias-cleanup-v2; orthogonal).
- It's a guardrail, not a grader — it stops bad actions; it doesn't rank good ones.

## Build/test order
1. Implement Gate B (discriminator-as-verifier) + C + A. 2. Calibrate on batch 1781442293
(must pass) + a forced-bad case (must fail). 3. Wire per-story rollback + auto-halt. 4. Dry-run one
nightly cycle with the gate logging-only (no rollback) → review. 5. Arm rollback. THEN the janitor +
the single-vote fix (defer-if-no-2nd-vote) together clear unattended operation.

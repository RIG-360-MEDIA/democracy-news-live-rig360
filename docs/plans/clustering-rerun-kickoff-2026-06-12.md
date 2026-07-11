# Clustering Whole-Corpus Rerun — DB Chat Kickoff (2026-06-12)

**From:** analytics chat (design/eval). **To:** DB chat (runs it on Hetzner).
**Type:** build-dark rerun + eval re-baseline. **Not** a live cutover.

---

## Why now
Embeddings are caught up (verified 2026-06-12: frontier lag ~4 min, last-24h
coverage ~94%, up from a 28h stall this morning). The live keeper is the
`job_7` whole-corpus run from ~2026-06-03 and predates the last ~9 days of
articles. The spec always said to **re-baseline the clustering threshold at
caught-up state** — we are now at that state. This rerun does double duty:
refresh the pool with current data **and** lock θ on healthy data instead of the
degraded-data guess.

## Goal (one sentence)
Produce a fresh whole-corpus clustering run **into new tables (build dark)**,
re-run the two eval sets against it, and **report raw numbers** so analytics can
lock the threshold and decide adopt-vs-keep.

## Non-goals
- **Do NOT overwrite the live keeper** (`analytics.story_*`) or drop
  `story_*_old`. The live product keeps reading `job_7` until we approve a swap.
- No user-visible change. No threshold "locked" by DB chat — you report, we lock.

---

## UPDATE 2026-06-13 — embeddings verified, proceed
V4 embeddings are READY: ~94.7% corpus coverage, ~40-min frontier lag (no longer the
28h stall). The two `embedding_revision` labels (`v4-tr-title-1024` vs SHA `836121a`)
are CONFIRMED the SAME recipe / one 768-dim unit-normalized space (cross-label cosine
≈ within-label, no seam). **Cluster `_v8` LABEL-AGNOSTIC over all rows WHERE
labse_embedding_v4 IS NOT NULL (~273K, incl. the 572 null-rev rows).** Exclude only the
~15K null-vector rows. Do NOT re-stamp before clustering. Provenance cleanup (fix legacy
stamp path → re-stamp minority) is a NON-blocking follow-up.

## PRE-RUN FIXES 2026-06-14 (found at run-attempt — do these first)
1. **`cluster_job_7.py` reads the wrong column.** Its candidate-gen ANN uses the live
   `labse_embedding` (old lead-only recipe, the seamed/mixed space) — NOT `labse_embedding_v4`
   (the verified-clean shadow column). **Patch it to read `labse_embedding_v4` and filter
   `labse_embedding_v4 IS NOT NULL`** (label-agnostic, exactly as this doc specifies). Do
   NOT do the COALESCE-into-live swap — that touches the live column and isn't build-dark.
2. **No ANN index on `labse_embedding_v4`.** Only the old `labse_embedding` has the HNSW
   index (`idx_articles_embedding`, hnsw m=16/ef_construction=64). Candidate-gen over the
   v4 column would seqscan 273K = infeasible. **Create a mirror index FIRST:**
   `SET maintenance_work_mem='2GB';`
   `CREATE INDEX CONCURRENTLY idx_articles_embedding_v4 ON public.articles USING hnsw (labse_embedding_v4 vector_cosine_ops) WITH (m=16, ef_construction=64);`
   CONCURRENTLY so night-desk writes aren't blocked; mirror m=16/ef_construction=64 for
   apples-to-apples recall vs job_7 (recall is an eval metric — don't regress it with a
   weaker index). The build runs in postgres maintenance_work_mem, not the job's 10G cgroup;
   additive + reversible (DROP INDEX). Within the approved full-speed envelope.
3. **Scorer filename:** the active refit scorer is `docs/fixtures/edge-fit-report-2026-06-03-refit.json`
   (not the `edge-fit.refit-2026-06-02.json` named later in this doc). Eval fixtures live at
   `docs/fixtures/cluster-golden.json` (134) + `cluster-recall-set.json` (20).

## Preconditions (verify and report before running)
1. **Confirm the embedding recipe from the SSOT** (`embedding_recipe.py`), do not
   trust prior notes — report the current `embedding_model` / `embedding_revision`
   actually present on recent rows, and that it matches the SSOT rev.
2. **igraph + leidenalg pinned**, the fail-loud guard intact (silent networkx
   fallback = OOM landmine — must error, not fall back).
3. Embedding coverage on the corpus you'll cluster — report % embedded and the
   count of `substrate_status='ok'` but unembedded (decide: wait for them or
   cluster what's embedded).

## The run (pin the recipe; confirm, don't assume)
- **Embeddings:** V4 (`v4-tr-title-1024`, translated·title·1024, max_seq 512) —
  confirm rev from SSOT.
- **Graph:** igraph-Leiden, resolution as in `job_7` (`leiden-res1.0`) unless the
  eval sweep says otherwise.
- **Scorer:** the refit pair scorer (`edge-fit.refit-2026-06-02.json`). **θ is the
  variable to re-baseline — do not hardcode 0.668.** Sweep θ around it (e.g.
  0.62–0.72 in steps) and report eval at each; analytics picks θ from the curve.

## Guards to preserve (carry forward exactly — both-ways)
- §2b template-suppression (`indep_src≥25 AND entity_core_cov<0.45`).
- size×core gate (mig 093): suppress `core<0.25 AND article_count≥15 AND NOT
  vernacular-core-zero`.
- sub-cluster rescue (core-only, src≥12, before id-assignment; tcoh-rescue OFF).
- F-1 rep-title (on-core picker), F-2 display stoplist, F-3 subject_country.
- Report the **core-checksum** and both-gate counts so we can confirm the entity
  core didn't shift unexpectedly.

## Parachute (build dark)
- Write to **new, clearly-named tables** (e.g. `analytics.story_clusters_v8` /
  `_members_v8` / `_edges_v8`), leaving `job_7` (`story_*`) and `story_*_old`
  untouched.
- Keep run provenance: `run_id`, `algo_version`, `as_of`.

---

## Over-merge sub-split pass (≥100 clusters) — CONFIRMED RULE
The discriminator that separates a real mega-event from a template/actor pile is
**cross-sub-community entity Jaccard**, NOT coherence (both plateau ~0.74–0.80).
A clean θ=0.13 gap on a 34-sample was a SMALL-SAMPLE ARTIFACT — at full band-B
scale (82 clusters) 5 land in the gap and ~3/76 misclassify on jaccard alone.
So the rule is **jaccard primary + 2 deterministic guards + a small LLM residual**,
not a bare threshold. Every scale failure was explained and fixed by a named
secondary (below).

For every cluster with `article_count >= 100`:
1. **Sub-split** with our Leiden on the member subgraph (`story_edges`,
   score-weighted) at **resolution 3.0**; keep sub-communities ≥10 members.
2. Per sub-community, take **top-5 CLEAN entities** (top-3 per member from
   `articles.entities_extracted` — the co-mention-validated signal, NOT the
   alias-expanded matviews).
3. Compute **mean pairwise Jaccard** of the sub-communities' top-5 entity sets,
   and `shared_core_size` (entities in ≥50% of sub-communities).
4. **Apply the multi-signal rule (jaccard primary + 2 guards + LLM residual):**
   - **PRIMARY:** `mean_jaccard ≥ θ` (θ≈0.13, re-baseline on `_v8`) → lean KEEP
     (one event, sub-comms = timeline facets); `< θ` → lean SPLIT (over-merge,
     emit each sub-community as its own story).
   - **GUARD 1 — bridge-demote → force SPLIT:** if one generic actor/geo hub is
     in ≥80% of sub-communities AND it is the ONLY shared subject (rest of each
     sub disjoint / shared_core≈1), it's an actor-pile — split even if j≥θ.
     (Fixes Nigeria-econ 0.157, Tinubu 0.159, Trump 0.151.)
   - **GUARD 2 — few-subs rescue → KEEP:** if `#subs < 4`, jaccard is noisy (one
     pair drives it); trust `shared_core_size` — `shared_core ≥ 4` → KEEP.
     (Fixes Russia-Ukraine: 2 subs, j=0.111, shared_core=9, a real event that a
     bare threshold WRONGLY suppressed.)
   - **RESIDUAL → LLM:** the ~0.10–0.16 band where the hub is a sports team
     (team-season vs single-match is genuinely ambiguous). One local-Qwen call,
     these only. Report how many clusters fall here.
5. **Re-confirm ALL parameters on the fresh `_v8` run before locking live** — θ,
   the 0.80 hub fraction, the shared_core/#subs cutoffs were fitted to the job_7
   snapshot. The 34-sample "clean gap" was a small-sample artifact; do not trust
   any of these numbers until they reproduce at scale on `_v8`.

This **replaces suppression** for giants: instead of hiding template-family
blobs, split them (recover real stories) and rescue mis-suppressed real events
(e.g. a Russia-Ukraine cluster was wrongly suppressed; jaccard rescues it).

**Side flag (not blocking):** junk over-extracted entities ("Mick Price",
"Theresa May", "Shantaram More", "Nasire Best") recur as pile-glue → feed the
entity-extraction / alias-cleanup-v2 backlog.

### Pinned params (PROVISIONAL — re-confirm/re-derive on _v8)
Final classification on job_7's 106 clusters ≥100: KEEP 38 · SPLIT 63 ·
LLM-residual 5 (jaccard-primary 73, few-subs-rescue 16, bridge-demote 6,
sports-residual 5, no-split-coherent 6).
```
THETA            = 0.13     # primary: jaccard >= -> lean KEEP
HUB_UBIQ_FRAC    = 0.80     # entity is a 'hub' if in >=80% of sub-communities
GENERIC_DF_MIN   = 25       # hub is 'generic' if primary_entity DF >=25 run clusters
                            #   (event-subjects DF<=6, generics DF>=84; DF-DEPENDENT,
                            #    RE-DERIVE on _v8 — cluster count changes the DF scale)
SHARED_CORE_KEEP = 4        # few-subs rescue: KEEP if shared_core >= 4
MIN_SUBS         = 4        # below this, jaccard unstable -> trust shared_core
SPORTS_BAND      = [0.10, 0.16]   # sports-team hub here -> LLM
```
**A-vs-B decision (analytics leans B):** the 2 residual errors (Israel real-war
false-SPLIT at sc=1; Tinubu actor-pile false-KEEP at sc=2) are the same
generic-hub-as-or-not-subject case — semantically irreducible for the rule.
**Option B = route the demote-boundary (generic-hub + sc≤1 + j∈[0.13,0.17]) to
the LLM** instead of a hard demote; residual 5→~11 (~10%, ~free on local Qwen).
Validate B by the LLM's verdicts on the deferred band (must yield Israel=KEEP,
Tinubu/Nigeria/APC=SPLIT), not by recounts. A = accept ~2% error. Lean B; lock on
_v8.

## Eval re-baseline (the point of the exercise)
Run BOTH gates against the fresh run, at each swept θ:
- **Golden set** — `docs/fixtures/cluster-golden.json` (134 groups) → precision.
- **Recall set** — `docs/fixtures/cluster-recall-verified-2026-05-29.md` /
  `cluster-recall-set.json` (20 events) → recall.
- Prior (on *degraded* data, for reference only — do not treat as target):
  precision ~91%, recall ~54%. Recall is expected higher at caught-up state.

## What to report back (RAW output — analytics does not retype numbers)
Per the number-handling protocol, paste/save raw tool output; analytics reads it
and locks θ. Report:
1. **Eval sweep table:** θ → precision, recall (golden + recall set).
2. **Production shape at the chosen-candidate θ:**
   - total stories; **stories/day** by `date(first_seen_at)` last 14 days;
   - **single-article vs multi-article split** + avg articles/story;
   - suppression_reason distribution; core-checksum; both-gate counts.
3. **Old-vs-new comparison** on the same recent days (`job_7` vs `_v8`):
   stories/day, single/multi ratio, any large cluster (>1000) signatures.
4. Anything pathological (mega-blobs, a networkx fallback firing, recipe mismatch).

## Decision gate (analytics, after your numbers land)
Adopt `_v8` over `job_7` only if: precision ≥ the job_7 baseline at a θ where
recall is materially higher, stories/day + single/multi ratio look sane, the
core-checksum + both gates are green, and no new mega-blob class appears. Else we
keep `job_7` and diagnose. The live swap is a **separate** later step behind the
kill-switch + parachute.

## Owner split
DB chat: runs the build + eval, owns the `_v8` tables, reports raw numbers.
Analytics: picks θ, decides adopt-vs-keep, specs the live swap if adopted.
Product: untouched until a swap is approved.

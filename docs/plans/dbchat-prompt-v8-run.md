# DB-chat run prompt — `_v8` whole-corpus rerun (FULL SPEED, crash-safe)

Decision: **run now, full priority.** Accept that live ingest may lag during the run.
Hard requirement: **it must not crash the box or the live workers** — so the job runs
inside a memory cap that kills the JOB (not postgres, not night-desk, not NLP) if it
balloons. Box is small (4 CPU / 15 GB RAM, ~13 GB free), so these rails are mandatory,
not optional.

---

## 0. Files are on the box (this side isn't a git repo; I scp'd them)
- `/root/rig/docs/plans/clustering-rerun-kickoff-2026-06-12.md` — THE spec. Follow as written.
- `/root/rig/docs/plans/post-v8-revalidation-2026-06-13.md`, `/root/rig/scratch/worldwide/validate_v8.sql`,
  `sections.sql` — my validation half (I run these from my side; on the box for your visibility).

## 1. What to run
Build-dark whole-corpus rerun: `cluster_job_7.py → story_loader.py → subcluster_rescue.py
+ migrations 093/094`, into NEW tables `analytics.story_clusters_v8` / `_members_v8` /
`_edges_v8`. Leave `job_7` (`story_*`) and `story_*_old` untouched. Deploy branch
`feat/clustering-story-layer-0a` onto Hetzner to run it.

## 2. Params
- **Base/legacy guards — your reconstructed values are correct:** CAND_COS≈0.80,
  RESCUE_MIN_SRC=12, FLAG_MIN_SRC=25, CORE_T=0.45, TCOH_T=0.35, TCOH_CAP=1000,
  SIZE_CORE_LOW=0.25; scorer θ-sweep 0.62–0.72.
- **Sub-split rule — NOT reconstructable, pull from the kickoff doc** (§"Over-merge
  sub-split pass"): jaccard-primary THETA=0.13 (provisional) + bridge-demote
  (HUB_UBIQ_FRAC=0.80, GENERIC_DF_MIN=25) + few-subs-rescue (SHARED_CORE_KEEP=4,
  MIN_SUBS=4) + sports-residual→LLM (SPORTS_BAND=[0.10,0.16]); member subgraph at
  resolution 3.0, sub-comms ≥10. **Re-derive GENERIC_DF_MIN from the _v8 DF histogram
  — do NOT hardcode 25** (DF-scale-dependent). I lock θ + guards off your raw numbers.

## 3. Table/column contract — confirmed
`story_clusters_v8` / `story_cluster_members_v8`; member col `article_id`; size
`article_count`; `representative_title`; `representative_article_id` — all match.
**suppression_reason → option (b) with PARITY:** the builder doesn't emit it, but job_7's
live table carries it (`template-family`, `actor-pile-handflag`, `size-core-gate`,
NULL=surfaced). Derive it on `_v8` at load using the **same mapping + same exact strings**
(run 093's equivalent). My validation + the eventual cutover depend on _v8 matching live
schema AND values. Don't invent new strings.

## 4. CRASH-SAFETY RAILS (the "must not crash" guarantee)
The guarantee is: **the box and live workers survive no matter what.** Worst case the
_v8 job itself dies cleanly and resumes from its last checkpoint.

1. **Hard memory cap — run the whole job inside it:**
   `systemd-run --scope -p MemoryMax=10G -p MemorySwapMax=0 <your run cmd>`
   (cgroup v2 → if the job exceeds 10 G the kernel OOM-kills ONLY this scope; postgres
   + night-desk + NLP keep their ~5 G). If systemd-run isn't available, fallback
   `ulimit -v 10485760` before exec. This is the line that makes "full speed" safe.
2. **Pre-flight gate:** abort with a clear error unless `free -m` available ≥ 11000 MB
   at start. Don't launch blind.
3. **Fail-loud graph backend:** confirm igraph + leidenalg are the ones imported at
   runtime; the silent networkx fallback is the OOM landmine on 273 K nodes — it must
   ERROR, not fall back.
4. **Don't slurp:** stream embeddings via a server-side cursor in batches; hold ONE copy
   of the matrix (~0.84 GB), never duplicate it across stages.
5. **Postgres politeness:** the job uses ONE connection; `SET work_mem` locally if needed,
   never raise it globally; don't exhaust connections the night-desk needs.
6. **Build-dark + checkpoint per stage** (cluster → load → rescue → 093/094) so any
   failure is resumable and never touches job_7 or live.
7. **Watch during the run:** tail the job's RSS + `free -m` + night-desk ingest lag. If
   memory goes red the cap handles it; if ingest lag spikes, that's the accepted cost of
   full speed — log it, keep going.

## 5. Hand-off + report
- **Ping #1** the instant clusters land (pre-enrichment) → I fire Phase-1 (size-bucket
  split-proof + member-fit) from my side immediately.
- **Ping #2** after enrichment runs on `_v8` (topic/facts/subject_country populated) →
  unblocks my Phase-2 section checks.
- Paste RAW tool output (number-handling protocol — I read + lock, I don't retype) for:
  4. threshold re-confirm on ≥100 clusters (per-cluster jaccard / shared_core / #subs /
     hub-fraction table, gap shape, any FN, **+ the primary-entity DF histogram**);
  5. eval sweep θ 0.62–0.72 → precision (golden 134) + recall (20-event);
  6. production shape at candidate θ (totals; stories/day 14 d; single vs multi + avg
     multi size; suppression-reason dist; core-checksum; both-gate counts);
  7. old-vs-new (`job_7` vs `_v8`) same recent days: stories/day, single/multi, >1000
     signatures.

No live swap until I make the adopt-vs-hold call on your numbers.

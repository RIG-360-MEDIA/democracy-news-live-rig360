# Project History (consolidated)

**Consolidated 2026-06-12 from ~40 dated plan/audit/session docs.** This is the
chronological digest — the decisions, what shipped, and the lessons. For live DB
structure see [`DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md); for the database guide
see [`DATABASE.md`](DATABASE.md); for the working discipline see
[`RIGWIRE.md`](RIGWIRE.md).

> Built from the canonical handoff + memory + the dated doc set. Where a figure
> appears it is attributed to the doc that recorded it; no new numbers were
> computed here.

---

## Timeline

### 2026-05-28 — Deduplication foundation
Built the near-duplicate detection system before clustering. MinHash design,
precision audit on `is_duplicate`, validation passes (v2, then a "smart" v3).
*Docs: `audits/is-duplicate-precision`, `dedup-minhash-design`,
`dedup-validation-2026-05-28-v2`, `dedup-design-v3-smart`.*

### 2026-05-29 — Dedup calibration + clustering proof-of-concept
Final dedup calibration locked. First content-gen data audit. Clustering
validation plan + a clustering proof, with a verified recall set as ground truth.
*Docs: `audits/dedup-final-calibration`, `data-audit-content-gen`,
`plans/clustering-validation-plan`, `audits/clustering-proof`,
`fixtures/cluster-recall-verified`.*

### 2026-05-30 — Story-engine kickoff + Worldwide feature
Story-clustering engine specced: build brief, `story_clusters` schema, the data
questions for the DB chat, and an embedding-recipe A/B. Worldwide news feature
spec + roadmap drafted in parallel.
*Docs: `story-engine-build-brief`, `story-clusters-schema`,
`clustering-data-questions`, `embedding-recipe-ab`, `worldwide-build-spec`,
`worldwide-build-roadmap`.*

### 2026-05-31 — Clustering engine spec + V4 embeddings
Clustering engine spec finalized. DB-chat task lists + deliverables defined. **V4
embedding recipe confirmed** (`v4-tr-title-1024`, translated·title·1024). Edge
(pair) scorer feature extraction designed. Sanity checks run.
*Docs: `clustering-engine-spec`, `db-chat-tasks`, `db-chat-confirm-v4`,
`db-chat-deliverables`, `edge-scorer-feature-extract`, `sanity-check`.*

### 2026-06-01 — Topic view + DB tasks
Topic-view spec; next round of DB-chat tasks.
*Docs: `topic-view-spec`, `db-chat-tasks-2026-06-01`.*

### 2026-06-02 — Job 7 build, scorer fit, scale, guards
The big build day. **Clustering "job 7" built** (the run still live today):
igraph-Leiden over V4 embeddings. Pair-scorer **refit on new entities**
(shared_actors weight flipped positive; θ=0.668). Scale test + rebaseline
scorecard. **v1.1 locked.** First guards landed: cross-source template-suppression
(§2b), entity-core guard revision, loader enrichment. Foreign-NER weakness
diagnosed (carved out, not solved). Build/launch plan + product read-path handoff.
*Docs: `clustering-job-7-build-handoff`, `edge-scorer-fit-transcription`,
`rebaseline-scorecard`, `scale-test-spec`, `clustering-v1.1-lock`,
`whole-corpus-digest`, `latest-window-digest`, `vernacular-blob-verify`,
`loader-enrichment-spec`, `cross-source-template-guard-spec`,
`guard-revision-entity-core`, `ner-foreign-events-diagnostic`,
`build-launch-plan`, `product-readpath-handoff`.*

### 2026-06-03 — Live schema pinned, quality audit, blockers, AEM, content-gen
Live story-layer schema pinned. Quality audit surfaced the blockers: a
size×core gate (migration 093) caught a NASA grab-bag + exam pile while sparing
legit-small/vernacular clusters. Entity-picker "fix" was **rejected by
measurement** (core wasn't broken — low core is a real artifact of multi-actor
stories). Three diagnostics run (NASA + AEM + cross-lingual). AEM fix specced.
Format-pile title-flag regex locked. Content-gen architecture drafted
(verifier-FIRST, fact-ledger, winners-only, append-versioned).
*Docs: `story-layer-LIVE-SCHEMA-PINNED`, `story-layer-quality-audit`,
`blocker-diagnostic`, `blocker-fix-size-core-gate`, `entity-picker-scoping`,
`prelaunch-fix-punchlist`, `three-diagnostics`, `aem-fix-spec`,
`format-pile-titleflag-spec`, `aem-dossier-verify-handoff`, `content-gen-design`.*

### 2026-06-04 — Pre-launch close-out + coherence v2 specced
Pre-launch punch-list **closed**. The AEM hallucination launch-gate resolved via
a **consumer-side body-presence filter** in OSINT's `textual.py` (not extraction
— that's the durable v2 fix). 6 actor-piles hand-flagged (migration 097). F-1
rep-titles upgraded for 644 stories (migration 098). `posture.py` matcher widened
with a 40-entity Latin-abbreviation dictionary. Coherence v2 fully specced as the
**one** post-launch workstream (golden set → Leiden hierarchy → LLM judge →
maybe Matryoshka). Entity-dict dedup specced. OSINT shipped 2026-06-05.
*Docs: `story-quality-diagnostic`, `story-quality-cooccurrence`,
`entity-dict-dedup-spec`, `coherence-v2-golden-set`,
`coherence-v2-golden-set-dbchat-kickoff`, `sessions/session-2026-06-04-handoff`.*

### 2026-06-12 — DB re-verified live
Confirmed the substrate is ingesting normally (articles/clippings/youtube/entity
rollups all same-day); the `analytics.story_*` clustering keeper is parked at the
job-7 run by design (behind the parachute), not broken. Docs consolidated; the
DB guide + generated schema reference created so a dated snapshot can't be
mistaken for live state again.

---

## Wrong fixes killed by measurement (the discipline moat)

Every one sounded right; the data killed it before it shipped:
1. Rescue-guess threshold (wrong before any data).
2. Entity-picker "fix" (low core is a real multi-actor artifact, not a bug).
3. Weighted region-aggregation (→ mis-attributed to Sierra Leone).
4. Facts-unit-regex (only ~9% lift).
5. Over-merge density detection (failed anchor check — real mega-events ranked lowest).
6. Topic-spread proxy (BACKWARDS — real mega-events span MORE topics).
7. AEM "alias-stoplist" (the residual class isn't aliases).
8. Title-net inverted (template-spam has HIGHER title-cohesion than real events).
9. Script-coverage hypothesis (was alias-overreach in 3 of 4 cases).
10. Pre-committed 3-signal aggregate gate (no usable threshold existed).

## Banked lessons

- **Diagnose the layer before fixing.** The expensive failure is confidently
  fixing the wrong layer. Name the layer; if you can't, get the read that does.
- **Measure before fixing — always.** Name the data that would falsify a signal
  before building it.
- **Both-ways validation is the gate.** A fix must catch the bad AND spare the
  good. Quantify the spare side too.
- **A dramatic catch-side win is the most dangerous moment to skip the
  spare-side measurement.** (AEM refresh fixed SAIL → looked done → Andaman
  residual remained.)
- **One visible error masks many invisible ones.** (A cron rolled back 5
  matviews silently because one errored loudly.)
- **Calibration specs are snapshots — upstream changes invalidate them.**
- **The keeper protects content-gen.** Clustering rides `entities_extracted`
  top-3 with co-mention validation, so it survives dirty AEM attributions.
- **Build dark, flip later.** Code lands gated/additive defaulting to old
  behaviour; the user-visible flip is a separate, later decision.
- **Number-handling protocol.** The analytics chat does not write measured
  numbers into docs — a script writes them, or the DB chat transcribes. (Born
  from fabricating A/B numbers 5× in one session.)
- **2026-06-12: don't generalize one layer to the whole system.** "The
  clustering run hasn't changed" is not "the DB is frozen." Check ingest
  freshness before making a system-wide claim.

## Still open (post-launch backlog)

- **Coherence v2** — the relational signal to separate real mega-events from
  actor-piles/over-merges. Aggregate magnitudes can't do it.
- **AEM extraction-time validation** — the durable fix for the hallucination
  class currently handled consumer-side in `textual.py`.
- **Alias-cleanup-v2** — drop dangerous bare-common-noun aliases
  ("Congress", "Ali", …) from `entity_dictionary`; fix party rows mis-typed as
  `person`.
- **Forward-mode / live cadence** — the story engine has never run continuously;
  the first breaking-news burst is the untested motion.
- Smaller: F-4 freshness decay, S-1 facts gate, title-flag §B ship.

# Topic View — "give me all the X stories" (retrieve → cluster → timeline)
**From:** analytics chat (Aryan) · **Date:** 2026-06-01
**Status:** capability spec — sits ON TOP of the clustering substrate; usable by
both the news app (Worldwide "Who's in the News" tap-through) and the OSINT
product (entity dossiers / "The Attack").

**Number policy (CLAUDE.local.md):** no measured figure is written by the
analytics chat. Anything quantitative below is tagged to its source doc or marked
[UNVERIFIED] / [VALIDATE].

---

## 1. The core distinction this spec rests on
- **Event** = one real-world happening (one strike, one round of talks). A
  *cluster*.
- **Topic** = a standing subject ("Iran vs US") that *contains many events over
  time*. A *basket of clusters*.

"All Iran–US stories" is a **topic**, so it is a **retrieval** problem, not a
clustering problem. We do **search → then cluster the result**, NOT
cluster-the-universe-then-filter. Evidence this is the right framing: our own
`iran_us_deal` recall event was dropped from clean eval as a *"sprawling
multi-week mega-topic, not one event"* (~700 FTS hits) — see
`cluster-recall-verified-2026-05-29.md`. The topic literally *is* a bag of events.

## 2. Pipeline
```
query ("Iran vs US")
  │
  ▼  (1) RETRIEVE the topic article set   ── indexed, no full scan
  │      entity filter ∪ primary_subject(EN) ∪ FTS ∪ semantic(ANN)
  ▼  (2) CLUSTER the subset into events    ── the windowed clusterer, on the subset
  │      (reuse story_clusters if already computed; else cluster on demand)
  ▼  (3) ORDER events into a TIMELINE      ── by effective_event_date / collected_at
  ▼  (4) PER EVENT: representative + origin + outlet spread + languages
```
Output = the topic as a **time-ordered list of events**, each a cluster with its
headline, first-mover, source spread, and language mix.

## 3. Retrieval (step 1) — the part that must be multi-signal
**Do NOT retrieve on the embedding alone.** Cross-lingual recall on the vector is
weak (Indic same-event twins rank ~23–35th, cosine ~0.71–0.78, *below* a useful
cut — DB-chat-verified, `embedding-recipe-ab-2026-05-30.md`). So a pure
vector-search topic query **misses the Telugu/Hindi coverage** — fatal for a
"complete picture" feature. Retrieve via the **union** of:

| Signal | Why | Cross-lingual? |
|---|---|---|
| **Resolved entity_ids** (Iran ∩ US) | precise actor match | partial (Indic resolve thin: te~35/hi~23/kn~11% — Q4) |
| **`primary_subject` (English) FTS/trigram** | English on *every* article incl. Indic → the cross-lingual bridge | **yes — the key one** |
| **Title/body FTS** | keyword recall, language-native | within-language |
| **Semantic ANN** (V4 vector) | catches paraphrase / no-keyword | within-language strong, cross weak |

**Rule:** `entity OR primary_subject-match OR FTS OR (ANN ≥ relaxed cosine)` →
candidate topic set. Union (recall-first), because a topic view that silently
drops a language is worse than one with a few extra articles (the cluster step
prunes strays). The **`primary_subject` English bridge is what makes the Telugu
Iran–US article show up at all** — same lesson as the clusterer.

## 4. Clustering the subset (step 2)
- The subset is small (one topic, even multi-week, is hundreds–low-thousands) →
  cluster it directly with the **same engine**, no special path.
- **Prefer reuse:** if `story_clusters` already covers these articles (live window
  or a past replay), just **group by `story_id`** — no re-cluster. Compute on
  demand only for articles not yet clustered.
- This is why Topic View is **cheap**: it never clusters the 122K; it clusters one
  topic's worth, or reuses what's already in `story_clusters`.

## 5. Per-event enrichment (step 4) — reuses the cluster tagging
Each event (cluster) already carries, from `story_clusters` tagging:
representative headline, **origin** (earliest — ⚠️ see caveat), **independent
outlet spread** (AFTER wire-dedup — critical), language mix, source_count,
importance. Topic View just surfaces them per event along the timeline.

## 6. Inherited correctness rules (do NOT re-learn these)
1. **Wire-dedup before "outlet spread."** 50 wire reprints = 1 voice, or every
   topic looks artificially huge / coordinated. (`is_duplicate` ~30%,
   `canonical_url_match`.)
2. **Origin ≠ earliest `collected_at` naively** — `collected_at` is *our crawl
   time*, biased by per-source poll cadence. For "who ran it first" use
   `published_at` + model crawl latency, else a fast-polled outlet always looks
   first. [VALIDATE before shipping attribution.]
3. **Cross-lingual via `primary_subject`/entities/numbers**, not the vector or
   native-script titles.

## 7. What exists today vs. needs building
- **Live now:** ANN/HNSW index, `entities_extracted` + `entity_lookup`, FTS,
  `primary_subject` → so **basic topic *retrieval* is buildable today**, before the
  full clusterer ships (it just returns articles, not yet grouped into events).
- **Needs the clusterer:** the *event grouping* + per-event origin/spread (steps
  2,4) land when `story_clusters` is populated.
- **Phased delivery:** v0 = retrieve + list (today) · v1 = retrieve + group by
  `story_id` + timeline (when clustering ships) · v2 = saved topics / alerts /
  coordination overlay (OSINT).

## 8. API shape (forward-looking, per api-conventions.md)
```
GET /api/topics?q=<query>&from=<date>&to=<date>&scope=<world|nation>
→ ApiResponse<{
    topic: string,
    events: Array<{
      story_id, headline, event_date,
      origin: { source, published_at } | null,   // attribution-gated (§6.2)
      independent_sources: number,                // post wire-dedup
      languages: Record<lang, number>,
      article_count: number
    }>
  }>
```
Read-only, cacheable (`s-maxage`) for non-personalized topic queries. Powers:
news-app entity tap-through · OSINT entity dossier · "The Attack" timeline.

## 9. Open / validate before locking
1. Retrieval **recall vs precision** of the union rule — measure on a labeled topic
   (Iran–US is the natural test set; we already have its FTS hits). [VALIDATE]
2. Origin/attribution crawl-latency model — needed before any "who ran it first"
   claim ships. [VALIDATE]
3. Relaxed ANN cosine for retrieval — tune at re-baseline (looser than the
   clustering edge threshold; recall-first). [VALIDATE]
4. On-demand clustering latency for an un-clustered topic subset. [UNVERIFIED]

# _v8 failure-pattern probe — recall misses + precision false-merges (read-only, no pause)

**Goal:** for BOTH failure sets, find whether each has a SINGLE fixable cause (one language
pair / one glue-entity class / one scorer regime / a few clusters / one topic) or is diffuse.
That decides whether each is a targeted fix or a rebuild. Measure before any fix. Raw output →
file; analytics reads and locks, retypes nothing. _v8 = run_id 1781406460,
`analytics.story_clusters_v8 / story_cluster_members_v8 / story_edges_v8`. Fixtures in
`/root/rig/docs/fixtures/`.

---

## PART A — RECALL misses (the L0 same-event pairs, cosine<0.80, never candidates)
Source = the within-event missed pairs you already computed for the recall-layer probe
(recall-set `article_ids_recalled`, the 59% L0 set). Join each missed pair (a,b) to article
metadata and bucket. Report COUNTS per bucket + 3–5 example pairs (titles) per bucket.

Bucket by:
1. **Language:** same-language vs cross-language pair (a.lang vs b.lang). Is recall loss
   concentrated in cross-lingual pairs? (memory flags foreign/vernacular NER + cross-lingual
   cosine as weak.)
2. **Topic:** same topic vs different topic (the two articles' topic field). Different-topic
   misses = different ANGLES of one event (markets vs casualties) — a title-embedding blind
   spot, not noise.
3. **Title divergence:** for a sample of missed pairs, compute title token-overlap (Jaccard on
   title words, post-lowercase/stop). **The key question:** are missed pairs LOW title-overlap
   but obviously same-event (→ title-only v4 is the cause, full-text embedding would fix) or
   HIGH title-overlap yet low cosine (→ embedding QUALITY is the cause)?
4. **Per-event concentration:** missed-pair count per recall-set event. Uniform across 20, or
   concentrated in a few (multilingual / multi-angle) events?

**Part-A verdict to report:** is the recall loss dominated by ONE pattern (e.g. "X% of misses
are cross-lingual" or "X% are low-title-overlap same-event") → names the fix (full-text embed /
cross-lingual recipe), or spread evenly → embedding rebuild, no shortcut.

---

## PART B — PRECISION false-merges (the 18 violated cannot-link pairs, all in <100 clusters)
Source = `falseMerge.offenders` in the materialized-split eval report JSON (the 18 pairs:
a, b, cluster). For each violated pair (articles that SHOULD be apart but share a cluster):

Pull and tabulate:
1. **Cluster concentration:** how many DISTINCT clusters hold the 18 pairs? (18 pairs in 3
   clusters = one fix each; 18 pairs in 16 clusters = diffuse.)
2. **Glue entity:** the shared `entities_extracted` between a and b that bridged them — and its
   DF (run-cluster document frequency). Is it a GENERIC hub (high DF, like the giant case) that
   slipped through because the cluster is <100 (below the over-merge split's reach)?
3. **Scorer regime:** which refit-scorer regime linked the pair — en-en vs cross-lingual vs
   other? Concentrated in one regime = a scorer-weight fix.
4. **Template/boilerplate:** do the rep-titles / shared text look like roundup/template glue
   ("Live Updates", market-wrap, listicle)? Same family as the §2b title-flag.
5. **Topic:** are a and b same-topic-different-event (hard look-alikes) or different-topic
   (clearly should never merge)?

**Part-B verdict to report:** are the 18 concentrated (one regime / one glue class / a few
clusters) → a targeted fix (extend the over-merge split below 100, or a scorer-weight, or a
title-flag), or diffuse across 18 unrelated causes → systemic scorer issue?

---

## Output
One file (e.g. `/tmp/v8_failure_patterns.txt`): Part-A buckets+examples+verdict, Part-B
table+verdict. Raw. No DB writes. No re-cluster, no ingestion pause. This is pure
characterization so analytics can decide targeted-fix vs rebuild for each side.

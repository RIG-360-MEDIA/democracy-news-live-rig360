# Merge-back payoff simulation — queries for the DB chat (2026-06-17)

**Goal:** before building the merge-back pass, measure its upside and its risk, so the
build is precision-first, not recall-first. Answer three things, at precision tiers
(cos ≥ 0.90 and ≥ 0.85) and split cross-window vs in-window:

1. **Surfaceable-gain** — how many clusters newly cross `indep ≥ 3` if twins are folded.
2. **Ledger-gain** — of those, how many lack a fact-ledger today (i.e. become real content).
3. **Over-merge guardrail** — does any merged component span >1 event? (the GST-pile canary)

Under-merge and over-merge are the **same knob**. Do NOT loosen recall globally. Build the
edge list, simulate the merge as connected components, and measure — at 0.90 first.

---

## 0. Confirmed definitions (DB chat, 2026-06-17) — replicate EXACTLY

- **Membership table = `analytics.story_cluster_members_v8`** (303,858 rows), clusters =
  `analytics.story_clusters_v8`. **Do NOT `LIKE '%members%'`** — 7 live look-alikes feed stale
  data: `_v8copy` (296,909), `_archive` (136k), `_old` (48k), `_fwdrun` (36k), `_v8shadow4` (33k),
  `_v8shadow` (18k). Use the exact name.
- **`independent_source_count` = `LEAST(count(distinct source_id), count(distinct reprint_key))`**
  — NOT `count(distinct source_id)`. (`story_loader.py:275-276`: `indep = min(srcn, uniq_bodies)`.)
  A wire body (PTI/AP/Reuters) reprinted by 8 outlets = 8 source_ids but **1 reprint_key** → counts
  as **one** independent report. Using raw `count(distinct source_id)` over-counts and inflates
  `ledger_gain`. **Carry `reprint_key` per article and apply the `LEAST`.**
- **`reprint_key(title, lead)`** (`story_loader.py:92`, byte-exact): base = `lead` if `len(lead)≥60`
  else `title` → lowercase → replace `[^a-z0-9 ]` with space → collapse whitespace → first 120 chars.
  SQL replication (verify against a sample row):
  ```sql
  left(
    trim(regexp_replace(
      regexp_replace(
        lower(CASE WHEN length(trim(coalesce(a.lead,''))) >= 60
                   THEN trim(a.lead) ELSE coalesce(a.title,'') END),
        '[^a-z0-9 ]', ' ', 'g'),
    '\s+', ' ', 'g')),
  120)
  ```
- **Do NOT reuse the stored canonical-member flag** (`is_canonical` / `aid in canon`) — it's canonical
  *within the current cluster's* wire-sets. Merging two clusters fuses two wire-sets, so `reprint_key`
  (hence indep) **must be recomputed over the merged set**.
- **Full surfaceable predicate** = `NOT is_template_family AND (independent_source_count >= 3 OR
  rescued_from_story_id IS NOT NULL)`. So:
  - **Drop `is_template_family` clusters from candidacy entirely** (both ends of every edge).
  - **"Newly surfaceable"** = a component where currently **no** member satisfies the predicate, that
    crosses merged-`indep ≥ 3`. **Exclude already-`rescued` members** from the gain (already surfaceable).
- Window = 4 days (batch span). `WINDOW_DAYS = 4`.
- Vector index `idx_articles_embedding_v4` exists; `<=>` = cosine distance, so `1 - (a<=>b)` = cosine.

---

## 1. Build the twin edge list (single-source fragments → nearest diff-cluster article)

```sql
DROP TABLE IF EXISTS mergeback_edges;
CREATE TEMP TABLE mergeback_edges AS
WITH src AS (
  -- the fragments we suspect are under-merged: single-source, not suppressed
  SELECT sc.story_id AS a_story,
         a.id        AS a_art,
         a.labse_embedding_v4 AS emb,
         a.published_at       AS a_time
  FROM analytics.story_clusters_v8 sc
  JOIN articles a ON a.id = sc.representative_article_id
  WHERE sc.independent_source_count = 1
    AND sc.suppression_reason IS NULL
    AND NOT sc.is_template_family          -- template families excluded from candidacy
    AND a.labse_embedding_v4 IS NOT NULL
)
SELECT DISTINCT ON (s.a_story)
       s.a_story,
       cand.b_story,
       cand.cos,
       cand.day_gap,
       (cand.day_gap <= 4) AS in_window
FROM src s
CROSS JOIN LATERAL (
  -- ANN top-12 neighbours, then keep the closest one in a DIFFERENT, non-template cluster
  SELECT m.story_id AS b_story,
         1 - (a2.labse_embedding_v4 <=> s.emb) AS cos,
         abs(extract(epoch FROM (s.a_time - a2.published_at))) / 86400.0 AS day_gap
  FROM articles a2
  JOIN analytics.story_cluster_members_v8 m ON m.article_id = a2.id
  JOIN analytics.story_clusters_v8 sc2 ON sc2.story_id = m.story_id
  WHERE a2.id <> s.a_art
    AND NOT sc2.is_template_family
  ORDER BY a2.labse_embedding_v4 <=> s.emb
  LIMIT 12
) cand
WHERE cand.b_story <> s.a_story
  AND cand.cos >= 0.80          -- keep 0.80+ so we can tier afterward
ORDER BY s.a_story, cand.cos DESC;

CREATE INDEX ON mergeback_edges (a_story);
CREATE INDEX ON mergeback_edges (b_story);
```

> Run on a **sample first** if full-scan is heavy: add `AND random() < 0.02` to `src`,
> measure, then scale. For the final payoff number, run full.

**Tier + window distribution (sanity, before simulating):**
```sql
SELECT CASE WHEN cos>=0.95 THEN '0.95+'
            WHEN cos>=0.90 THEN '0.90-0.95'
            WHEN cos>=0.85 THEN '0.85-0.90'
            ELSE '0.80-0.85' END AS tier,
       in_window,
       count(*) AS edges
FROM mergeback_edges GROUP BY 1,2 ORDER BY 1,2;
```

---

## 2. Simulate the merge as connected components (do this in a script)

Edges in SQL, components in code — a recursive CTE over a dense graph can explode.
In the `.mjs`/python runner: union-find over `(a_story, b_story)` for edges at the chosen
`τ` (0.90, then 0.85). Each component = one merged story. Then per component, **recompute indep
over the MERGED article set** (do not reuse stored per-cluster values for the merged indep):

- `merged_indep = LEAST(count(DISTINCT source_id), count(DISTINCT reprint_key))` over **all**
  member articles of **all** clusters in the component.
- `was_surfaceable` = any member cluster already satisfies the production predicate
  `NOT is_template_family AND (independent_source_count >= 3 OR rescued_from_story_id IS NOT NULL)`.
- `merged_surfaceable = merged_indep >= 3`.

**Surfaceable-gain** = components where `merged_surfaceable AND NOT was_surfaceable`
(rescued/already-surfaceable members excluded — they were already counted).

Per-component member rollup the script groups by its union-find component id — carries
`source_id` AND the recomputed `reprint_key` so the `LEAST` can be applied across the merge:
```sql
SELECT m.story_id,
       a.source_id,
       left(trim(regexp_replace(
         regexp_replace(
           lower(CASE WHEN length(trim(coalesce(a.lead,''))) >= 60
                      THEN trim(a.lead) ELSE coalesce(a.title,'') END),
           '[^a-z0-9 ]', ' ', 'g'),
       '\s+', ' ', 'g')), 120) AS reprint_key
FROM analytics.story_cluster_members_v8 m
JOIN articles a ON a.id = m.article_id
WHERE m.story_id = ANY($1);   -- $1 = all story_ids in mergeback_edges at τ

-- per-cluster surfaceable flag (script ORs across a component for was_surfaceable)
SELECT story_id,
       (NOT is_template_family
        AND (independent_source_count >= 3 OR rescued_from_story_id IS NOT NULL)) AS already_surfaceable
FROM analytics.story_clusters_v8
WHERE story_id = ANY($1);
```

Report, **per τ ∈ {0.90, 0.85}** and **per in_window ∈ {true,false}**:
`components`, `newly_surfaceable_components`, `articles_pulled_in`.

---

## 3. Ledger-gain (the real content payoff)

Of the **newly-surfaceable components**, how many have NO fact-ledger on any member today
(so the merge unlocks brand-new content rather than thickening an existing read):

```sql
-- script passes the member story_ids of each newly-surfaceable component
SELECT bool_or(EXISTS (
         SELECT 1 FROM analytics.story_facts_v8 f WHERE f.story_id = s.story_id
       )) AS any_member_has_ledger
FROM unnest($1::uuid[]) AS s(story_id);
```
`ledger_gain` = count of newly-surfaceable components where `any_member_has_ledger = false`.
That is the number of **new fact-ledgers / new real articles** the merge-back would create
(after re-enrichment). This is the headline payoff number.

---

## 4. Over-merge guardrail (run BEFORE accepting any τ)

A merge is only safe if components stay single-event. Template families are already excluded
from candidacy (§0/§1), so the multi-entity canary runs on non-template components by
construction — a legitimately multi-entity template family won't read as false over-merge. Two canaries:

```sql
-- (a) component size distribution: script reports max + p99 component member count per τ.
--     A long tail of huge components at 0.85 = recall too loose → back off to 0.90.

-- (b) entity spread: a single-event component should share a dominant entity.
--     For each component, count distinct dominant entities across members:
SELECT story_id,
       (SELECT e.key FROM jsonb_each_text(primary_entities) e
        ORDER BY (e.value)::int DESC LIMIT 1) AS dom_entity
FROM analytics.story_clusters_v8
WHERE story_id = ANY($1);
-- script: components with >1 distinct dom_entity = over-merge suspects. Report the rate per τ.
```

**Accept-τ rule:** pick the **highest-precision tier** whose over-merge suspect rate is
negligible and whose max component size is small. Expect 0.90 to be clean; 0.85 to start
showing spread. If 0.85's suspect rate is non-trivial, ship the pass at 0.90 only.

**Production guardrail after any merge-back run:** the count of `is_multi_event` /
`SIZE_NET`-flagged clusters must **not** climb. If it does, you traded under-merge for
over-merge — back off the threshold.

---

## Deliverable back to analytics chat (raw numbers per the number-handling protocol)

A small table: for τ ∈ {0.90, 0.85} × {cross-window, in-window} →
`newly_surfaceable_components`, `ledger_gain`, `max_component_size`, `multi_entity_rate`.

That tells us whether the merge-back is worth building and at exactly which threshold —
and we sequence it as the **forward-loop repair** (one precision-gated recipe), starting
with the safe cross-window 0.90 stitch.

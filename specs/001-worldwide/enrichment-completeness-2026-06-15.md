# Enrichment Data-Completeness — provenance gaps to fix BEFORE the build (2026-06-15)

**The pattern (verified against real `_v8` columns):** the **row-level** enrichment tables
(quotes, sources) kept their provenance; the **aggregated** ones (facts, stance, timeline)
**collapsed away the date/source detail.** A trustworthy news product needs the
**(claim · date · source · tier)** detail on everything — so restore it on the aggregates.
The fact-date issue is one instance; here are the rest so we don't hit them mid-build.

## Per component (what's there → what to add)

### Facts — `story_facts_v8` ⚠ biggest
Today: `value_min/max/latest, unit, citing_article_ids, single_source`. **No per-value date or source.**
ADD: a **per-value series of (value, date, source_id, tier)**.
Enables: **update vs disagreement** (10→20 over time = update; same-day spread = uncertainty),
**source-weighted numbers** (tier-1 figure beats a tabloid), consensus-vs-outlier.

### Timeline — `story_timeline_v8` ⚠
Today: tempo only (`first/last/peak_at, velocity, span_hours, is_breaking, dormant_since`).
ADD: **real dated developments** — `(date → what happened → source)` rows.
Enables: the "how it unfolded" story-page timeline (FR-013). Tempo stays as a separate signal.

### Stance / perspective — `story_stance_v8` ⚠ (the All-Sides enabler)
Today: aggregate `stance_distribution, sentiment, n_stances` only — **no source→stance mapping.**
ADD: **which outlets hold which stance + counts**, and **coverage-by-lean incl. who is SILENT**.
Enables: All-Sides ("left says X via these 5, right says Y via these 3") + **blindspot** (one side not covering).

### Sources — `story_sources_v8` ✅ mostly good
Has: `first_seen_at` (date ✓), `source_tier`, `source_country`, `is_canonical_origin` (first-to-report/scoop ✓).
ADD: **per-source political lean** (left/right/state) — needed to group outlets for All-Sides.

### Quotes — `story_quotes_v8` ✅ mostly good
Has: `article_id` (→ source + date reachable ✓), `speaker`, `speaker_entity_id`, `is_direct`, `quote_text_en`.
ADD: surface the **quote date** (via article_id→published_at) and a **disputed/retracted** flag.

### Geo — `story_geo_v8` ✅ fine for v1
Has: `primary_country, continent, country_spread, subject_countries` (good for Around-the-World by continent).
ADD only if a **pin-map** is wanted: lat/lng. Country-shaded map works as-is.

### Cluster timestamps — `story_clusters_v8` ⚠ verify
CONFIRM `first_seen_at` = the first **article's `published_at`** (real event start), NOT our `collected_at`
(scrape time). Recency ranking + the timeline depend on REAL dates, not when we happened to scrape.

### Generated article (when built)
STORE: **fact-version stamp** (which facts it was built from → regen on change), **per-claim provenance
trace** (the verifier already computes it — persist it for inline citations + corrections), visible **updated-at**.

## The one rule to bake in now
**Every value / quote / stance / development carries `(date, source, tier)`.** That single discipline
is what lets us: gate numbers (S-1), tell update-vs-disagreement, show citations, build All-Sides +
blindspot, handle corrections, and rank by recency on *real* dates. Today the aggregates dropped it —
add it before generating, or every one of these features hits the same wall.

## Priority
P1 (gate core features): facts time-series · real timeline · cluster first_seen_at = published_at.
P2 (All-Sides/blindspot): stance source-mapping · source lean.
P3 (polish): quote date+disputed flag · geo coords. → fold into the DB-chat enrichment-v2 ask.

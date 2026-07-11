# Prompt for DB chat — full data inventory + enrichment audit

Goal: a COMPLETE map of every field we extract about a story/article, what each
means, whether it's usable as article content, and what we're currently
throwing away. This tells us how to make generated articles richer.

Paste everything below into the DB chat.

---

I need a complete audit of the story/article data in our database so we know
exactly what we have to work with. Our article generator today writes mostly
from facts + quotes and the articles read thin. I suspect we extract far more
than we use, and that we aggregate away useful per-article detail. Give me
ground truth from the DB, not guesses.

## Part 1 — Inventory every relevant table

List every table that holds story-, cluster-, or article-level data — in the
`analytics` schema (the `story_*_v8` family, `story_cluster_members_v8`,
`story_generated_v8`, etc.) AND the underlying substrate/`public` tables
(`articles` and any per-article enrichment tables: claims, stances, entities,
summaries, translations, embeddings, topics). For each table give:
- table name, one-line purpose, approximate row count, and grain
  (per-article? per-cluster? per-fact? per-quote?).

## Part 2 — Field-by-field catalog (the core deliverable)

For EVERY column in each of those tables, produce a catalog row:

| table | column | type | meaning | class | used by generator? |

where `class` is one of:
- **CONTENT** — writable prose material (a claim, a quote, an argument, an
  event description, an entity role/description, a summary).
- **METRIC** — a number/count/score/distribution (member_count, velocity,
  stance counts, sentiment scores, importance_score, cohesion).
- **STRUCT** — ids, timestamps, run_ids, flags, housekeeping.
- **VECTOR** — embeddings.

Show a real sample value for each column using this story:
`story_id = 'ec7b08c0-3b75-4bd5-8fe0-8665926f4054'`
(the "TCS/Infosys/Wipro IT stocks crash" cluster). Join to member articles via
`story_cluster_members_v8` where a table is per-article.

## Part 3 — What the generator uses vs what exists

The generator currently reads: `story_clusters_v8` (title, topic, event_type,
subject_country, primary_entities, stance_distribution, sentiment,
representative_quote, importance_score…), `story_facts_v8`, `story_quotes_v8`,
`story_timeline_v8`, `story_stance_v8`, `story_geo_v8`, `story_sources_v8`.

Mark, in the catalog, every field the generator DOES use — then give me the list
of **CONTENT-class fields that exist but the generator does NOT use** (the
untapped material). For each, one line on how it could enrich an article.

## Part 4 — Aggregation loss (keep-the-detail opportunities)

Three signals look like they're stored as metrics but were computed from richer
per-article detail. For each, tell me whether the per-article detail still
exists somewhere (KEEP-THE-DETAIL: cheap to surface) or was never stored
(BUILD-NEW: needs a new extraction step):

1. **STANCE** — `story_stance_v8` for this story has `n_stances = 29` but stores
   only `{neutral, critical, supportive}` counts. Do the 29 individual stances
   still exist per-article, WITH the actual stance text / argument / target — or
   only labels + scores? Show the table and 3-5 sample rows.
2. **TIMELINE** — `story_timeline_v8` stores only velocity telemetry
   (`peak_at, velocity, span_hours`). Is there any article/claim-level
   event+timestamp ("what happened when") anywhere, or only this rollup?
3. **ENTITIES** — `primary_entities` is only `{name: mention_count}`. Is there an
   entities table with TYPE / ROLE / DESCRIPTION anywhere?

## Part 5 — Deliverables

1. The full field catalog (Part 2).
2. The untapped CONTENT-field list (Part 3).
3. The KEEP-THE-DETAIL vs BUILD-NEW verdict for stance, timeline, entities
   (Part 4) — and note any OTHER signal in the same situation.
4. Your top 5 recommendations for which fields to surface or deepen first to
   make articles longer and richer, ranked by (impact / effort).

Show RAW query output (schema + sample rows) for everything you inspect. Do not
transcribe numbers or values from memory — paste the tool output so the catalog
is grounded in what's actually in the DB.

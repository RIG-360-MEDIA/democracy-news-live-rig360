# Data Source — rig-surveillance

The upstream intelligence layer Rig Wire will consume when it leaves
prototype phase. This document is the contract between us (a downstream
consumer) and the rig-surveillance maintainer team.

**Status:** read-only access, sandbox schema for our own derived tables.
**Audience:** anyone building a Rig Wire feature that needs real article
data, claims, locations, events, quotes, or entities.

---

## TL;DR

- **~119K articles**, ~240K claims (SPO triples), ~260K locations,
  ~210K events, ~190K numerical facts, ~160K stances, ~16K canonical
  entities, ~800 sources across 13+ countries.
- We have **READ-ONLY** on `public.*` (the source-of-truth tables).
- We have **READ-WRITE** on `analytics.*` (our own sandbox schema).
- We connect via SSH tunnel; the DB enforces the read-only boundary —
  not trust.

---

## Current state — D1 re-extraction in progress

**Scrapers offline.** Corpus boundary stable. No new articles arriving.

**Existing rows are being re-extracted in place** with a compressed
version of the D1 SPO prompt (compressed to fit Ollama's token budget).
**`extraction_version` stays at 3** — the column did NOT bump. Same
version number, refreshed prompt content. The column alone is too
coarse to be a discriminator.

### The real version key is `(extraction_version, substrate_processed_at)`

Rows with `substrate_processed_at > '2026-05-27 16:00:00+00'` have been
processed with the new compressed prompt ("post-D1 quality" — 99% SPO
completeness). Rows below that timestamp are still on the old verbose
prompt, awaiting the drain.

**Canonical filter for every Rig Wire query:**

```sql
WHERE substrate_status   = 'ok'
  AND extraction_version = 3
  AND substrate_processed_at > '2026-05-27 16:00:00+00'
  AND NOT is_duplicate
```

This gives a strictly-monotonic-growing set: ~40K articles today →
~92K by end of 2026-05-29 → stable thereafter. **Rows past the filter
do not change during this drain pass.**

Log the pair `(extraction_version, substrate_processed_at)` on every
audit-trail entry — not just `extraction_version`. That pair is the
real prompt-generation receipt.

### Resolved questions (2026-05-28)

| Question                        | Answer                                                     |
| ------------------------------- | ---------------------------------------------------------- |
| New `extraction_version` value? | **Stays 3.** Prompt compressed, version not bumped.        |
| Overwrite or coexist?           | **Overwritten in place.** Child rows DELETE+INSERT on cascade. No history kept. |
| Completion ETA?                 | **End of 2026-05-29** (~24–36h from 2026-05-28). ~40K already done, ~52K pending at 25–50/min. Faster overnight after the 00:05 UTC Cerebras+Groq TPD reset. |
| Schema delta?                   | **None destructive.** Five additive migrations (see below). |

### Volatile vs stable fields

**Volatile *only on pre-D1 rows*** (these get overwritten when the
drain reaches them; if you filter to post-D1, these are stable too
during this drain pass):

- `articles.summary_preview / summary_snippet / summary_executive`
- `articles.primary_subject`, `articles.article_type`,
  `articles.register_style / register_emotion`, `articles.author_name`
- `article_claims.claim_text / subject_text / predicate / object_text / claimant`
- `article_quotes.quote_text_en / speaker_role / context`
- `article_events.event_description / event_type / actors`
- `article_stances.stance / intensity`

**Stable across the drain** (safe regardless of `substrate_processed_at`):

- All structural / non-LLM fields — `id`, `url`, `published_at`,
  `collected_at`, `source_id`, `language_iso`
- `articles.source_country` (auto-populated by trigger)
- `articles.labse_embedding` — embedding model unchanged
- `article_events.effective_event_date` (deterministic, migration 072)
- `article_locations.location_scope` (deterministic, migration 074)
- `article_numbers.unit` (normalised, migration 073)
- `entity_dictionary.*` — canonical IDs stable

### Recent additive migrations (live and usable)

These landed during the D1 work. Our `analytics.*` views can use them
today:

| Migration | Adds                                                              |
| --------- | ----------------------------------------------------------------- |
| 072       | `article_events.effective_event_date DATE` + auto-fill trigger    |
| 073       | normalised `entity_type` + `unit` values (data-only)              |
| 074       | `article_locations.location_scope` via trigger (data-only)        |
| 075       | `sources.country` + `articles.source_country` CHAR(2) + trigger   |
| 076       | `analytics_user` role + `analytics` schema (our sandbox)          |

No DROP, no RENAME. Existing queries cannot break from these.

---

## What you CAN do

- `SELECT` from any `public.*` table (articles, article_claims,
  article_quotes, article_locations, article_events, article_numbers,
  article_stances, article_links, article_media, article_tweets,
  article_districts, entity_dictionary, sources)
- `EXECUTE` any function in `public` (e.g. `compute_location_scope`,
  `compute_effective_event_date`)
- `CREATE TABLE | VIEW | MATERIALIZED VIEW | FUNCTION | INDEX` inside
  `analytics`
- `INSERT / UPDATE / DELETE` inside `analytics.*` — our tables, our rules
- `REFRESH MATERIALIZED VIEW analytics.X`
- Any read query, no matter how complex — window functions, recursive
  CTEs, full-text search, vector ops via pgvector

## What you CANNOT do (enforced by the DB)

- `INSERT / UPDATE / DELETE / TRUNCATE` on `public.*` → `permission
  denied for table X`
- `ALTER / DROP` on `public.*` → `must be owner of table X`
- `CREATE TABLE public.something` → `permission denied for schema public`
- Run migrations against `public`
- Create new roles
- Touch `pg_*` system catalogs in dangerous ways

If you need a new column / index / structural change on `public.*`,
**coordinate with the rig-surveillance maintainer** to run a migration.
Don't try to work around it.

---

## Connection

### Credentials

| Thing      | Value                                                  |
| ---------- | ------------------------------------------------------ |
| Username   | `analytics_user`                                       |
| Password   | `${ANALYTICS_DB_PASSWORD}` (see `CLAUDE.local.md`)     |
| Host       | `<RIG_BOX_IP>` port `5433` (or via SSH tunnel)       |
| Database   | `rig`                                                  |
| Sandbox    | `analytics`                                            |
| Read-only  | `public`                                               |
| Postgres   | 16 + pgvector                                          |
| Vector dim | 768 (LaBSE)                                            |

The password is **not stored in this repo**. Export it as an env var
locally:

```bash
export ANALYTICS_DB_PASSWORD='<the-actual-password>'
```

Add the line to your shell rc or to `.env.local` (gitignored). Never
commit it.

### Recommended: SSH tunnel

```bash
# Terminal 1 — tunnel
ssh -i ~/.ssh/rig_hetzner -L 5433:rig-postgres:5432 root@<RIG_BOX_IP> -N

# Terminal 2 — connect
psql "postgresql://analytics_user:${ANALYTICS_DB_PASSWORD}@localhost:5433/rig"
```

Python:

```python
import os, psycopg
DSN = (
  f"postgresql://analytics_user:{os.environ['ANALYTICS_DB_PASSWORD']}"
  f"@localhost:5433/rig"
)
conn = psycopg.connect(DSN)
```

### Direct (if Hetzner port 5433 is firewalled-open from your IP)

```
postgresql://analytics_user:${ANALYTICS_DB_PASSWORD}@<RIG_BOX_IP>:5433/rig
```

If you get `Connection refused`, fall back to SSH tunnel.

---

## Data model

### Master tables

**`articles`** (~119K rows) — every article ingested.

Key fields:

- `id` UUID, `url`, `title`, `full_text_scraped`, `language_iso`
- `published_at`, `collected_at`
- `source_id` → `sources.id`
- `source_country` CHAR(2) ISO alpha-2 (auto-populated by trigger,
  migration 075)
- `extraction_version` (0 / null = legacy; 3 = current)
- `substrate_status` — `pending` | `processing` | `ok` |
  `extract_failed` | `fetch_failed` | `junk`
- `summary_preview` (~50 chars), `summary_snippet` (~200 chars),
  `summary_executive` (~700 chars)
- `primary_subject` — one-sentence what-the-article-is-about
- `article_type` — news / opinion / analysis / live_blog / etc.
- `register_style`, `register_emotion` — tone classifiers
- `byline`, `author_name`
- `labse_embedding vector(768)` — full-body LaBSE embedding
  (93% populated)
- `topic_category` — sport / politics / business / tech / etc.
- `geo_primary` — primary location string
- `is_duplicate`, `duplicate_of`

**`sources`** (~793 rows, ~550 active) — RSS/HTML/API sources scraped from.

Key fields: `id`, `name`, `domain`, `rss_url`, `source_type` (rss /
scrape / api), `source_tier` (1=high-trust / 2=standard /
3=experimental), `language`, `geo_states text[]`, `country` CHAR(2)
(migration 075), `is_active`, `health_score`, `consecutive_failures`.

### Per-article child tables (all FK → `articles.id`)

| Table                   | Rows  | What's in it |
| ----------------------- | ----- | ------------ |
| `article_claims`        | ~240K | SPO triples: `subject_text`, `predicate`, `object_text`, `claim_text`, `claim_type` (asserted / hypothetical / ...), `claimant`, `confidence`, `embedding vector(768)`. Post-D1 fix (2026-05-27), 99% have all 3 SPO fields. |
| `article_quotes`        | ~96K  | Quoted speech: `text` (raw), `quote_text_en` (translated), `speaker` / `speaker_name`, `speaker_role`, `context`, `is_direct`, `extracted_at` |
| `article_locations`     | ~260K | Geographic mentions: `location_text`, `country`, `region`, `city`, `location_scope` (city / state / country / continent — migration 074), `is_primary`, `mention_count` |
| `article_events`        | ~210K | Discrete events: `event_date` (LLM raw), `effective_event_date` (smart-fixed — migration 072), `event_description`, `event_type`, `actors text[]`, `is_future` |
| `article_numbers`       | ~190K | Numeric facts: `value`, `unit` (normalized — migration 073), `context` |
| `article_stances`       | ~160K | Position-taking: `actor`, `target`, `stance` (supportive / critical / neutral / sympathetic / ...), `intensity` |
| `article_links`         | ~5M   | Outbound links from article bodies |
| `article_media`         | ~1.5M | Embedded images / videos with captions |
| `article_tweets`        | ~2K   | Embedded tweet refs |
| `article_districts`     | ~28K  | Indian district mapping |
| `article_contradictions`| 0     | Reserved — narrative-pipeline output, not yet written |

### Entity vocabulary

**`entity_dictionary`** (~15,755 rows) — canonical entities. `id`,
`canonical_name`, `entity_type` (person / organization / constituency /
location / role), `aliases text[]` (98% populated), `state`, `party`,
`metadata JSONB`. Child tables reference via `*_entity_id` FK columns.

### Narrative tables (scaffolded, not yet populated)

`narrative_clusters`, `narrative_cluster_members`, `narrative_drafts` —
for grouping related articles. Created by migration 070 but nothing
writes to them yet (Stage 0–6 narrative pipeline is P2 on the rig team).

---

## Data quality (last 6h sample, 2026-05-28)

For `substrate_status='ok' AND extraction_version=3`:

| Field                           | Fill rate                       |
| ------------------------------- | ------------------------------- |
| summary_preview / snippet / executive | 100%                      |
| primary_subject                 | 100%                            |
| article_type                    | 100%                            |
| register_style / register_emotion | 99.99%                        |
| author_name                     | 100%                            |
| Claims with all 3 SPO fields    | **99%** (was 14% pre-D1)        |
| Locations populated             | 99% (avg 2.57 / article)        |
| Events populated                | 96%                             |
| Numbers populated               | 74%                             |
| Quotes populated                | 59% (briefs / listicles often have none) |
| labse_embedding                 | 93%                             |

### Failure modes — filter these out

- `substrate_status IN ('fetch_failed', 'junk', 'extract_failed')`
- `is_duplicate = true`
- `extraction_version IS NULL OR extraction_version < 3` (legacy)
- Non-English content if your product is English-only — ~30% of articles
  are `hi`, `te`, `kn`, `or`, `ta`, `ml`, etc.

---

## Starter queries

```sql
-- Latest 20 English news articles with full substrate
SELECT id, title, summary_snippet, source_country, published_at
  FROM articles
 WHERE substrate_status = 'ok'
   AND extraction_version = 3
   AND article_type = 'news'
   AND language_iso = 'en'
   AND NOT is_duplicate
 ORDER BY collected_at DESC
 LIMIT 20;

-- Claims about a specific entity
SELECT a.title, c.subject_text, c.predicate, c.object_text, c.claimant
  FROM article_claims c
  JOIN articles a ON a.id = c.article_id
 WHERE c.subject_text ILIKE '%Modi%'
   AND a.substrate_status = 'ok'
 ORDER BY a.collected_at DESC
 LIMIT 50;

-- Country-grouped article volume per day
SELECT source_country,
       date_trunc('day', collected_at) AS day,
       COUNT(*) AS n_articles
  FROM articles
 WHERE collected_at > NOW() - INTERVAL '7 days'
 GROUP BY source_country, day
 ORDER BY day DESC, n_articles DESC;

-- All cities mentioned in last 24h
SELECT city, country, COUNT(*) AS mentions
  FROM article_locations al
  JOIN articles a ON a.id = al.article_id
 WHERE al.location_scope = 'city'
   AND a.collected_at > NOW() - INTERVAL '24 hours'
   AND al.city IS NOT NULL
 GROUP BY city, country
 ORDER BY mentions DESC
 LIMIT 30;

-- Most-quoted speakers
SELECT speaker_name, COUNT(*) AS quote_count
  FROM article_quotes
 WHERE speaker_name IS NOT NULL
 GROUP BY 1
 ORDER BY 2 DESC
 LIMIT 30;

-- Vector similarity — articles similar to a given one
SELECT a2.title, 1 - (a1.labse_embedding <=> a2.labse_embedding) AS similarity
  FROM articles a1, articles a2
 WHERE a1.id = '<some-article-uuid>'
   AND a2.id != a1.id
   AND a2.labse_embedding IS NOT NULL
 ORDER BY a1.labse_embedding <=> a2.labse_embedding
 LIMIT 10;
```

---

## How the data gets in (context, not actionable for us)

You don't operate the pipeline. Enough to read the data with calibration:

- **Ingestion** — ~793 sources (~550 active). RSS via FreshRSS, fallback
  to direct HTTP, fallback to HTML scraping. Tier 4 (Playwright)
  currently disabled.
- **Extraction** — each article runs through `Prompt G + D1 SPO
  addendum` via a unified LLM pool (Ollama on a local 4090 + 21 Groq
  keys + 27 Cerebras keys). Output is structured JSON populating the
  six child tables.
- **Quality** — post-D1 (2026-05-27), 99% complete SPO triples and 100%
  summary coverage. 0.28% failure rate.
- **Country coding** — ISO 3166 alpha-2 in `articles.source_country`
  via migration 075.

If our product needs a new extracted field, coordinate with the rig
team to update the substrate prompt + add a migration. We can't extend
`public.*` ourselves.

---

## Workflow

### Building a feature

1. `\dt+ public.*` to see all tables. `\d+ public.<table>` to read column
   comments.
2. Prototype queries in interactive `psql`.
3. When a query is useful, persist as a VIEW in `analytics`:

   ```sql
   CREATE VIEW analytics.recent_news_en AS
   SELECT id, title, summary_snippet, source_country, published_at
     FROM articles
    WHERE substrate_status = 'ok' AND extraction_version = 3
      AND article_type = 'news' AND language_iso = 'en'
      AND NOT is_duplicate;
   ```

4. For expensive aggregations: `MATERIALIZED VIEW` + nightly
   `REFRESH MATERIALIZED VIEW analytics.X`.
5. The product UI queries `analytics.*` — never `public.*` directly.
   That way schema changes on the upstream side don't break us
   immediately; we just refresh our view definitions.

### What to track in this repo

Keep an `analytics-migrations/` folder for **our** schema. Every
CREATE TABLE / VIEW / FUNCTION goes there, dated. Reproducible sandbox
state. (Folder doesn't exist yet — create it when the first
materialized view earns its place.)

---

## Quality & safety rules

1. **Never assume the upstream schema is stable.** Migrations happen.
   Insulate with views in `analytics`.
2. **Don't query `articles` without filters.** 119K rows; always
   include `WHERE substrate_status='ok'` or `WHERE collected_at >
   NOW() - INTERVAL '7 days'` or similar.
3. **Use indexes.** `articles.collected_at` is indexed. All `*.article_id`
   FKs are indexed. Vector indexes on `articles.labse_embedding` and
   `article_claims.embedding`.
4. **Materialize expensive aggregations.** If a query takes > 1 second,
   wrap it in a MATERIALIZED VIEW and refresh nightly.
5. **Tell the rig team if you find data-quality issues.** We're a
   downstream consumer — our usage will surface gaps they missed.

---

## First-action verification

```sql
SELECT current_user, current_database();
-- expect: analytics_user | rig

SELECT COUNT(*) FROM articles WHERE substrate_status = 'ok';
-- expect: ~92,000

SELECT current_schema(), schema_name FROM information_schema.schemata
 WHERE schema_owner = 'analytics_user';
-- expect: 'analytics' shows up

CREATE TABLE analytics.test_my_access (id int);
DROP TABLE analytics.test_my_access;
-- both should succeed

-- This MUST fail (safety-net check):
INSERT INTO articles (id, url) VALUES ('00000000-0000-0000-0000-000000000000', 'http://test');
-- expect: ERROR: permission denied for table articles
```

---

## What NOT to bother the rig team about

- Scrapers / drains / LLM pool — their domain.
- Migrations against `public` — coordinate, don't request constantly.
- Cerebras / Groq / Ollama configuration — irrelevant.
- Frontend brief-page redesign — different product.

---

## Upstream context files (read if curious)

If you want to understand *how* the data is produced:

- `docs/onboarding/01-architecture.md` (rig repo) — system map
- `docs/onboarding/02-substrate-pipeline.md` — what each child table represents
- `docs/onboarding/04-scrapers.md` — 4-tier ingestion
- `docs/DATA_QUALITY_AUDIT_2026-05-28.md` — per-field health
- `docs/PHASE1_20_COUNTRIES.md` — upcoming source expansion

Skip the LLM infrastructure docs, runbooks, sprint plans — we don't
operate the upstream system.

---

## Relationship to Rig Wire's architecture

This data is the eventual content source for **Worldwide** (BBC-style
global coverage), **All Sides** (perspectives across the spectrum), and
potentially **Aftermath** (90-day retrospectives — `effective_event_date`
makes this a clean query).

When the API surface in `src/api/` lands (see `docs/architecture.md`
Seam 1), it will read from `analytics.*` views — never from `public.*`
directly. The seam between Rig Wire and rig-surveillance is exactly one
schema: `analytics`.

The news-AI doctrine in `.claude/skills/aryan-mehta/SKILL.md` applies
the moment we ship a personalised or AI-generated surface on top of this
data: pinned model versions, audited decisions, faithfulness gates on
any summarisation.

# RIG Surveillance — Database Guide

**The single source of truth for how the database is shaped, what it holds, and
how to build against it.** This is the *logic* layer; for the exact, live column
listing see the generated [`DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md) (re-run
`tools/scripts/db-schema-dump.mjs` to refresh it). For how we got here, see
[`HISTORY.md`](HISTORY.md). For the working discipline, [`RIGWIRE.md`](RIGWIRE.md).

> ⚠ **Why this doc exists.** Earlier sessions read a *dated snapshot* (a session
> handoff / memory file) and treated it as live truth — concluding "the DB is
> frozen" when in fact only one layer (the clustering keeper) was parked while
> ingest ran normally. The fix: this guide describes **structure and behaviour**
> (which change slowly), points at a **regenerable** schema dump for exact
> columns, and never bakes in point-in-time counts. When in doubt, query.

---

## 1. What it is

- **RIG Surveillance** production database. **Postgres 16 + pgvector**
  (`ankane/pgvector` image), container `rig-postgres` on the Hetzner box
  `<RIG_BOX_IP>`, published on host `localhost:5433` (`5433 → 5432`).
- Two logical schemas matter:
  - **`public`** — the surveillance substrate: content pillars, entities, civic
    layer, social, campaign-monitor, newsroom, govt docs, users/products, ops.
  - **`analytics`** — the **story-clustering layer** (`story_*`): the shared
    story objects read by Rig Wire + OSINT + future content-gen.

## 2. How to connect (read-only)

**Sanctioned path — psql in the container as the `rig` role:**
```
ssh -i ~/.ssh/rig_hetzner root@<RIG_BOX_IP> \
  "docker exec rig-postgres psql -U rig -d rig -tAc \"<SQL>\""
```
Use `-tAc` for clean output. Always `LIMIT`/aggregate — `articles` and
`article_entity_mentions` are large. **SELECT only** unless explicitly asked to
write — this is live production data.

**App path — SSH tunnel + `rigwire_app` role (used by the Next.js app & scripts):**
```
ssh -i ~/.ssh/rig_hetzner -L 5433:127.0.0.1:5433 root@<RIG_BOX_IP> -N
# then connect to postgresql://rigwire_app:…@localhost:5433/rig  (see .env.local)
```
- `rig` — owner/superuser-ish; reads everything.
- `rigwire_app` — app role; **reads `analytics.*` + `public.*`**, writes `auth.*`
  + `rigwire.*`. Used as the read fallback because…
- `analytics_user` — the intended read-only role, **password is dead** (rotated
  externally 2026-05-29, never re-provisioned). Restore a dedicated read-only
  DSN before prod; today's read path holds a read/write role (least-privilege
  regression, documented).

> Note: the tunnel must forward to the host's published port (`127.0.0.1:5433`),
> **not** the docker-network name `rig-postgres` — the latter only resolves
> inside the compose network and the tunnel will fail name resolution.

## 3. The data model — pillars and how they relate

There are **no enforced foreign keys** (0 declared). Relationships are by
convention — joins are on id/name columns, not FK constraints. Know this before
assuming referential integrity.

### Content pillars (three) → all carry `entities_extracted` jsonb
| Pillar | Live table | Children | Key columns |
|---|---|---|---|
| Articles (RSS/web) | `articles` | `article_claims/quotes/stances/locations/numbers/events/media/tweets` | `summary_executive`, `entities_extracted` (jsonb `[{name,type}]`), `claims_extracted`, `topic_category`, `geo_primary`, `labse_embedding`, `substrate_status`, `detected_language`, `collected_at` |
| Newspaper clippings | **`clippings`** (NOT `newspaper_clippings`) | `clipping_claims/quotes/stances/locations/numbers/events` | `headline`, `body_text`, `summary_executive`, `entities_extracted`, `clipping_image_b64`, `bbox`, `edition_date`, `detected_language` |
| YouTube clips | **`youtube_clips_v2`** | `youtube_clip_claims/quotes/stances/locations` | `video_title`, `transcript_segment`, `summary`, `matched_entity` (anchor), `entities_extracted`, `channel_name`, `created_at`. Queue: `pending_youtube_videos` (status pending→transcribed→extracted, `is_political`) |

### Entities — the cross-pillar spine
- `entity_dictionary` — canonical entities (`canonical_name`, `entity_type`,
  `aliases[]`, `state`, `party`, `country`, `metadata` jsonb, `redirected_to`
  for consolidation). `entity_lookup` / `entity_aliases` / `entity_match_index`
  = name→canonical resolution.
- Per-pillar rollup matviews: `article_entity_mentions`,
  `clipping_entity_mentions`, `youtube_clip_entity_mentions` — each joins a
  pillar's `entities_extracted` → `entity_lookup` → `entity_dictionary`,
  producing `(content_id, entity_id, canonical_name, surface_forms[], …)`.
- `entity_mention_daily` — cross-pillar daily rollup (counts per entity per day).

### Story layer (`analytics.story_*`) — the clustering keeper
- `story_clusters` (the keeper) + `story_cluster_members`, `story_edges`, plus
  enrichment: `story_timeline/sources/facts/quotes/stance/geo` +
  `story_enrichment_status`.
- Built by pgvector clustering over LaBSE embeddings → igraph-Leiden community
  detection → a refit pair-scorer. Each `story_clusters` row carries
  `representative_title`, `entity_core_cov`, `title_cohesion`,
  `suppression_reason`, `primary_entities`, `subject_country`, etc.
- **`story_*_old` are the rollback parachute** — retained, do not drop until the
  live layer has survived a real breaking-news burst.

### Other domains present (surveillance product, mostly beyond Rig Wire's read path)
Civic/district (`mv_district_*`, `acled_events`, `mandi_prices`,
`power_grid_status`, `weather_warnings`, `welfare_coverage`), social
(`social_*`), campaign-monitor (`cm_*`), newsroom/broadcast (`newsroom_*`),
government docs (`govt_*`), users/products (`user_*`, `briefs`, `dossier*`,
`collections`), ops (`celery_*`, `kombu_*`, `mc_*`, `sources`).

## 4. Current behaviour you must know (verified 2026-06-12)

- **Ingest is LIVE and continuous.** `articles`, `clippings`, `youtube_clips_v2`,
  `entity_mention_daily`, and `celery_taskmeta` all show same-day activity with
  thousands of new rows per day. The substrate never stopped.
- **The story-clustering keeper is PARKED, by design, not broken.**
  `analytics.story_clusters` holds a single clustering `run_id` / `algo_version`
  (the `cluster_job_7` build). New articles arrive but are **not** being
  re-clustered into new stories yet — the engine has not been flipped to
  forward-mode/live cadence. It sits behind the parachute awaiting the launch
  flip. *Do not read "one run_id" as "the DB is dead."*
- **Launch gate** to flip the story layer user-visible was: AEM fixed + verified.

## 5. Data-quality gotchas (these bite when building)

- **`entities_extracted` is jsonb** — guard every read with
  `jsonb_typeof(col)='array'`; it errors on non-arrays. Access names via
  `jsonb_array_elements(col)->>'name'`.
- **Trust `detected_language` over `language`.**
- **"Processed" rows** = `substrate_status='ok'` OR `enriched_at IS NOT NULL`.
- **AEM hallucination (open v2 issue).** NER sometimes emits entities at high
  prominence with *zero* supporting text in the article body (e.g. "Andaman &
  Nicobar Islands"). The matviews (`article_entity_mentions` etc.) do **not**
  filter for body-presence — the guard lives **consumer-side** in OSINT's
  `textual.py` (canonical name or a registered alias must appear in
  title/lead/body). **Any new AEM consumer that skips this filter gets dirty
  data.** The durable fix (extraction-time validation) is not yet shipped.
- **Alias-overreach in `entity_dictionary.aliases` (open v2 issue).** Bare
  common-noun aliases over-attribute: `"Congress"` is shared by *Indian National
  Congress*, *Kerala Congress*, *All India N.R. Congress*; `"Ali"` resolves to
  four different MLAs; junk aliases like `"MLA Congress"`, `"(M)"`, `"(Secular)"`
  exist. Several political *parties* are even mis-typed `entity_type='person'`.
  Treat entity attribution as noisy until alias-cleanup-v2 lands; the
  story-engine keeper survives this because it rides `entities_extracted` top-3
  with co-mention validation, not the alias-expanded matviews.
- **Backups/scratch tables exist in `public`** (`*_bak_*`, `*_backup_*`,
  `entity_dictionary_pre078_backup`, …). Don't mistake them for live tables.

## 6. Refreshing this picture

- **Exact columns / matview SQL:** `node tools/scripts/db-schema-dump.mjs`
  → regenerates `DATABASE-SCHEMA.md`.
- **Spot-check live state / freshness:** query via the path in §2. The
  `scratch/reads/` scripts are examples of read-only introspection.
- **Never** transcribe measured numbers from a query into a doc by hand
  (number-handling protocol, `CLAUDE.local.md`). Let a script write them, or
  cite "queried on <date>" in chat and leave the doc structural.

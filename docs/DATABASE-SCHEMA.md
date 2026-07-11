# RIG Surveillance — Database Schema Reference (GENERATED)

> **Auto-generated** by `tools/scripts/db-schema-dump.mjs` from the live DB.
> Do not hand-edit — re-run the script to refresh. Structural truth only;
> row figures are catalog estimates (`pg_class.reltuples`), not exact counts.
> Schemas covered: `public`, `analytics`. Tables/views: 219.

## How to query

```
ssh -i ~/.ssh/rig_hetzner root@<RIG_BOX_IP> \
  "docker exec rig-postgres psql -U rig -d rig -tAc \"<SQL>\""
```
Read-only by default. Always LIMIT/aggregate. `entities_extracted` etc. are jsonb arrays — guard with `jsonb_typeof(col)='array'`.

## Table of contents

- Content — Articles (RSS/web) (18)
- Content — Newspaper clippings (11)
- Content — YouTube (9)
- Entities & resolution (16)
- Story layer (analytics — clustering keeper) (14)
- Civic / district surveillance (18)
- Social monitoring (12)
- Campaign monitor (cm_*) (13)
- Newsroom / broadcast (9)
- Government documents (4)
- Narrative / events / dossiers (14)
- Users & product (23)
- Ops / infra (10)
- Backups / scratch (deletion candidates) (6)
- Other / uncategorised (42)

---

## Content — Articles (RSS/web)

### `analytics.article_signals_mv` — matview, ~49k rows



### `public.article_claims` — table, ~189k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `claim_text text NOT NULL`
- `subject_entity_id uuid`
- `subject_text text`
- `predicate text`
- `object_text text`
- `confidence real NOT NULL`
- `embedding USER-DEFINED`
- `extracted_at timestamp with time zone NOT NULL`
- `extracted_by_model text NOT NULL`

### `public.article_contradictions` — table, ? rows

- `id uuid NOT NULL`
- `claim_a_id uuid NOT NULL`
- `claim_b_id uuid NOT NULL`
- `entity_id uuid`
- `divergence_summary text NOT NULL`
- `confidence real NOT NULL`
- `detected_at timestamp with time zone NOT NULL`
- `detected_by_model text NOT NULL`
- `is_resolved boolean NOT NULL`

### `public.article_districts` — table, ~47k rows

- `article_id uuid NOT NULL`
- `district_id text NOT NULL`
- `mention_count integer NOT NULL`
- `confidence real NOT NULL`
- `is_primary boolean NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.article_entity_mentions` — matview, ~970k rows



### `public.article_events` — table, ~479k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `event_date date`
- `event_description text NOT NULL`
- `event_type text`
- `actors ARRAY`
- `confidence numeric`
- `position smallint`
- `created_at timestamp with time zone NOT NULL`
- `is_future boolean`
- `event_cluster_id uuid`
- `effective_event_date date`

### `public.article_events_eed_backup_20260528` — table, ~207k rows

- `id uuid`
- `event_date date`
- `effective_event_date date`

### `public.article_events_is_future_backup_20260523` — table, ~8k rows

- `id uuid`
- `old_is_future boolean`
- `effective_event_date date`
- `published_date date`

### `public.article_links` — table, ~11.2M rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `outbound_url text NOT NULL`
- `outbound_url_normalized text`
- `outbound_domain text`
- `anchor_text text`
- `link_type text`
- `position smallint`
- `created_at timestamp with time zone NOT NULL`

### `public.article_locations` — table, ~519k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `location_text text NOT NULL`
- `country text`
- `region text`
- `city text`
- `lat numeric`
- `lng numeric`
- `confidence numeric`
- `mention_count smallint NOT NULL`
- `is_primary boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `location_scope text`

### `public.article_locations_scope_backup_20260528` — table, ~259k rows

- `id uuid`
- `location_scope text`

### `public.article_media` — table, ~3.6M rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `media_type text NOT NULL`
- `url text`
- `external_id text`
- `caption text`
- `alt_text text`
- `width smallint`
- `height smallint`
- `position smallint`
- `is_hero boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.article_numbers` — table, ~394k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `value text NOT NULL`
- `unit text`
- `context text`
- `position smallint`
- `created_at timestamp with time zone`

### `public.article_numbers_unit_backup_20260528` — table, ~17k rows

- `id uuid`
- `unit text`

### `public.article_quotes` — table, ~214k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `speaker_name text NOT NULL`
- `speaker_entity_id uuid`
- `quote_text text NOT NULL`
- `char_offset_start integer`
- `char_offset_end integer`
- `is_direct boolean NOT NULL`
- `extracted_at timestamp with time zone NOT NULL`
- `extracted_by_model text NOT NULL`
- `quote_text_en text`
- `speaker_name_en text`
- `translated_at timestamp with time zone`
- `context text`

### `public.article_stances` — table, ~345k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `actor text NOT NULL`
- `stance text`
- `intensity numeric`
- `actor_entity_id uuid`
- `created_at timestamp with time zone`

### `public.article_tweets` — table, ~11k rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `tweet_id text NOT NULL`
- `tweet_url text NOT NULL`
- `author_handle text`
- `author_name text`
- `author_profile_url text`
- `tweet_text text`
- `tweet_html text`
- `language text`
- `posted_at date`
- `has_image boolean`
- `image_urls ARRAY`
- `hashtags ARRAY`
- `mentions ARRAY`
- `links_in_tweet ARRAY`
- `fetched_at timestamp with time zone`
- `fetch_status text`
- `fetch_error text`

### `public.articles` — table, ~274k rows

- `id uuid NOT NULL`
- `source_id uuid NOT NULL`
- `url text NOT NULL`
- `url_hash text NOT NULL`
- `title text NOT NULL`
- `lead_text_original text`
- `lead_text_translated text`
- `full_text_scraped text`
- `language_detected character varying`
- `published_at timestamp with time zone`
- `collected_at timestamp with time zone NOT NULL`
- `nlp_processed boolean`
- `is_duplicate boolean`
- `duplicate_of uuid`
- `content_type text NOT NULL`
- `source_tier integer`
- `thumbnail_url text`
- `topic_category text`
- `geo_primary text`
- `entities_extracted jsonb`
- `labse_embedding USER-DEFINED`
- `thread_id uuid`
- `nlp_confidence text`
- `updated_at timestamp with time zone`
- `claims_extracted boolean NOT NULL`
- `quotes_extracted boolean NOT NULL`
- `narrative_frame text`
- `fts tsvector`
- `body_quality text`
- `word_count integer`
- `reading_minutes smallint`
- `article_type text`
- `canonical_url text`
- `language_iso text`
- `substrate_processed_at timestamp with time zone`
- `substrate_status text`
- `summary_preview text`
- `summary_snippet text`
- `summary_executive text`
- `primary_subject text`
- `register_style text`
- `register_emotion text`
- `register_is_breaking boolean`
- `full_text_translated text`
- `extraction_version smallint`
- `byline text`
- `author_name text`
- `source_country character`
- `article_type_orig text`
- `topic_category_orig text`
- `topic_fine text`
- `embedded_at timestamp with time zone`
- `embedding_model text`
- `embedding_revision text`
- `geo_secondary ARRAY`
- `labse_embedding_v4 USER-DEFINED`
- `labse_embedding_v0_backup USER-DEFINED`

## Content — Newspaper clippings

### `public.clipping_claims` — table, ~3k rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `claim_text text NOT NULL`
- `subject_entity_id uuid`
- `subject_text text`
- `predicate text`
- `object_text text`
- `confidence real NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.clipping_entity_mentions` — matview, ~4k rows



### `public.clipping_events` — table, ~3k rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `event_date date`
- `event_description text NOT NULL`
- `event_type text`
- `actors ARRAY NOT NULL`
- `confidence numeric NOT NULL`
- `position smallint`
- `is_future boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.clipping_locations` — table, ~3k rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `location_text text NOT NULL`
- `country text`
- `region text`
- `city text`
- `lat numeric`
- `lng numeric`
- `confidence numeric NOT NULL`
- `is_primary boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.clipping_numbers` — table, ~2k rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `value text NOT NULL`
- `unit text`
- `context text`
- `position smallint`
- `created_at timestamp with time zone NOT NULL`

### `public.clipping_quotes` — table, ~983 rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `speaker_name text NOT NULL`
- `speaker_entity_id uuid`
- `quote_text text NOT NULL`
- `is_direct boolean NOT NULL`
- `context text`
- `created_at timestamp with time zone NOT NULL`

### `public.clipping_stances` — table, ~1k rows

- `id uuid NOT NULL`
- `clipping_id uuid NOT NULL`
- `actor text NOT NULL`
- `stance text NOT NULL`
- `intensity numeric NOT NULL`
- `actor_entity_id uuid`
- `created_at timestamp with time zone NOT NULL`

### `public.clippings` — table, ~2k rows

- `id uuid NOT NULL`
- `newspaper_source_id uuid NOT NULL`
- `headline text NOT NULL`
- `body_text text`
- `section character varying`
- `language character varying`
- `relevance_score double precision`
- `page_number integer`
- `bbox text`
- `edition_date date NOT NULL`
- `collected_at timestamp with time zone NOT NULL`
- `subheadline text`
- `byline text`
- `vision_text text`
- `text_source character varying`
- `detected_language character varying`
- `clip_source character varying`
- `clipping_image_b64 text`
- `extraction_confidence real`
- `needs_review boolean NOT NULL`
- `is_notice boolean NOT NULL`
- `is_duplicate boolean NOT NULL`
- `duplicate_of integer`
- `source_pdf_path text`
- `article_type character varying`
- `primary_subject text`
- `headline_translated text`
- `body_text_translated text`
- `summary_preview text`
- `summary_snippet text`
- `summary_executive text`
- `register_style character varying`
- `register_emotion character varying`
- `register_is_breaking boolean NOT NULL`
- `topic_category character varying`
- `topic_fine character varying`
- `entities_extracted jsonb`
- `geo_primary text`
- `geo_district text`
- `labse_embedding USER-DEFINED`
- `substrate_status character varying NOT NULL`
- `extraction_version integer NOT NULL`
- `enriched_at timestamp with time zone`

### `public.newspaper_clippings` — table, ~5k rows

- `id uuid NOT NULL`
- `newspaper_id uuid NOT NULL`
- `newspaper_name text NOT NULL`
- `newspaper_language text`
- `edition_date date NOT NULL`
- `page_number integer`
- `headline text`
- `headline_translated text`
- `article_text text`
- `article_text_translated text`
- `bbox_left double precision`
- `bbox_bottom double precision`
- `bbox_right double precision`
- `bbox_top double precision`
- `clipping_image_b64 text`
- `topic_category text`
- `geo_primary text`
- `entities_extracted jsonb`
- `relevance_score double precision`
- `relevance_explanation text`
- `labse_embedding USER-DEFINED`
- `sentiment text`
- `narrative_angle text`
- `collected_at timestamp with time zone`

### `public.newspaper_editions` — table, ~354 rows

- `newspaper_id uuid NOT NULL`
- `edition_date date NOT NULL`
- `pdf_url text NOT NULL`
- `fetched_at timestamp with time zone NOT NULL`

### `public.newspaper_sources` — table, ~50 rows

- `id uuid NOT NULL`
- `name text NOT NULL`
- `language text NOT NULL`
- `careerswave_url text`
- `direct_pdf_url text`
- `is_active boolean`
- `last_scraped_at timestamp with time zone`
- `created_at timestamp with time zone`

## Content — YouTube

### `public.pending_youtube_videos` — table, ~4k rows

- `id bigint NOT NULL`
- `video_id text NOT NULL`
- `video_title text NOT NULL`
- `channel_id text NOT NULL`
- `channel_name text NOT NULL`
- `video_published_at timestamp with time zone`
- `status text NOT NULL`
- `transcript_json jsonb`
- `transcript_language text`
- `transcript_source text`
- `attempts integer NOT NULL`
- `last_error text`
- `discovered_at timestamp with time zone NOT NULL`
- `transcribed_at timestamp with time zone`
- `extracted_at timestamp with time zone`
- `updated_at timestamp with time zone NOT NULL`
- `extract_attempts integer NOT NULL`
- `is_political boolean NOT NULL`

### `public.youtube_channels` — table, ~72 rows

- `id uuid NOT NULL`
- `channel_id text NOT NULL`
- `channel_name text NOT NULL`
- `channel_url text NOT NULL`
- `description text`
- `subscriber_count integer`
- `is_active boolean`
- `last_checked_at timestamp with time zone`
- `created_at timestamp with time zone`
- `tier text`
- `poll_priority integer`
- `quality_score numeric`
- `language text`
- `category text`
- `last_yielded_at timestamp with time zone`
- `consecutive_dry_polls integer`
- `last_video_published_at timestamp with time zone`
- `deactivated_reason text`

### `public.youtube_clip_claims` — table, ~4k rows

- `id uuid NOT NULL`
- `clip_id bigint NOT NULL`
- `claim_text text NOT NULL`
- `subject_text text`
- `predicate text`
- `object_text text`
- `confidence real NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.youtube_clip_entity_mentions` — matview, ~660 rows



### `public.youtube_clip_locations` — table, ~1k rows

- `id uuid NOT NULL`
- `clip_id bigint NOT NULL`
- `location_text text NOT NULL`
- `country text`
- `region text`
- `city text`
- `is_primary boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.youtube_clip_quotes` — table, ~799 rows

- `id uuid NOT NULL`
- `clip_id bigint NOT NULL`
- `speaker_name text NOT NULL`
- `quote_text text NOT NULL`
- `is_direct boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.youtube_clip_stances` — table, ~2k rows

- `id uuid NOT NULL`
- `clip_id bigint NOT NULL`
- `actor text NOT NULL`
- `target text`
- `stance text NOT NULL`
- `intensity numeric NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.youtube_clips` — table, ~12k rows

- `id uuid NOT NULL`
- `video_id text NOT NULL`
- `video_title text NOT NULL`
- `channel_id text NOT NULL`
- `channel_name text NOT NULL`
- `video_published_at timestamp with time zone`
- `video_url text NOT NULL`
- `clip_start_seconds integer NOT NULL`
- `clip_end_seconds integer NOT NULL`
- `embed_url text NOT NULL`
- `transcript_segment text NOT NULL`
- `transcript_language text`
- `transcript_translated text`
- `matched_entity text NOT NULL`
- `matched_entity_type text`
- `labse_embedding USER-DEFINED`
- `relevance_score double precision`
- `collected_at timestamp with time zone`
- `processed boolean`
- `transcript_source text`
- `confidence numeric`

### `public.youtube_clips_v2` — table, ~863 rows

- `id bigint NOT NULL`
- `video_id text NOT NULL`
- `video_title text NOT NULL`
- `channel_id text NOT NULL`
- `channel_name text NOT NULL`
- `video_published_at timestamp with time zone`
- `video_url text NOT NULL`
- `clip_start_seconds integer NOT NULL`
- `clip_end_seconds integer NOT NULL`
- `embed_url text NOT NULL`
- `matched_entity text NOT NULL`
- `summary text NOT NULL`
- `transcript_segment text NOT NULL`
- `transcript_language text NOT NULL`
- `transcript_source text NOT NULL`
- `confidence real NOT NULL`
- `importance text NOT NULL`
- `labse_embedding USER-DEFINED`
- `relevance_score real`
- `processed boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `clip_uuid uuid NOT NULL`
- `segment_type character varying`
- `speaker text`
- `primary_subject text`
- `topic_category character varying`
- `topic_fine character varying`
- `entities_extracted jsonb`
- `substrate_status character varying NOT NULL`
- `extraction_version integer NOT NULL`
- `enriched_at timestamp with time zone`
- `is_watchlisted boolean NOT NULL`

## Entities & resolution

### `analytics.entity_image` — table, ~134 rows

- `entity_id uuid NOT NULL`
- `image_url text`
- `attribution text`
- `source text`
- `ok boolean NOT NULL`
- `fetched_at timestamp with time zone NOT NULL`

### `analytics.entity_image_bak_20260609` — table, ~132 rows

- `entity_id uuid`
- `image_url text`
- `attribution text`
- `source text`
- `ok boolean`
- `fetched_at timestamp with time zone`

### `public.entities_extracted_bak_20260602` — table, ~137k rows

- `id uuid`
- `entities_extracted jsonb`

### `public.entity_aliases` — table, ~14 rows

- `id uuid NOT NULL`
- `canonical_name text NOT NULL`
- `alias text NOT NULL`
- `notes text`
- `region text`
- `created_at timestamp with time zone`

### `public.entity_dict_meta` — table, ~1 rows

- `id integer NOT NULL`
- `version integer NOT NULL`
- `last_updated_at timestamp with time zone`
- `entry_count integer`
- `updated_by text`

### `public.entity_dictionary` — table, ~19k rows

- `id uuid NOT NULL`
- `canonical_name text NOT NULL`
- `entity_type text NOT NULL`
- `aliases ARRAY`
- `state text`
- `party text`
- `metadata jsonb`
- `created_at timestamp with time zone`
- `country character`
- `source text`
- `redirected_to uuid`

### `public.entity_dictionary_bak_20260602` — table, ~17k rows

- `id uuid`
- `canonical_name text`
- `entity_type text`
- `aliases ARRAY`
- `state text`
- `party text`
- `metadata jsonb`
- `created_at timestamp with time zone`
- `country character`
- `source text`

### `public.entity_dictionary_bak_20260606` — table, ~17k rows

- `id uuid`
- `canonical_name text`
- `entity_type text`
- `aliases ARRAY`
- `state text`
- `party text`
- `metadata jsonb`
- `created_at timestamp with time zone`
- `country character`
- `source text`
- `redirected_to uuid`

### `public.entity_dictionary_pre078_backup` — table, ~16k rows

- `id uuid`
- `canonical_name text`
- `entity_type text`
- `aliases ARRAY`
- `state text`
- `party text`
- `metadata jsonb`
- `created_at timestamp with time zone`
- `country character`
- `source text`

### `public.entity_dictionary_pre079_backup` — table, ~17k rows

- `id uuid`
- `canonical_name text`
- `entity_type text`
- `aliases ARRAY`
- `state text`
- `party text`
- `metadata jsonb`
- `created_at timestamp with time zone`
- `country character`
- `source text`

### `public.entity_dictionary_type_backup_20260528` — table, ? rows

- `id uuid`
- `entity_type text`

### `public.entity_dossier` — table, ~9 rows

- `id uuid NOT NULL`
- `user_id text NOT NULL`
- `target text NOT NULL`
- `target_type text NOT NULL`
- `status text NOT NULL`
- `summary jsonb`
- `error text`
- `purpose_note text`
- `started_at timestamp with time zone`
- `completed_at timestamp with time zone`
- `created_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `public.entity_lookup` — table, ~55k rows

- `name_norm text NOT NULL`
- `entity_id uuid NOT NULL`

### `public.entity_match_index` — table, ~65k rows

- `ent_id uuid`
- `match_str text`

### `public.entity_mention_daily` — table, ~238k rows

- `id uuid NOT NULL`
- `entity_text text NOT NULL`
- `date date NOT NULL`
- `n_claims integer NOT NULL`
- `n_quotes integer NOT NULL`
- `n_stances integer NOT NULL`
- `n_sources integer NOT NULL`
- `n_mentions_total integer`
- `computed_at timestamp with time zone NOT NULL`
- `n_entities integer NOT NULL`

### `public.entity_merge_map_20260606` — table, ? rows

- `dup_id uuid NOT NULL`
- `survivor_id uuid`
- `norm text`
- `merged_at timestamp with time zone`

## Story layer (analytics — clustering keeper)

### `analytics.story_cluster_members` — table, ~137k rows

- `article_id uuid NOT NULL`
- `story_id uuid NOT NULL`
- `source_id uuid`
- `is_representative boolean NOT NULL`
- `is_canonical boolean NOT NULL`
- `attach_score numeric`
- `provisional boolean NOT NULL`
- `added_at timestamp with time zone NOT NULL`
- `run_id bigint NOT NULL`

### `analytics.story_cluster_members_old` — table, ~48k rows

- `article_id uuid NOT NULL`
- `story_id uuid NOT NULL`
- `source_id uuid`
- `is_representative boolean NOT NULL`
- `is_canonical boolean NOT NULL`
- `attach_score numeric`
- `provisional boolean NOT NULL`
- `added_at timestamp with time zone NOT NULL`
- `run_id bigint NOT NULL`

### `analytics.story_clusters` — table, ~35k rows

- `story_id uuid NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`
- `status text NOT NULL`
- `redirected_to uuid`
- `provisional boolean NOT NULL`
- `run_id bigint NOT NULL`
- `algo_version text NOT NULL`
- `first_seen_at timestamp with time zone NOT NULL`
- `last_seen_at timestamp with time zone NOT NULL`
- `as_of timestamp with time zone NOT NULL`
- `article_count integer NOT NULL`
- `source_count integer NOT NULL`
- `independent_source_count integer`
- `subject_country text`
- `subject_region text`
- `subject_locations jsonb`
- `topic text`
- `event_type text`
- `primary_entities jsonb`
- `languages jsonb`
- `stance_distribution jsonb`
- `sentiment jsonb`
- `representative_quote jsonb`
- `importance_score numeric`
- `representative_article_id uuid`
- `representative_title text`
- `entity_core_cov numeric`
- `is_template_family boolean`
- `title_cohesion numeric`
- `rescued_from_story_id uuid`
- `suppression_reason text`
- `suppressed_at timestamp with time zone`
- `prev_representative_article_id_f1 uuid`
- `prev_representative_title_f1 text`

### `analytics.story_clusters_old` — table, ~38k rows

- `story_id uuid NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`
- `status text NOT NULL`
- `redirected_to uuid`
- `provisional boolean NOT NULL`
- `run_id bigint NOT NULL`
- `algo_version text NOT NULL`
- `first_seen_at timestamp with time zone NOT NULL`
- `last_seen_at timestamp with time zone NOT NULL`
- `as_of timestamp with time zone NOT NULL`
- `article_count integer NOT NULL`
- `source_count integer NOT NULL`
- `independent_source_count integer`
- `subject_country text`
- `subject_region text`
- `subject_locations jsonb`
- `topic text`
- `event_type text`
- `primary_entities jsonb`
- `languages jsonb`
- `stance_distribution jsonb`
- `sentiment jsonb`
- `representative_quote jsonb`
- `importance_score numeric`
- `representative_article_id uuid`
- `representative_title text`
- `entity_core_cov numeric`
- `is_template_family boolean`
- `title_cohesion numeric`
- `rescued_from_story_id uuid`

### `analytics.story_edges` — table, ~527k rows

- `article_a uuid NOT NULL`
- `article_b uuid NOT NULL`
- `score numeric NOT NULL`
- `decided_by text NOT NULL`
- `run_id bigint NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `analytics.story_edges_old` — table, ~23k rows

- `article_a uuid NOT NULL`
- `article_b uuid NOT NULL`
- `score numeric NOT NULL`
- `decided_by text NOT NULL`
- `run_id bigint NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `analytics.story_enrichment_status` — table, ~716 rows

- `story_id uuid NOT NULL`
- `members_total integer`
- `claims_coverage numeric`
- `quotes_coverage numeric`
- `stances_coverage numeric`
- `geo_coverage numeric`
- `facts_count integer`
- `quotes_count integer`
- `stance_count integer`
- `run_id bigint`
- `enriched_at timestamp with time zone`

### `analytics.story_facts` — table, ~10k rows

- `id bigint NOT NULL`
- `story_id uuid`
- `fact_key text`
- `unit text`
- `value_min numeric`
- `value_max numeric`
- `value_latest numeric`
- `member_count integer`
- `citing_article_ids ARRAY`
- `single_source boolean`
- `sample_claim text`
- `run_id bigint`

### `analytics.story_geo` — table, ~702 rows

- `story_id uuid NOT NULL`
- `subject_countries jsonb`
- `primary_country text`
- `continent text`
- `country_spread integer`
- `run_id bigint`

### `analytics.story_quotes` — table, ~28k rows

- `id bigint NOT NULL`
- `story_id uuid`
- `quote_text text`
- `quote_text_en text`
- `speaker text`
- `speaker_entity_id uuid`
- `article_id uuid`
- `is_direct boolean`
- `run_id bigint`

### `analytics.story_sources` — table, ~12k rows

- `story_id uuid NOT NULL`
- `source_id uuid NOT NULL`
- `articles_from_source integer`
- `first_seen_at timestamp with time zone`
- `source_tier text`
- `source_country text`
- `is_canonical_origin boolean`
- `run_id bigint`

### `analytics.story_stance` — table, ~645 rows

- `story_id uuid NOT NULL`
- `stance_distribution jsonb`
- `sentiment jsonb`
- `n_stances integer`
- `run_id bigint`

### `analytics.story_timeline` — table, ~716 rows

- `story_id uuid NOT NULL`
- `first_seen_at timestamp with time zone`
- `last_seen_at timestamp with time zone`
- `peak_at timestamp with time zone`
- `peak_articles_per_hour integer`
- `velocity numeric`
- `span_hours numeric`
- `is_breaking boolean`
- `dormant_since timestamp with time zone`
- `run_id bigint`
- `computed_at timestamp with time zone`

### `public.story_threads` — table, ~7k rows

- `id uuid NOT NULL`
- `title text NOT NULL`
- `primary_entities ARRAY NOT NULL`
- `article_count integer`
- `source_count integer`
- `momentum text`
- `centroid_embedding USER-DEFINED`
- `first_seen_at timestamp with time zone NOT NULL`
- `last_updated_at timestamp with time zone`
- `is_active boolean`
- `seed_article_id uuid`
- `seed_embedding USER-DEFINED`
- `confidence_score real`
- `cluster_version smallint NOT NULL`
- `last_evaluated_at timestamp with time zone`

## Civic / district surveillance

### `public.acled_events` — table, ? rows

- `event_id text NOT NULL`
- `event_date date NOT NULL`
- `event_type text NOT NULL`
- `sub_type text`
- `actor1 text`
- `actor2 text`
- `fatalities integer NOT NULL`
- `lat double precision`
- `lon double precision`
- `state_code text`
- `district_id text`
- `notes text`
- `raw jsonb`
- `inserted_at timestamp with time zone NOT NULL`

### `public.air_quality_readings` — table, ? rows

- `id bigint NOT NULL`
- `station text NOT NULL`
- `station_code text`
- `district_id text`
- `state_code text NOT NULL`
- `aqi integer`
- `aqi_category text`
- `pm25 real`
- `pm10 real`
- `no2 real`
- `so2 real`
- `co real`
- `o3 real`
- `recorded_at timestamp with time zone NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.assembly_constituencies` — table, ~29 rows

- `code text NOT NULL`
- `state text NOT NULL`
- `number integer NOT NULL`
- `name text NOT NULL`
- `name_te text`
- `district text`
- `parliamentary text`
- `reservation text`
- `centroid_lat double precision`
- `centroid_lon double precision`
- `source_url text`
- `inserted_at timestamp with time zone NOT NULL`
- `state_code text NOT NULL`

### `public.coverage_gaps_daily` — table, ? rows

- `id uuid NOT NULL`
- `detected_for_date date NOT NULL`
- `entity_id uuid NOT NULL`
- `social_volume_7d integer NOT NULL`
- `article_volume_7d integer NOT NULL`
- `ratio real NOT NULL`
- `summary text NOT NULL`
- `detected_at timestamp with time zone NOT NULL`

### `public.coverage_panel_summaries` — table, ~5 rows

- `slug text NOT NULL`
- `summary text NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `generated_by_model text NOT NULL`
- `source_sample_size integer NOT NULL`

### `public.district_geo_backfill_cursor` — table, ~1 rows

- `surface text NOT NULL`
- `last_processed uuid`
- `rows_done bigint NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `public.districts` — table, ~59 rows

- `id text NOT NULL`
- `state_code text NOT NULL`
- `name text NOT NULL`
- `hq_city text NOT NULL`
- `centroid_lat double precision NOT NULL`
- `centroid_lon double precision NOT NULL`
- `bbox jsonb`
- `aliases ARRAY NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.mandi_prices` — table, ? rows

- `id bigint NOT NULL`
- `market text NOT NULL`
- `district_id text`
- `state_code text NOT NULL`
- `commodity text NOT NULL`
- `variety text`
- `grade text`
- `min_price integer`
- `max_price integer`
- `modal_price integer`
- `arrival_qty real`
- `recorded_at date NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.mv_district_acled_7d` — matview, ? rows



### `public.mv_district_mandi_volatility_30d` — matview, ? rows



### `public.mv_district_news_volume_24h` — matview, ~18 rows



### `public.mv_district_power_stress` — matview, ? rows



### `public.mv_district_sentiment_24h` — matview, ~18 rows



### `public.mv_district_stability_composite` — matview, ~59 rows



### `public.mv_district_welfare_coverage` — matview, ? rows



### `public.power_grid_status` — table, ? rows

- `id bigint NOT NULL`
- `district_id text`
- `state_code text NOT NULL`
- `demand_mw integer`
- `supply_mw integer`
- `deficit_mw integer`
- `feeder_status text`
- `notes text`
- `recorded_at timestamp with time zone NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.weather_warnings` — table, ? rows

- `id bigint NOT NULL`
- `district_id text`
- `state_code text NOT NULL`
- `kind text NOT NULL`
- `severity text NOT NULL`
- `headline text`
- `detail text`
- `valid_from timestamp with time zone NOT NULL`
- `valid_to timestamp with time zone NOT NULL`
- `issued_at timestamp with time zone NOT NULL`
- `payload jsonb`
- `inserted_at timestamp with time zone NOT NULL`

### `public.welfare_coverage` — table, ? rows

- `id bigint NOT NULL`
- `scheme text NOT NULL`
- `district_id text`
- `state_code text NOT NULL`
- `beneficiaries integer`
- `target integer`
- `coverage_pct real`
- `detail text`
- `cycle_label text`
- `recorded_at date NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

## Social monitoring

### `public.social_cluster_posts` — table, ~61 rows

- `cluster_id uuid NOT NULL`
- `post_id uuid NOT NULL`

### `public.social_clusters` — table, ~28 rows

- `id uuid NOT NULL`
- `window_start timestamp with time zone NOT NULL`
- `window_end timestamp with time zone NOT NULL`
- `headline text NOT NULL`
- `summary text NOT NULL`
- `post_count integer NOT NULL`
- `platforms ARRAY NOT NULL`
- `monitor_names ARRAY NOT NULL`
- `top_entities ARRAY NOT NULL`
- `avg_sentiment double precision`
- `sentiment_tone text`
- `representative_post_ids ARRAY NOT NULL`
- `sample_languages ARRAY NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.social_entity_baselines` — table, ~2k rows

- `id integer NOT NULL`
- `entity text NOT NULL`
- `posts_24h integer NOT NULL`
- `posts_7d_mean double precision NOT NULL`
- `sentiment_24h double precision`
- `sentiment_7d double precision`
- `sources_24h integer NOT NULL`
- `computed_at timestamp with time zone NOT NULL`

### `public.social_events` — table, ~854 rows

- `id uuid NOT NULL`
- `event_type text NOT NULL`
- `subject text NOT NULL`
- `subject_kind text NOT NULL`
- `magnitude double precision`
- `confidence text NOT NULL`
- `sources ARRAY NOT NULL`
- `body text NOT NULL`
- `detected_at timestamp with time zone NOT NULL`
- `metadata jsonb NOT NULL`

### `public.social_geo_seeds` — table, ~30 rows

- `id integer NOT NULL`
- `term text NOT NULL`
- `kind text NOT NULL`
- `weight integer NOT NULL`

### `public.social_monitors` — table, ~297 rows

- `id uuid NOT NULL`
- `platform text NOT NULL`
- `monitor_type text NOT NULL`
- `identifier text NOT NULL`
- `display_name text`
- `description text`
- `is_active boolean`
- `last_collected_at timestamp with time zone`
- `follower_count integer`
- `created_at timestamp with time zone`
- `tier text NOT NULL`
- `is_official boolean NOT NULL`

### `public.social_post_districts` — table, ? rows

- `post_id uuid NOT NULL`
- `district_id text NOT NULL`
- `mention_count integer NOT NULL`
- `confidence real NOT NULL`
- `is_primary boolean NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`

### `public.social_posts` — table, ~6k rows

- `id uuid NOT NULL`
- `platform text NOT NULL`
- `platform_post_id text NOT NULL`
- `monitor_id uuid`
- `author_username text`
- `author_display_name text`
- `author_follower_count integer`
- `post_text text NOT NULL`
- `post_text_translated text`
- `post_language text`
- `post_url text`
- `upvotes integer`
- `downvotes integer`
- `comment_count integer`
- `share_count integer`
- `forward_count integer`
- `forwarded_from text`
- `has_document boolean`
- `document_url text`
- `sentiment_score double precision`
- `matched_entities ARRAY`
- `topic_category text`
- `labse_embedding USER-DEFINED`
- `posted_at timestamp with time zone`
- `collected_at timestamp with time zone`
- `relevance_score integer NOT NULL`

### `public.social_sentiment_daily` — table, ~386 rows

- `id uuid NOT NULL`
- `monitor_id uuid`
- `date date NOT NULL`
- `platform text NOT NULL`
- `positive_count integer`
- `negative_count integer`
- `neutral_count integer`
- `avg_sentiment double precision`
- `post_count integer`
- `top_entities ARRAY`

### `public.social_summaries` — table, ~51 rows

- `id uuid NOT NULL`
- `edition integer NOT NULL`
- `classification text NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `window_hours integer NOT NULL`
- `body text NOT NULL`
- `event_ids ARRAY NOT NULL`
- `sources_used ARRAY NOT NULL`
- `metadata jsonb NOT NULL`

### `public.social_topic_seeds` — table, ~41 rows

- `id integer NOT NULL`
- `term text NOT NULL`
- `weight integer NOT NULL`
- `note text`

### `public.social_topics` — table, ? rows

- `id uuid NOT NULL`
- `kind text NOT NULL`
- `canonical_key text NOT NULL`
- `label text NOT NULL`
- `first_seen timestamp with time zone NOT NULL`
- `last_seen timestamp with time zone NOT NULL`

## Campaign monitor (cm_*)

### `public.cm_action_queue` — table, ~726 rows

- `id bigint NOT NULL`
- `state_code text NOT NULL`
- `priority text NOT NULL`
- `text text NOT NULL`
- `deadline text`
- `source_type text NOT NULL`
- `rule_name text`
- `cite_ids ARRAY NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `expires_at timestamp with time zone NOT NULL`
- `status text NOT NULL`
- `completed_at timestamp with time zone`

### `public.cm_analysis_drafts` — table, ? rows

- `id bigint NOT NULL`
- `state_code text NOT NULL`
- `status text NOT NULL`
- `eyebrow text`
- `byline text`
- `headline text NOT NULL`
- `deck text`
- `paragraphs jsonb NOT NULL`
- `pull_quote text`
- `endnote text`
- `cite_ids ARRAY NOT NULL`
- `valid_cite_count integer NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `published_at timestamp with time zone`
- `rejected_at timestamp with time zone`
- `model text NOT NULL`

### `public.cm_coalitions` — table, ~9 rows

- `state text NOT NULL`
- `party text NOT NULL`
- `coalition text NOT NULL`
- `since date`
- `source_url text`
- `inserted_at timestamp with time zone NOT NULL`

### `public.cm_counter_narratives` — table, ? rows

- `id bigint NOT NULL`
- `issue_id bigint NOT NULL`
- `state text`
- `generated_at timestamp with time zone NOT NULL`
- `talking_points jsonb NOT NULL`
- `grounding_doc_ids ARRAY NOT NULL`
- `grounding_kinds ARRAY NOT NULL`
- `model text NOT NULL`
- `retry_count smallint NOT NULL`
- `rejected boolean NOT NULL`

### `public.cm_dissent_signals` — table, ? rows

- `id bigint NOT NULL`
- `state text`
- `coalition text NOT NULL`
- `party text NOT NULL`
- `speakers ARRAY NOT NULL`
- `issue_id bigint`
- `summary text NOT NULL`
- `severity text NOT NULL`
- `confidence real NOT NULL`
- `evidence_urls ARRAY NOT NULL`
- `quote_ids ARRAY NOT NULL`
- `detected_at timestamp with time zone NOT NULL`

### `public.cm_issue_evidence` — table, ~6k rows

- `issue_id bigint NOT NULL`
- `source_kind text NOT NULL`
- `source_id uuid NOT NULL`
- `side text`
- `weight real NOT NULL`
- `attached_at timestamp with time zone NOT NULL`

### `public.cm_issues` — table, ~296 rows

- `id bigint NOT NULL`
- `label text NOT NULL`
- `slug text NOT NULL`
- `state text`
- `embedding USER-DEFINED`
- `first_seen timestamp with time zone NOT NULL`
- `last_seen timestamp with time zone NOT NULL`
- `ruling_stance_summary text`
- `opposition_stance_summary text`
- `neutral_summary text`
- `volume_24h integer NOT NULL`
- `volume_7d integer NOT NULL`
- `intensity real NOT NULL`
- `trajectory text`
- `updated_at timestamp with time zone NOT NULL`

### `public.cm_lead_headlines` — table, ~13k rows

- `id bigint NOT NULL`
- `state_code text NOT NULL`
- `rank integer NOT NULL`
- `eyebrow text NOT NULL`
- `headline text NOT NULL`
- `cite_ids ARRAY NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `model text NOT NULL`
- `validated boolean NOT NULL`
- `rejected boolean NOT NULL`
- `rejection_reason text`

### `public.cm_political_handles` — table, ~9 rows

- `id bigint NOT NULL`
- `state text NOT NULL`
- `coalition text NOT NULL`
- `party text NOT NULL`
- `person_name text`
- `person_role text`
- `platform text NOT NULL`
- `handle text NOT NULL`
- `url text NOT NULL`
- `verified_url text`
- `active boolean NOT NULL`
- `cadence_minutes integer NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`
- `state_code text`

### `public.cm_promises` — table, ~12 rows

- `id bigint NOT NULL`
- `state text NOT NULL`
- `pledge_text text NOT NULL`
- `pledge_short text`
- `owner_party text NOT NULL`
- `source text`
- `source_url text`
- `pledged_at date`
- `deadline date`
- `status text NOT NULL`
- `status_confidence real`
- `last_status_change timestamp with time zone NOT NULL`
- `last_evidence_url text`
- `exploitation_index real NOT NULL`
- `last_scored_at timestamp with time zone`

### `public.cm_risk_calendar` — table, ~24 rows

- `id bigint NOT NULL`
- `event_date date NOT NULL`
- `state text`
- `kind text NOT NULL`
- `title text NOT NULL`
- `description text`
- `source_id uuid`
- `source_kind text`
- `source_url text`
- `risk_summary text`
- `risk_level text NOT NULL`
- `inserted_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `public.cm_spokesperson_quotes` — table, ~5k rows

- `id bigint NOT NULL`
- `source_kind text NOT NULL`
- `source_id uuid NOT NULL`
- `state text`
- `speaker text NOT NULL`
- `speaker_canonical text`
- `party text`
- `role text`
- `quote text NOT NULL`
- `quote_lang text`
- `stance text`
- `sentiment real`
- `issue_id bigint`
- `issue_hint text`
- `source_url text`
- `extracted_at timestamp with time zone NOT NULL`

### `public.cm_stance_scores` — table, ~107k rows

- `id bigint NOT NULL`
- `source_kind text NOT NULL`
- `source_id uuid NOT NULL`
- `state text`
- `stance text NOT NULL`
- `party text`
- `party_kind text`
- `confidence real NOT NULL`
- `model text NOT NULL`
- `scored_at timestamp with time zone NOT NULL`

## Newsroom / broadcast

### `public.newsroom_breaking_clusters` — table, ? rows

- `id uuid NOT NULL`
- `headline text NOT NULL`
- `headline_en text`
- `first_seen_at timestamp with time zone NOT NULL`
- `last_seen_at timestamp with time zone NOT NULL`
- `channel_count integer NOT NULL`
- `segment_count integer NOT NULL`
- `is_real_event boolean NOT NULL`
- `severity smallint NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.newsroom_breaking_segments` — table, ? rows

- `cluster_id uuid NOT NULL`
- `segment_id uuid NOT NULL`

### `public.newsroom_briefs` — table, ? rows

- `id uuid NOT NULL`
- `for_date date NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `stories jsonb NOT NULL`
- `story_count integer NOT NULL`
- `source_channel_count integer NOT NULL`
- `source_segment_count integer NOT NULL`

### `public.newsroom_broadcasts` — table, ~2 rows

- `id uuid NOT NULL`
- `channel_id uuid NOT NULL`
- `yt_video_id text NOT NULL`
- `title text`
- `title_en text`
- `started_at timestamp with time zone NOT NULL`
- `ended_at timestamp with time zone`
- `is_live boolean NOT NULL`
- `duration_sec integer`
- `created_at timestamp with time zone NOT NULL`

### `public.newsroom_channel_live_digest` — table, ? rows

- `channel_id uuid NOT NULL`
- `video_id text NOT NULL`
- `caption_buffer text NOT NULL`
- `last_caption_at timestamp with time zone`
- `top_phrases jsonb NOT NULL`
- `top_stories jsonb NOT NULL`
- `summary text NOT NULL`
- `entity_ids ARRAY NOT NULL`
- `generated_at timestamp with time zone NOT NULL`

### `public.newsroom_channels` — table, ~25 rows

- `id uuid NOT NULL`
- `name text NOT NULL`
- `yt_handle text NOT NULL`
- `language text NOT NULL`
- `beat text NOT NULL`
- `is_live_24x7 boolean NOT NULL`
- `active boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `current_live_video_id text`
- `current_live_title text`
- `last_live_check_at timestamp with time zone`
- `last_live_at timestamp with time zone`

### `public.newsroom_entity_mentions` — table, ~90 rows

- `id uuid NOT NULL`
- `segment_id uuid NOT NULL`
- `entity_id uuid NOT NULL`
- `span_start integer`
- `span_end integer`
- `was_phonetic boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.newsroom_segments` — table, ~37 rows

- `id uuid NOT NULL`
- `broadcast_id uuid NOT NULL`
- `start_sec numeric NOT NULL`
- `end_sec numeric NOT NULL`
- `speaker_label text`
- `speaker_entity_id uuid`
- `text_native text NOT NULL`
- `text_en text`
- `confidence numeric`
- `l1_text text`
- `l2_text text`
- `l3_text text`
- `is_quote boolean NOT NULL`
- `is_editorial boolean NOT NULL`
- `sentiment numeric`
- `framing text`
- `is_live boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `public.newsroom_vod_caption_cache` — table, ? rows

- `video_id text NOT NULL`
- `caption_text text NOT NULL`
- `language text`
- `fetched_at timestamp with time zone NOT NULL`

## Government documents

### `public.govt_collection_runs` — table, ~2k rows

- `id uuid NOT NULL`
- `source_id uuid`
- `source_name text NOT NULL`
- `started_at timestamp with time zone NOT NULL`
- `finished_at timestamp with time zone`
- `status text NOT NULL`
- `urls_discovered integer`
- `urls_filtered_junk integer`
- `pdfs_downloaded integer`
- `pdfs_extracted integer`
- `docs_inserted integer`
- `docs_failed integer`
- `error_summary text`

### `public.govt_document_chunks` — table, ~1k rows

- `id uuid NOT NULL`
- `document_id uuid`
- `chunk_index integer NOT NULL`
- `chunk_text text NOT NULL`
- `chunk_translated text`
- `labse_embedding USER-DEFINED`
- `page_number integer`
- `created_at timestamp with time zone`
- `section_heading text`
- `start_char integer`
- `end_char integer`

### `public.govt_document_sources` — table, ~50 rows

- `id uuid NOT NULL`
- `name text NOT NULL`
- `portal_url text NOT NULL`
- `source_geography text NOT NULL`
- `document_type text NOT NULL`
- `scrape_pattern text`
- `is_active boolean`
- `last_scraped_at timestamp with time zone`
- `created_at timestamp with time zone`
- `health_score double precision`
- `consecutive_failures integer`
- `since_days_override integer`

### `public.govt_documents` — table, ~331 rows

- `id uuid NOT NULL`
- `source_id uuid`
- `source_name text NOT NULL`
- `source_geography text NOT NULL`
- `document_type text NOT NULL`
- `title text NOT NULL`
- `document_number text`
- `document_url text NOT NULL`
- `published_at timestamp with time zone`
- `full_text text`
- `full_text_translated text`
- `language_detected text`
- `page_count integer`
- `summary text`
- `topic_category text`
- `geo_primary text`
- `entities_extracted jsonb`
- `labse_embedding USER-DEFINED`
- `nlp_processed boolean`
- `collected_at timestamp with time zone`
- `updated_at timestamp with time zone`
- `intel_json jsonb`
- `intrinsic_importance double precision`
- `document_nature text`
- `action_posture text`
- `geography_affected jsonb`
- `financial_magnitude_inr bigint`
- `effective_date date`
- `winners jsonb`
- `losers jsonb`
- `enforcement_strength text`

## Narrative / events / dossiers

### `public.audit_decisions` — table, ? rows

- `id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `field_name text NOT NULL`
- `extraction_version integer NOT NULL`
- `verdict text NOT NULL`
- `note text`
- `decided_by uuid`
- `decided_at timestamp with time zone NOT NULL`

### `public.brief_quality_scores` — table, ? rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `brief_date date NOT NULL`
- `scored_at timestamp with time zone NOT NULL`
- `has_situation_status boolean NOT NULL`
- `has_key_developments boolean NOT NULL`
- `has_entities_today boolean NOT NULL`
- `has_signals_to_watch boolean NOT NULL`
- `has_financial_pulse boolean NOT NULL`
- `has_source_coverage boolean NOT NULL`
- `bracket_cites integer NOT NULL`
- `pillar_cites integer NOT NULL`
- `failure_marker_count integer NOT NULL`
- `invalid_indexes jsonb NOT NULL`
- `article_recency_avg_days numeric`
- `article_recency_max_days numeric`
- `articles_within_36h integer`
- `section_word_counts jsonb NOT NULL`
- `overall_score numeric`

### `public.briefs` — table, ~7 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `content text NOT NULL`
- `brief_date date NOT NULL`
- `generated_at timestamp with time zone`
- `articles_used integer`
- `model_used text`
- `source_counts jsonb`
- `evidence jsonb`

### `public.collection_articles` — table, ? rows

- `id uuid NOT NULL`
- `collection_id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `added_at timestamp with time zone`
- `note text`

### `public.collections` — table, ? rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `name text NOT NULL`
- `description text`
- `article_count integer`
- `created_at timestamp with time zone`
- `updated_at timestamp with time zone`

### `public.dossier_audit_log` — table, ~8 rows

- `id uuid NOT NULL`
- `user_id text NOT NULL`
- `dossier_id uuid`
- `action text NOT NULL`
- `target text`
- `purpose_note text`
- `metadata jsonb`
- `created_at timestamp with time zone NOT NULL`

### `public.dossier_cache` — table, ~22 rows

- `cache_key text NOT NULL`
- `source text NOT NULL`
- `target_hash text NOT NULL`
- `payload jsonb NOT NULL`
- `fetched_at timestamp with time zone NOT NULL`
- `expires_at timestamp with time zone NOT NULL`

### `public.dossier_finding` — table, ~421 rows

- `id uuid NOT NULL`
- `dossier_id uuid NOT NULL`
- `source text NOT NULL`
- `field text NOT NULL`
- `value jsonb NOT NULL`
- `source_url text`
- `confidence real NOT NULL`
- `found_at timestamp with time zone NOT NULL`

### `public.event_clusters` — table, ~7k rows

- `id uuid NOT NULL`
- `canonical_description text NOT NULL`
- `canonical_actors ARRAY NOT NULL`
- `canonical_event_type text`
- `canonical_date date`
- `is_future boolean`
- `article_count integer NOT NULL`
- `source_count integer NOT NULL`
- `confidence_score real`
- `first_seen_at timestamp with time zone NOT NULL`
- `last_updated_at timestamp with time zone NOT NULL`
- `is_active boolean NOT NULL`
- `importance_score real`
- `importance_updated_at timestamp with time zone`

### `public.event_dissent` — table, ? rows

- `id uuid NOT NULL`
- `thread_id uuid`
- `breaking_cluster_id uuid`
- `sources jsonb NOT NULL`
- `sentiment_variance real NOT NULL`
- `framing_summary text NOT NULL`
- `detected_at timestamp with time zone NOT NULL`
- `detected_by_model text NOT NULL`

### `public.narrative_cluster_members` — table, ? rows

- `cluster_id uuid NOT NULL`
- `article_id uuid NOT NULL`

### `public.narrative_clusters` — table, ? rows

- `id uuid NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `superseded_at timestamp with time zone`
- `lookback_hours integer NOT NULL`
- `avg_internal_sim real NOT NULL`
- `member_count integer NOT NULL`
- `narrative_frame text`
- `seed_article_id uuid`
- `pass_status text`
- `final_draft_id uuid`

### `public.narrative_drafts` — table, ? rows

- `id uuid NOT NULL`
- `cluster_id uuid NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `revision integer NOT NULL`
- `status text NOT NULL`
- `lede text`
- `body text`
- `headline text`
- `score_specificity real`
- `score_rhythm real`
- `score_stance real`
- `score_narrative_grav real`
- `score_anti_recap real`
- `critic_notes_json jsonb`
- `word_count integer`

### `public.top_stories_daily` — table, ~92 rows

- `id uuid NOT NULL`
- `date date NOT NULL`
- `user_id uuid`
- `stories jsonb NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `generated_by_model text NOT NULL`

## Users & product

### `analytics.user_brief_prefs` — table, ~5 rows

- `user_id uuid NOT NULL`
- `primary_subject_id uuid`
- `primary_subject_meta jsonb`
- `watchlist jsonb NOT NULL`
- `regions jsonb NOT NULL`
- `topics jsonb NOT NULL`
- `languages jsonb NOT NULL`
- `sources jsonb NOT NULL`
- `stance jsonb NOT NULL`
- `events jsonb NOT NULL`
- `delivery jsonb NOT NULL`
- `personality jsonb NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `analytics.user_story_assignments` — table, ? rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `story_id uuid NOT NULL`
- `assigned_at timestamp with time zone NOT NULL`
- `assigned_by text`
- `label text`

### `analytics.users` — table, ? rows

- `id uuid NOT NULL`
- `org_id uuid`
- `email text NOT NULL`
- `full_name text`
- `designation text`
- `is_super_admin boolean NOT NULL`
- `invited_by uuid`
- `onboarded_at timestamp with time zone`
- `last_login_at timestamp with time zone`
- `created_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `public.alerts` — table, ? rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `alert_type text NOT NULL`
- `entity_name text`
- `headline text NOT NULL`
- `detail text`
- `confidence text NOT NULL`
- `relevance_score double precision`
- `is_read boolean`
- `triggered_at timestamp with time zone`
- `expires_at timestamp with time zone`

### `public.analyst_sessions` — table, ~184 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `created_at timestamp with time zone`
- `updated_at timestamp with time zone`
- `room text NOT NULL`

### `public.analyst_turns` — table, ~157 rows

- `id uuid NOT NULL`
- `session_id uuid NOT NULL`
- `question text NOT NULL`
- `answer text NOT NULL`
- `evidence_count integer`
- `confidence text`
- `retrieval_ms integer`
- `created_at timestamp with time zone`
- `room text NOT NULL`

### `public.impersonation_actions` — table, ~3k rows

- `id bigint NOT NULL`
- `session_id uuid NOT NULL`
- `method text NOT NULL`
- `path text NOT NULL`
- `status_code integer`
- `at timestamp with time zone NOT NULL`

### `public.impersonation_sessions` — table, ~2 rows

- `id uuid NOT NULL`
- `admin_id uuid NOT NULL`
- `target_user_id uuid NOT NULL`
- `started_at timestamp with time zone NOT NULL`
- `ended_at timestamp with time zone`
- `reason text`

### `public.journalist_profiles` — table, ? rows

- `id uuid NOT NULL`
- `author_name text NOT NULL`
- `entity_name text NOT NULL`
- `for_count integer`
- `against_count integer`
- `neutral_count integer`
- `bias_indicator text`
- `updated_at timestamp with time zone`

### `public.notification_events` — table, ? rows

- `id uuid NOT NULL`
- `rule_id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `fired_at timestamp with time zone NOT NULL`
- `is_read boolean NOT NULL`

### `public.notification_rules` — table, ? rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `label text NOT NULL`
- `predicate jsonb NOT NULL`
- `channels jsonb NOT NULL`
- `is_active boolean NOT NULL`
- `created_at timestamp with time zone NOT NULL`
- `last_evaluated_at timestamp with time zone`

### `public.user_article_relevance` — table, ~245k rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `score_stage1 double precision NOT NULL`
- `score_final double precision NOT NULL`
- `relevance_tier integer NOT NULL`
- `relevance_explanation text`
- `sentiment_for_user text`
- `geo_multiplier_applied double precision`
- `matched_entity_names ARRAY`
- `scored_at timestamp with time zone`

### `public.user_breaking_now` — table, ? rows

- `user_id uuid NOT NULL`
- `article_id uuid NOT NULL`
- `selected_at timestamp with time zone NOT NULL`
- `window_started_at timestamp with time zone NOT NULL`
- `source_tier smallint NOT NULL`
- `relevance_tier smallint NOT NULL`
- `candidates_count smallint NOT NULL`
- `near_dup_sources smallint NOT NULL`
- `decision_path text NOT NULL`
- `reason text`
- `picker_model text`
- `raw_pick_response jsonb`
- `headline_one_line text`
- `why_for_user text`

### `public.user_card_summaries` — table, ? rows

- `definition_hash text NOT NULL`
- `sections jsonb NOT NULL`
- `citations jsonb NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `generated_by_model text NOT NULL`
- `sample_size integer NOT NULL`

### `public.user_cards` — table, ~1 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `label text NOT NULL`
- `definition_hash text NOT NULL`
- `entity_refs jsonb NOT NULL`
- `topic_filters jsonb NOT NULL`
- `geo_filter jsonb NOT NULL`
- `user_intent text`
- `created_at timestamp with time zone NOT NULL`
- `last_refreshed_at timestamp with time zone`
- `parent_card_id uuid`
- `sub_card_angle text`
- `sub_cards_spawned boolean NOT NULL`

### `public.user_entities` — table, ~61 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `canonical_name text NOT NULL`
- `entity_type text NOT NULL`
- `aliases ARRAY`
- `why_watching text`
- `priority integer`
- `created_at timestamp with time zone`

### `public.user_govt_doc_relevance` — table, ~236 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `doc_id uuid NOT NULL`
- `score_stage1 double precision NOT NULL`
- `score_final double precision NOT NULL`
- `relevance_tier integer NOT NULL`
- `relevance_explanation text`
- `urgency text`
- `suggested_action text`
- `why_it_matters text`
- `sentiment_for_user text`
- `matched_entity_names ARRAY`
- `geo_match_strength double precision`
- `computed_at timestamp with time zone`

### `public.user_page_access` — table, ~16 rows

- `user_id uuid NOT NULL`
- `page_slug text NOT NULL`
- `granted_by uuid`
- `granted_at timestamp with time zone NOT NULL`

### `public.user_profiles` — table, ~1 rows

- `id uuid NOT NULL`
- `user_id uuid NOT NULL`
- `raw_description text NOT NULL`
- `role_type text NOT NULL`
- `organisation text`
- `geo_primary text NOT NULL`
- `geo_secondary ARRAY`
- `signal_priorities jsonb NOT NULL`
- `language_preferences ARRAY`
- `brief_time time without time zone`
- `brief_timezone text`
- `role_context text NOT NULL`
- `created_at timestamp with time zone`
- `updated_at timestamp with time zone`

### `public.user_watched_entities` — table, ~571 rows

- `user_id uuid NOT NULL`
- `entity_id uuid NOT NULL`
- `bucket text NOT NULL`
- `weight smallint NOT NULL`
- `source text`
- `added_at timestamp with time zone NOT NULL`

### `public.user_watchlist` — table, ? rows

- `user_id uuid NOT NULL`
- `entity_id uuid NOT NULL`
- `pinned_at timestamp with time zone NOT NULL`
- `last_seen_at timestamp with time zone NOT NULL`

### `public.users` — table, ~3 rows

- `id uuid NOT NULL`
- `email text NOT NULL`
- `created_at timestamp with time zone`
- `role text NOT NULL`

### `public.velocity_baselines` — table, ? rows

- `id uuid NOT NULL`
- `entity_name text NOT NULL`
- `baseline_type text NOT NULL`
- `daily_mean double precision NOT NULL`
- `daily_stddev double precision NOT NULL`
- `spike_threshold double precision NOT NULL`
- `silence_threshold double precision NOT NULL`
- `computed_at timestamp with time zone`

## Ops / infra

### `public.celery_taskmeta` — table, ~269k rows

- `id integer NOT NULL`
- `task_id character varying`
- `status character varying`
- `result bytea`
- `date_done timestamp without time zone`
- `traceback text`
- `name character varying`
- `args bytea`
- `kwargs bytea`
- `worker character varying`
- `retries integer`
- `queue character varying`

### `public.celery_tasksetmeta` — table, ? rows

- `id integer NOT NULL`
- `taskset_id character varying`
- `result bytea`
- `date_done timestamp without time zone`

### `public.dateline_backfill_20260606` — table, ~2k rows

- `article_id uuid NOT NULL`
- `place text`
- `set_at timestamp with time zone`

### `public.kombu_message` — table, ~115k rows

- `id integer NOT NULL`
- `visible boolean`
- `timestamp timestamp without time zone`
- `payload text NOT NULL`
- `version smallint NOT NULL`
- `queue_id integer`

### `public.kombu_queue` — table, ? rows

- `id integer NOT NULL`
- `name character varying`

### `public.mc_host_metrics` — table, ~14k rows

- `captured_at timestamp with time zone NOT NULL`
- `metric text NOT NULL`
- `value numeric`
- `unit text`
- `detail jsonb`

### `public.mc_snapshots` — table, ? rows

- `key text NOT NULL`
- `computed_at timestamp with time zone NOT NULL`
- `rows jsonb NOT NULL`

### `public.source_run_health` — table, ~6 rows

- `source_id text NOT NULL`
- `last_success_at timestamp with time zone`
- `last_failure_at timestamp with time zone`
- `last_failure text`
- `consecutive_failures integer NOT NULL`
- `rows_last_run integer`
- `updated_at timestamp with time zone NOT NULL`

### `public.sources` — table, ~1k rows

- `id uuid NOT NULL`
- `name text NOT NULL`
- `domain text NOT NULL`
- `rss_url text`
- `source_type text NOT NULL`
- `source_tier integer NOT NULL`
- `language text`
- `geo_states ARRAY`
- `topics ARRAY`
- `health_score double precision`
- `consecutive_failures integer`
- `is_active boolean`
- `last_collected_at timestamp with time zone`
- `created_at timestamp with time zone`
- `country character NOT NULL`

### `public.topic_categories` — table, ? rows

- `name text NOT NULL`
- `is_new boolean NOT NULL`
- `rolls_up_to text NOT NULL`
- `description text`
- `introduced_at date NOT NULL`

## Backups / scratch (deletion candidates)

### `analytics.ubp_bak_amitshah_20260606` — table, ? rows

- `user_id uuid`
- `primary_subject_id uuid`
- `primary_subject_meta jsonb`
- `watchlist jsonb`
- `regions jsonb`
- `topics jsonb`
- `languages jsonb`
- `sources jsonb`
- `stance jsonb`
- `events jsonb`
- `delivery jsonb`
- `personality jsonb`
- `updated_at timestamp with time zone`

### `public._backup_pre_category_a` — table, ~113k rows

- `id uuid`
- `inserted_at timestamp with time zone`
- `geo_secondary ARRAY`
- `author_name text`

### `public._bak_articles_cols_20260526` — table, ~113k rows

- `id uuid`
- `inserted_at timestamp with time zone`
- `geo_secondary ARRAY`
- `author_name text`

### `public._bak_articles_dropped_cols_20260525t210851z` — table, ~113k rows

- `id uuid`
- `inserted_at timestamp with time zone`
- `geo_secondary ARRAY`
- `author_name text`

### `public.articles_embed_backup_20260523` — table, ~801 rows

- `id uuid`
- `old_sig text`
- `old_embedding USER-DEFINED`

### `public.articles_lang_backup_20260523` — table, ~11k rows

- `id uuid`
- `old_lang character varying`
- `title text`

## Other / uncategorised

### `analytics._cand_pairs` — table, ~3.0M rows

- `a_id uuid`
- `b_id uuid`
- `label text`

### `analytics._clust` — table, ~1k rows

- `article_id uuid`
- `cluster_id uuid`
- `source_id uuid`

### `analytics._edge_stage` — table, ~2k rows

- `a_id uuid`
- `b_id uuid`
- `label text`
- `source text`
- `group_key text`
- `kind text`

### `analytics._fixture_ids` — table, ~1k rows

- `id uuid`

### `analytics._fm9` — table, ? rows

- `a_id uuid`
- `b_id uuid`
- `key text`

### `analytics._fm_pairs` — table, ? rows

- `a_id uuid`
- `b_id uuid`
- `label text`

### `analytics._sc` — table, ~37k rows

- `article_id uuid`
- `cluster_id uuid`
- `source_id uuid`

### `analytics._scl` — table, ~37k rows

- `article_id uuid`
- `cluster_id uuid`
- `source_id uuid`

### `analytics._src_activate` — table, ~116 rows

- `id uuid`
- `rn bigint`

### `analytics._win` — table, ~137k rows

- `id uuid`

### `analytics.articles_to_dedup` — view, ? rows

- `duplicate_id uuid`
- `canonical_id uuid`

### `analytics.chronicle_cache` — table, ? rows

- `story_id uuid NOT NULL`
- `payload jsonb NOT NULL`
- `generated_at timestamp with time zone NOT NULL`
- `model_version text`

### `analytics.dedup_val` — table, ~288 rows

- `seed_id uuid`
- `seed_subj text`
- `seed_src uuid`
- `seed_lang text`
- `seed_t timestamp with time zone`
- `nn_id uuid`
- `nn_subj text`
- `nn_src uuid`
- `nn_lang text`
- `nn_t timestamp with time zone`
- `trgm_sim numeric`
- `same_source boolean`
- `title_trgm numeric`
- `canonical_url_match boolean`
- `topic_match boolean`
- `topic_mismatch boolean`
- `author_match boolean`
- `shared_locations integer`
- `shared_primary_loc boolean`
- `length_ratio numeric`
- `time_diff_hours numeric`
- `shared_speakers integer`
- `shared_actors integer`
- `event_date_match boolean`
- `idf_loc_score numeric`

### `analytics.dup_golden` — table, ~61 rows

- `seed_id uuid`
- `nn_id uuid`
- `seed_subj text`
- `nn_subj text`
- `seed_src uuid`
- `nn_src uuid`
- `same_source boolean`
- `bucket text`
- `trgm_sim numeric`
- `title_trgm numeric`
- `canonical_url_match boolean`
- `shared_locations integer`
- `shared_primary_loc boolean`
- `idf_loc_score numeric`
- `shared_speakers integer`
- `shared_actors integer`
- `event_date_match boolean`
- `topic_match boolean`
- `topic_mismatch boolean`
- `author_match boolean`
- `length_ratio numeric`
- `label text`
- `label_reason text`

### `analytics.dup_golden_v2` — table, ~300 rows

- `a_id uuid`
- `b_id uuid`
- `trgm_subject numeric`
- `trgm_title numeric`
- `shared_actors integer`
- `shared_speakers integer`
- `shared_locations integer`
- `shared_primary_loc boolean`
- `idf_loc_score numeric`
- `canonical_url_match boolean`
- `event_date_match boolean`
- `length_ratio numeric`
- `time_diff_hours numeric`
- `a_language text`
- `b_language text`
- `a_source_id uuid`
- `b_source_id uuid`
- `a_collected_at timestamp with time zone`
- `b_collected_at timestamp with time zone`
- `same_source boolean`
- `same_language boolean`
- `computed_at timestamp with time zone`
- `algo_version text`
- `a_subject text`
- `b_subject text`
- `a_title text`
- `b_title text`
- `a_source_name text`
- `b_source_name text`
- `bucket text`
- `rn bigint`
- `label text`
- `label_reason text`

### `analytics.dup_overrides` — table, ? rows

- `a_id uuid NOT NULL`
- `b_id uuid NOT NULL`
- `decision text NOT NULL`
- `editor text NOT NULL`
- `reason text`
- `created_at timestamp with time zone NOT NULL`

### `analytics.embed_ab` — table, ~16k rows

- `article_id uuid NOT NULL`
- `variant text NOT NULL`
- `vector USER-DEFINED NOT NULL`
- `char_len integer NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `analytics.embed_ab_sample` — table, ~4k rows

- `article_id uuid NOT NULL`
- `stratum text NOT NULL`
- `added_at timestamp with time zone NOT NULL`

### `analytics.embed_ab_variants` — table, ? rows

- `variant text NOT NULL`
- `language text NOT NULL`
- `title_prepend boolean NOT NULL`
- `char_window integer NOT NULL`
- `model_rev text NOT NULL`

### `analytics.hard_neg_candidates` — table, ~500 rows

- `stratum text`
- `a_id uuid`
- `b_id uuid`
- `a_language text`
- `b_language text`
- `same_source boolean`
- `trgm_subject numeric`
- `trgm_title numeric`
- `shared_actors integer`
- `shared_locations integer`
- `tdiff_h numeric`
- `a_title text`
- `b_title text`
- `a_subject text`
- `b_subject text`
- `label text`
- `label_reason text`
- `human_clean boolean`

### `analytics.hard_neg_candidates_v2` — table, ~300 rows

- `stratum text`
- `a_id uuid NOT NULL`
- `b_id uuid NOT NULL`
- `a_title text`
- `b_title text`
- `a_subject text`
- `b_subject text`
- `trgm_subject real`
- `shared_actors integer`
- `num_jaccard real`
- `a_numbers text`
- `b_numbers text`
- `label text`
- `label_reason text`
- `human_clean boolean`

### `analytics.hard_neg_candidates_v3` — table, ~141 rows

- `stratum text`
- `a_id uuid NOT NULL`
- `b_id uuid NOT NULL`
- `a_title text`
- `b_title text`
- `a_subject text`
- `b_subject text`
- `trgm_title real`
- `key_reason text`
- `label text`
- `label_reason text`

### `analytics.hard_neg_fps` — table, ? rows

- `a_id uuid`
- `b_id uuid`
- `a_language text`
- `b_language text`
- `same_source boolean`
- `trgm_subject numeric`
- `trgm_title numeric`
- `shared_actors integer`
- `shared_locations integer`
- `a_subject text`
- `b_subject text`
- `a_title text`
- `b_title text`
- `a_source_name text`
- `b_source_name text`
- `label text`
- `label_reason text`

### `analytics.home_cache` — table, ~5 rows

- `user_id uuid NOT NULL`
- `payload jsonb NOT NULL`
- `computed_at timestamp with time zone NOT NULL`

### `analytics.invites` — table, ? rows

- `token_hash text NOT NULL`
- `email text NOT NULL`
- `org_id uuid`
- `role_template text NOT NULL`
- `invited_by uuid`
- `expires_at timestamp with time zone NOT NULL`
- `consumed_at timestamp with time zone`
- `consumed_by uuid`
- `notes text`
- `created_at timestamp with time zone NOT NULL`

### `analytics.orgs` — table, ? rows

- `id uuid NOT NULL`
- `name text NOT NULL`
- `role_template text NOT NULL`
- `notes text`
- `created_at timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `analytics.page_cache` — table, ~20 rows

- `user_id uuid NOT NULL`
- `page text NOT NULL`
- `payload jsonb NOT NULL`
- `computed_at timestamp with time zone NOT NULL`

### `analytics.pair_scores` — table, ~28k rows

- `a_id uuid NOT NULL`
- `b_id uuid NOT NULL`
- `trgm_subject numeric NOT NULL`
- `trgm_title numeric`
- `shared_actors integer NOT NULL`
- `shared_speakers integer NOT NULL`
- `shared_locations integer NOT NULL`
- `shared_primary_loc boolean NOT NULL`
- `idf_loc_score numeric NOT NULL`
- `canonical_url_match boolean NOT NULL`
- `event_date_match boolean NOT NULL`
- `length_ratio numeric`
- `time_diff_hours numeric NOT NULL`
- `a_language text`
- `b_language text`
- `a_source_id uuid`
- `b_source_id uuid`
- `a_collected_at timestamp with time zone NOT NULL`
- `b_collected_at timestamp with time zone NOT NULL`
- `same_source boolean`
- `same_language boolean`
- `computed_at timestamp with time zone NOT NULL`
- `algo_version text NOT NULL`

### `analytics.pair_scores_watermark` — table, ? rows

- `id integer NOT NULL`
- `last_processed_collected_at timestamp with time zone`
- `total_pairs integer NOT NULL`
- `updated_at timestamp with time zone NOT NULL`

### `analytics.replay_clock` — table, ? rows

- `id integer NOT NULL`
- `sim_now timestamp with time zone NOT NULL`
- `updated_at timestamp with time zone NOT NULL`
- `note text`

### `analytics.report_cache` — table, ? rows

- `user_id uuid NOT NULL`
- `edition_date date NOT NULL`
- `report jsonb NOT NULL`
- `built_at timestamp with time zone NOT NULL`

### `analytics.suppression_audit` — table, ? rows

- `id bigint NOT NULL`
- `story_id uuid NOT NULL`
- `suppression_reason text NOT NULL`
- `suppressed_at timestamp with time zone NOT NULL`
- `article_count_at_flag integer`
- `independent_source_count_at_flag integer`
- `entity_core_cov_at_flag numeric`
- `top_entity_at_flag text`
- `representative_title_at_flag text`
- `spec_doc text`
- `applied_by text`
- `notes text`

### `analytics.text_en` — table, ~7k rows

- `src_hash text NOT NULL`
- `text_en text NOT NULL`
- `created_at timestamp with time zone NOT NULL`

### `analytics.worldwide_candidates` — view, ? rows

- `id uuid`
- `title text`
- `summary_executive text`
- `summary_snippet text`
- `primary_subject text`
- `topic_category text`
- `source_country character`
- `published_at timestamp with time zone`
- `collected_at timestamp with time zone`
- `labse_embedding USER-DEFINED`
- `source_name text`
- `source_tier integer`
- `extraction_version smallint`
- `substrate_processed_at timestamp with time zone`
- `language_iso text`
- `article_type text`

### `public.content_items` — view, ? rows

- `id uuid`
- `src text`
- `headline text`
- `body_text text`
- `topic_category text`
- `topic_fine text`
- `language text`
- `primary_subject text`
- `item_date date`
- `entities_extracted jsonb`
- `labse_embedding USER-DEFINED`
- `relevance_score double precision`

### `public.mv_cm_constituency_daily` — matview, ~29 rows



### `public.mv_cm_issue_hourly` — matview, ? rows



### `public.mv_cm_voice_share` — matview, ~2k rows



### `public.v_freshness_coverage_by_age` — view, ? rows

- `bucket text`
- `total bigint`
- `embedded bigint`
- `pct_embedded numeric`
- `nlp_done bigint`
- `substrate_ok bigint`

### `public.v_freshness_fresh_window` — view, ? rows

- `window text`
- `collected bigint`
- `embedded bigint`
- `embedded_pct numeric`
- `nlp_done bigint`
- `substrate_ok bigint`
- `substrate_pct numeric`

### `public.v_freshness_now` — view, ? rows

- `newest_article timestamp with time zone`
- `newest_age_min integer`
- `ingested_1h bigint`
- `ingested_24h bigint`
- `pct_embedded_24h numeric`
- `nlp_pending bigint`
- `vectors_total bigint`
- `vectors_with_provenance bigint`

### `public.v_freshness_pipeline_lag` — view, ? rows

- `stage text`
- `n_24h bigint`
- `p50_min numeric`
- `p95_min numeric`

---

## Foreign-key relationships

_No declared foreign keys (relationships are by convention, not enforced)._

---

## jsonb shapes (content pillars)

- `articles.entities_extracted` element keys: `confidence`, `label`, `name`, `prominence`, `type`
- `articles.claims_extracted` element keys: `(err: function jsonb_array_elements(boolean) does not exist)`
- `clippings.entities_extracted` element keys: `name`, `type`
- `youtube_clips_v2.entities_extracted` element keys: `name`, `type`

---

## Materialized view definitions

### `analytics.article_signals_mv`

```sql
SELECT a.id AS article_id,
    a.primary_subject,
    a.language_iso,
    a.source_id,
    a.source_country,
    a.collected_at,
    a.published_at,
    a.article_type,
    a.title,
    a.summary_executive,
    "left"(a.full_text_scraped, 1500) AS lede,
    COALESCE(ARRAY( SELECT al.location_text
           FROM article_locations al
          WHERE ((al.article_id = a.id) AND ((al.is_primary = true) OR (al.location_scope = ANY (ARRAY['city'::text, 'state'::text, 'country'::text]))))
          ORDER BY al.is_primary DESC, al.mention_count DESC NULLS LAST
         LIMIT 5), ARRAY[]::text[]) AS canonical_locations,
    a.extraction_version,
    a.substrate_processed_at
   FROM articles a
  WHERE ((a.substrate_status = 'ok'::text) AND (a.extraction_version = 3) AND (a.substrate_processed_at > '2026-05-27 16:00:00+00'::timestamp with time zone) AND (a.primary_subject IS NOT NULL) AND (a.primary_subject !~~ '%no substantive content%'::text) AND (a.article_type = ANY (ARRAY['news'::text, 'analysis'::text, 'opinion'::text, 'explainer'::text, 'interview'::text])));
```

### `public.article_entity_mentions`

```sql
SELECT a.id AS article_id,
    el.entity_id,
    ed.canonical_name,
    ed.entity_type,
    ed.country,
    array_agg(DISTINCT lower(TRIM(BOTH FROM (e.elem ->> 'name'::text)))) AS surface_forms,
    count(*) AS mention_rows
   FROM (((articles a
     CROSS JOIN LATERAL jsonb_array_elements(a.entities_extracted) e(elem))
     JOIN entity_lookup el ON ((el.name_norm = lower(TRIM(BOTH FROM (e.elem ->> 'name'::text))))))
     JOIN entity_dictionary ed ON ((ed.id = el.entity_id)))
  WHERE ((a.entities_extracted IS NOT NULL) AND (jsonb_typeof(a.entities_extracted) = 'array'::text))
  GROUP BY a.id, el.entity_id, ed.canonical_name, ed.entity_type, ed.country;
```

### `public.clipping_entity_mentions`

```sql
SELECT c.id AS clipping_id,
    el.entity_id,
    ed.canonical_name,
    ed.entity_type,
    ed.country,
    array_agg(DISTINCT lower(TRIM(BOTH FROM (e.elem ->> 'name'::text)))) AS surface_forms,
    count(*) AS mention_rows
   FROM (((clippings c
     CROSS JOIN LATERAL jsonb_array_elements(c.entities_extracted) e(elem))
     JOIN entity_lookup el ON ((el.name_norm = lower(TRIM(BOTH FROM (e.elem ->> 'name'::text))))))
     JOIN entity_dictionary ed ON ((ed.id = el.entity_id)))
  WHERE ((c.entities_extracted IS NOT NULL) AND (jsonb_typeof(c.entities_extracted) = 'array'::text))
  GROUP BY c.id, el.entity_id, ed.canonical_name, ed.entity_type, ed.country;
```

### `public.mv_cm_constituency_daily`

```sql
SELECT ac.code AS constituency_code,
    ac.state,
    ac.name,
    count(a.id) AS volume,
    avg(((
        CASE s.stance
            WHEN 'opposition_attack'::text THEN '-1.0'::numeric
            WHEN 'ruling_supportive'::text THEN 1.0
            ELSE 0.0
        END)::double precision * COALESCE(s.confidence, (0.0)::real))) AS mood_proxy,
    now() AS computed_at
   FROM ((assembly_constituencies ac
     LEFT JOIN articles a ON (((a.geo_primary IS NOT NULL) AND (a.geo_primary ~~* (('%'::text || ac.name) || '%'::text)) AND (a.published_at > (now() - '24:00:00'::interval)))))
     LEFT JOIN cm_stance_scores s ON (((s.source_kind = 'article'::text) AND (s.source_id = a.id))))
  GROUP BY ac.code, ac.state, ac.name;
```

### `public.mv_cm_issue_hourly`

```sql
SELECT cie.issue_id,
    date_trunc('hour'::text, a.published_at) AS hour,
    count(*) AS volume,
    avg(((
        CASE s.stance
            WHEN 'opposition_attack'::text THEN '-1.0'::numeric
            WHEN 'ruling_supportive'::text THEN 1.0
            WHEN 'neutral_factual'::text THEN 0.0
            ELSE 0.0
        END)::double precision * COALESCE(s.confidence, (0.0)::real))) AS avg_stance
   FROM ((cm_issue_evidence cie
     JOIN articles a ON (((a.id = cie.source_id) AND (cie.source_kind = 'article'::text))))
     LEFT JOIN cm_stance_scores s ON (((s.source_id = a.id) AND (s.source_kind = 'article'::text))))
  WHERE (a.published_at > (now() - '7 days'::interval))
  GROUP BY cie.issue_id, (date_trunc('hour'::text, a.published_at));
```

### `public.mv_cm_voice_share`

```sql
SELECT COALESCE(cm_spokesperson_quotes.speaker_canonical, cm_spokesperson_quotes.speaker) AS speaker,
    cm_spokesperson_quotes.party,
    cm_spokesperson_quotes.state,
    count(*) FILTER (WHERE (cm_spokesperson_quotes.extracted_at > (now() - '24:00:00'::interval))) AS mentions_24h,
    count(*) FILTER (WHERE (cm_spokesperson_quotes.extracted_at > (now() - '7 days'::interval))) AS mentions_7d,
    avg(cm_spokesperson_quotes.sentiment) FILTER (WHERE (cm_spokesperson_quotes.extracted_at > (now() - '24:00:00'::interval))) AS avg_sentiment_24h,
    avg(cm_spokesperson_quotes.sentiment) FILTER (WHERE (cm_spokesperson_quotes.extracted_at > (now() - '7 days'::interval))) AS avg_sentiment_7d
   FROM cm_spokesperson_quotes
  WHERE (COALESCE(cm_spokesperson_quotes.speaker_canonical, cm_spokesperson_quotes.speaker) IS NOT NULL)
  GROUP BY COALESCE(cm_spokesperson_quotes.speaker_canonical, cm_spokesperson_quotes.speaker), cm_spokesperson_quotes.party, cm_spokesperson_quotes.state;
```

### `public.mv_district_acled_7d`

```sql
SELECT acled_events.district_id,
    count(*) AS value,
    sum(acled_events.fatalities) AS total_fatalities,
    now() AS computed_at
   FROM acled_events
  WHERE ((acled_events.event_date > (CURRENT_DATE - '7 days'::interval)) AND (acled_events.district_id IS NOT NULL))
  GROUP BY acled_events.district_id;
```

### `public.mv_district_mandi_volatility_30d`

```sql
WITH baselines AS (
         SELECT mandi_prices.district_id,
            mandi_prices.commodity,
            (avg(mandi_prices.modal_price))::double precision AS baseline
           FROM mandi_prices
          WHERE ((mandi_prices.recorded_at > (CURRENT_DATE - '30 days'::interval)) AND (mandi_prices.modal_price IS NOT NULL) AND (mandi_prices.district_id IS NOT NULL))
          GROUP BY mandi_prices.district_id, mandi_prices.commodity
        ), latest AS (
         SELECT DISTINCT ON (mandi_prices.district_id, mandi_prices.commodity) mandi_prices.district_id,
            mandi_prices.commodity,
            mandi_prices.modal_price,
            mandi_prices.recorded_at
           FROM mandi_prices
          WHERE (mandi_prices.district_id IS NOT NULL)
          ORDER BY mandi_prices.district_id, mandi_prices.commodity, mandi_prices.recorded_at DESC
        )
 SELECT l.district_id,
    max(abs((((l.modal_price)::double precision - b.baseline) / NULLIF(b.baseline, (0)::double precision)))) AS value,
    count(*) AS commodity_count,
    now() AS computed_at
   FROM (latest l
     JOIN baselines b USING (district_id, commodity))
  WHERE (b.baseline > (0)::double precision)
  GROUP BY l.district_id;
```

### `public.mv_district_news_volume_24h`

```sql
SELECT ad.district_id,
    (sum(ad.confidence))::double precision AS value,
    count(*) AS article_count,
    avg(ad.confidence) AS avg_confidence,
    now() AS computed_at
   FROM (article_districts ad
     JOIN articles a ON ((a.id = ad.article_id)))
  WHERE (a.collected_at > (now() - '24:00:00'::interval))
  GROUP BY ad.district_id;
```

### `public.mv_district_power_stress`

```sql
SELECT power_grid_status.district_id,
    (COALESCE(max((power_grid_status.demand_mw - power_grid_status.supply_mw)), 0))::double precision AS value,
    (avg((power_grid_status.demand_mw - power_grid_status.supply_mw)))::double precision AS avg_deficit_mw,
    now() AS computed_at
   FROM power_grid_status
  WHERE ((power_grid_status.district_id IS NOT NULL) AND (power_grid_status.recorded_at > (now() - '24:00:00'::interval)))
  GROUP BY power_grid_status.district_id;
```

### `public.mv_district_sentiment_24h`

```sql
SELECT ad.district_id,
    avg(((
        CASE s.stance
            WHEN 'opposition_attack'::text THEN '-1.0'::numeric
            WHEN 'ruling_supportive'::text THEN 1.0
            WHEN 'neutral_factual'::text THEN 0.0
            ELSE 0.0
        END)::double precision * COALESCE(s.confidence, (0.0)::real))) AS value,
    count(*) AS scored_count,
    now() AS computed_at
   FROM ((article_districts ad
     JOIN articles a ON ((a.id = ad.article_id)))
     LEFT JOIN cm_stance_scores s ON (((s.source_id = a.id) AND (s.source_kind = 'article'::text))))
  WHERE (a.collected_at > (now() - '24:00:00'::interval))
  GROUP BY ad.district_id;
```

### `public.mv_district_stability_composite`

```sql
WITH aqi AS (
         SELECT air_quality_readings.district_id,
            ((1.0)::double precision - LEAST((1.0)::double precision, ((avg(air_quality_readings.aqi))::double precision / (300.0)::double precision))) AS aqi_score
           FROM air_quality_readings
          WHERE ((air_quality_readings.recorded_at > (now() - '24:00:00'::interval)) AND (air_quality_readings.district_id IS NOT NULL))
          GROUP BY air_quality_readings.district_id
        ), heat AS (
         SELECT weather_warnings.district_id,
                CASE
                    WHEN (max(
                    CASE weather_warnings.severity
                        WHEN 'red'::text THEN 4
                        WHEN 'orange'::text THEN 3
                        WHEN 'yellow'::text THEN 2
                        ELSE 1
                    END) >= 3) THEN 0.0
                    WHEN (max(
                    CASE weather_warnings.severity
                        WHEN 'red'::text THEN 4
                        WHEN 'orange'::text THEN 3
                        WHEN 'yellow'::text THEN 2
                        ELSE 1
                    END) = 2) THEN 0.5
                    ELSE 1.0
                END AS heat_score
           FROM weather_warnings
          WHERE ((weather_warnings.kind = 'heatwave'::text) AND (weather_warnings.valid_to > now()) AND (weather_warnings.district_id IS NOT NULL))
          GROUP BY weather_warnings.district_id
        ), acled AS (
         SELECT acled_events.district_id,
            ((1.0)::double precision - LEAST((1.0)::double precision, ((count(*))::double precision / (8.0)::double precision))) AS acled_score
           FROM acled_events
          WHERE ((acled_events.event_date > (CURRENT_DATE - '7 days'::interval)) AND (acled_events.district_id IS NOT NULL))
          GROUP BY acled_events.district_id
        ), news AS (
         SELECT ad.district_id,
            ((1.0)::double precision - LEAST((1.0)::double precision, ((sum(ad.confidence))::double precision / (10.0)::double precision))) AS news_score
           FROM (article_districts ad
             JOIN articles a ON ((a.id = ad.article_id)))
          WHERE (a.collected_at > (now() - '24:00:00'::interval))
          GROUP BY ad.district_id
        )
 SELECT d.id AS district_id,
    ((((((0.30)::double precision * COALESCE(aqi.aqi_score, (1.0)::double precision)) + ((0.25 * COALESCE(heat.heat_score, 1.0)))::double precision) + ((0.25)::double precision * COALESCE(acled.acled_score, (1.0)::double precision))) + ((0.20)::double precision * COALESCE(news.news_score, (1.0)::double precision))) * (100.0)::double precision) AS value,
    COALESCE(aqi.aqi_score, (1.0)::double precision) AS aqi_component,
    COALESCE(heat.heat_score, 1.0) AS heat_component,
    COALESCE(acled.acled_score, (1.0)::double precision) AS acled_component,
    COALESCE(news.news_score, (1.0)::double precision) AS news_component,
    now() AS computed_at
   FROM ((((districts d
     LEFT JOIN aqi ON ((aqi.district_id = d.id)))
     LEFT JOIN heat ON ((heat.district_id = d.id)))
     LEFT JOIN acled ON ((acled.district_id = d.id)))
     LEFT JOIN news ON ((news.district_id = d.id)));
```

### `public.mv_district_welfare_coverage`

```sql
WITH latest AS (
         SELECT DISTINCT ON (welfare_coverage.district_id, welfare_coverage.scheme) welfare_coverage.district_id,
            welfare_coverage.scheme,
            welfare_coverage.coverage_pct
           FROM welfare_coverage
          WHERE (welfare_coverage.district_id IS NOT NULL)
          ORDER BY welfare_coverage.district_id, welfare_coverage.scheme, welfare_coverage.recorded_at DESC
        )
 SELECT latest.district_id,
    avg(latest.coverage_pct) AS value,
    count(*) AS schemes_tracked,
    (min(latest.coverage_pct))::double precision AS worst_scheme_pct,
    now() AS computed_at
   FROM latest
  GROUP BY latest.district_id;
```

### `public.youtube_clip_entity_mentions`

```sql
SELECT yc.id AS clip_id,
    el.entity_id,
    ed.canonical_name,
    ed.entity_type,
    ed.country,
    lower(TRIM(BOTH FROM yc.matched_entity)) AS surface_form,
    1 AS mention_rows
   FROM ((youtube_clips_v2 yc
     JOIN entity_lookup el ON ((el.name_norm = lower(TRIM(BOTH FROM yc.matched_entity)))))
     JOIN entity_dictionary ed ON ((ed.id = el.entity_id)));
```


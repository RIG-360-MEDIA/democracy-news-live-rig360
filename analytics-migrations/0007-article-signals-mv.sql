-- 0007-article-signals-mv.sql
--
-- Cached signals per post-D1 candidate article. Shared by Worldwide,
-- All Sides, Newsletter dedup/clustering pipelines.
--
-- What lives here (one row per article):
--   - primary_subject              (the one-sentence LLM subject — primary match signal)
--   - language_iso                 (for language-bucketed comparison)
--   - canonical_locations          (top 5 locations, primary first then by mention_count)
--   - title / summary_executive / lede (first 1500 chars of body) (for MinHash channels)
--   - source_id / source_country   (for source-pair-aware thresholds)
--   - collected_at                 (for ±72h / ±5d candidate windows)
--
-- Filters applied (mirrors worldwide_candidates v3 minus the replay gate):
--   - substrate_status = 'ok'
--   - extraction_version = 3
--   - substrate_processed_at > '2026-05-27 16:00:00+00'  (post-D1)
--   - primary_subject IS NOT NULL
--   - primary_subject NOT LIKE '%no substantive content%' (LLM junk fallback)
--   - article_type IN ('news', 'analysis', 'opinion', 'explainer', 'interview')
--
-- NOTE: NO replay-clock gate here. The MV caches all post-D1 articles;
-- downstream views apply analytics.now_sim() filtering.
--
-- NOTE: NO is_duplicate filter here. See audit 2026-05-28 — that flag is
-- unreliable and is being replaced by this pipeline's output.

DROP MATERIALIZED VIEW IF EXISTS analytics.article_signals_mv;

CREATE MATERIALIZED VIEW analytics.article_signals_mv AS
SELECT
  a.id                       AS article_id,
  a.primary_subject,
  a.language_iso,
  a.source_id,
  a.source_country,
  a.collected_at,
  a.published_at,
  a.article_type,
  a.title,
  a.summary_executive,
  LEFT(a.full_text_scraped, 1500) AS lede,
  COALESCE(
    ARRAY(
      SELECT al.location_text
        FROM article_locations al
       WHERE al.article_id = a.id
         AND (al.is_primary = TRUE OR al.location_scope IN ('city','state','country'))
       ORDER BY al.is_primary DESC, al.mention_count DESC NULLS LAST
       LIMIT 5
    ),
    ARRAY[]::text[]
  )                          AS canonical_locations,
  a.extraction_version,
  a.substrate_processed_at
FROM public.articles a
WHERE a.substrate_status = 'ok'
  AND a.extraction_version = 3
  AND a.substrate_processed_at > '2026-05-27 16:00:00+00'
  AND a.primary_subject IS NOT NULL
  AND a.primary_subject NOT LIKE '%no substantive content%'
  AND a.article_type IN ('news', 'analysis', 'opinion', 'explainer', 'interview');

-- Indexes
-- (1) Unique on article_id — enables REFRESH MATERIALIZED VIEW CONCURRENTLY later.
CREATE UNIQUE INDEX article_signals_mv_pkey
  ON analytics.article_signals_mv (article_id);

-- (2) Trigram GIN on primary_subject — fast trigram similarity queries.
CREATE INDEX article_signals_mv_subject_trgm
  ON analytics.article_signals_mv USING GIN (primary_subject gin_trgm_ops);

-- (3) Language + time — for time-windowed candidate generation
--     (LSH proposes pairs only when same-language + within ±72h or ±5d).
CREATE INDEX article_signals_mv_lang_time
  ON analytics.article_signals_mv (language_iso, collected_at);

-- (4) GIN on canonical_locations — fast array-overlap checks.
CREATE INDEX article_signals_mv_locations
  ON analytics.article_signals_mv USING GIN (canonical_locations);

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) Row count should match worldwide_candidates v3 at full sim_now:
--    SELECT COUNT(*) FROM analytics.article_signals_mv;
--    -- expect: ~47K-50K depending on drain progress.
--
-- 2) Sample 5 rows with their locations:
--    SELECT article_id, LEFT(primary_subject, 60), language_iso, canonical_locations
--      FROM analytics.article_signals_mv ORDER BY random() LIMIT 5;
--
-- 3) Trigram similarity sanity (the two Sarma headlines we saw):
--    SELECT similarity(
--      'Himanta Biswa Sarma sworn in as Chief Minister of Assam for a second term.',
--      'Himanta Biswa Sarma takes oath as Assam Chief Minister for a second term.'
--    ); -- expect: > 0.5
--
-- 4) Quick benchmark — pick a random article, find top-5 by trigram similarity
--    within ±72h same-language:
--    WITH a AS (SELECT * FROM analytics.article_signals_mv ORDER BY random() LIMIT 1)
--    SELECT
--      LEFT(s.primary_subject, 60) AS subject,
--      similarity(a.primary_subject, s.primary_subject) AS sim,
--      s.language_iso, s.collected_at
--    FROM analytics.article_signals_mv s, a
--    WHERE s.article_id != a.article_id
--      AND s.language_iso = a.language_iso
--      AND s.collected_at BETWEEN a.collected_at - INTERVAL '72 hours'
--                             AND a.collected_at + INTERVAL '72 hours'
--    ORDER BY similarity(a.primary_subject, s.primary_subject) DESC
--    LIMIT 5;

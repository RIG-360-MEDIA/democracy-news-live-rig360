-- 0010-worldwide-candidates-v4.sql
--
-- Adds the dedup filter to analytics.worldwide_candidates.
-- Articles flagged as duplicates by the pair_scores pipeline at
-- threshold trgm_subject >= 0.55 are excluded.
--
-- Threshold 0.55 chosen from labeled validation (300 pairs):
--   precision 99%, recall 83%, F1 0.90.
-- See docs/audits/dedup-final-calibration-2026-05-29.md.
--
-- "Duplicate" = the LATER article (by collected_at) in a pair.
-- The earlier article is canonical and remains in Worldwide.
--
-- Editorial override flows through analytics.articles_to_dedup,
-- defined in 0011.

CREATE OR REPLACE VIEW analytics.worldwide_candidates AS
SELECT
  a.id,
  a.title,
  a.summary_executive,
  a.summary_snippet,
  a.primary_subject,
  a.topic_category,
  a.source_country,
  a.published_at,
  a.collected_at,
  a.labse_embedding,
  s.name        AS source_name,
  s.source_tier,
  a.extraction_version,
  a.substrate_processed_at,
  a.language_iso,
  a.article_type
FROM public.articles a
JOIN public.sources s ON s.id = a.source_id
WHERE a.substrate_status         = 'ok'
  AND a.extraction_version       = 3
  AND a.substrate_processed_at   > '2026-05-27 16:00:00+00'
  AND a.article_type             IN ('news', 'analysis', 'opinion', 'explainer', 'interview')
  AND a.collected_at             <= analytics.now_sim()
  AND NOT EXISTS (
    SELECT 1 FROM analytics.articles_to_dedup atd
     WHERE atd.duplicate_id = a.id
  );

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) Pool size — expected to shrink from ~47K to ~40K at full sim_now:
--    SELECT analytics.reset_clock('2026-05-28 23:59:00+00');
--    SELECT COUNT(*) FROM analytics.worldwide_candidates;
--
-- 2) Spot-check a known duplicate cluster is reduced to one canonical:
--    SELECT COUNT(*) FROM analytics.worldwide_candidates
--     WHERE primary_subject ILIKE '%Sarma%Assam%Chief Minister%';
--    -- Should be much smaller than the original 35.

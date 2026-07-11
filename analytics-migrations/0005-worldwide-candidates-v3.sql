-- 0005-worldwide-candidates-v3.sql
--
-- Removes the `NOT is_duplicate` filter from analytics.worldwide_candidates.
--
-- WHY:
--   Audit on 2026-05-28 (see docs/audits/is-duplicate-precision-2026-05-28.md)
--   showed ~70% false-positive rate on the substrate's `is_duplicate` flag.
--   Of 21 randomly-classified pairs:
--     - 5 (24%) were true duplicates (mostly cross-country wire syndication)
--     - 1 (5%)  was a near-duplicate (same event, different reporting)
--     - 15 (71%) were unrelated stories paired by the substrate
--   Even at LaBSE cosine = 1.000, false positives appeared (e.g. boxing
--   championship and Rohit Sharma teaser from the same source).
--
--   Net: the filter was excluding 3× more legitimate articles than redundant
--   ones. Removing it.
--
-- WHAT REPLACES IT:
--   An analytics-layer dedup pipeline. Design + threshold calibration
--   tracked in docs/audits/dedup-design-2026-05-28.md. The MVs that will
--   carry it (analytics.near_dup_pairs_mv, analytics.event_clusters_mv)
--   land in migrations 0006+ after the threshold is validated.
--
-- EXPECTED IMPACT:
--   T2 pool: 35,453 → ~38,669 (+9%, the rows wrongly excluded by is_duplicate).

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
  -- DROPPED: NOT a.is_duplicate  (substrate filter unreliable; see audit)
  AND a.collected_at             <= analytics.now_sim();

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) View definition picked up the change (no is_duplicate filter):
--    \d+ analytics.worldwide_candidates
--
-- 2) Smoke test — pool grows from 35,453 → ~38,669 at T2:
--    SELECT analytics.reset_clock('2026-05-28 23:59:00+00');
--    SELECT COUNT(*) FROM analytics.worldwide_candidates;
--
-- 3) Reset clock:
--    SELECT analytics.reset_clock('2026-04-15 00:00:00+00');

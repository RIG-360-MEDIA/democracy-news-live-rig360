-- 0002-worldwide-candidates.sql
--
-- First view scaffold: candidate articles for the Worldwide mode.
--
-- This view is the "contract" between rig-surveillance's public.articles
-- and Rig Wire's Worldwide code. Worldwide reads from this; if public.*
-- changes, only this view's definition updates — the app code doesn't notice.
--
-- Filters applied:
--   - substrate_status = 'ok'                    (extraction succeeded)
--   - extraction_version = 3                     (Rule 0 — pin version)
--   - substrate_processed_at > '2026-05-27 16:00'  (Rule 0 — post-D1 only)
--   - article_type = 'news'                      (no opinion / live_blog / etc.)
--   - language_iso = 'en'                        (English-only for v1)
--   - NOT is_duplicate
--   - collected_at <= analytics.now_sim()        (THE REPLAY GATE)
--
-- The last filter is the whole trick — articles only appear in this view
-- once the simulated clock has "passed" their collected_at timestamp.

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
  a.substrate_processed_at
FROM public.articles a
JOIN public.sources s ON s.id = a.source_id
WHERE a.substrate_status         = 'ok'
  AND a.extraction_version       = 3
  AND a.substrate_processed_at   > '2026-05-27 16:00:00+00'
  AND a.article_type             = 'news'
  AND a.language_iso             = 'en'
  AND NOT a.is_duplicate
  AND a.collected_at             <= analytics.now_sim();

----------------------------------------------------------------------
-- VERIFICATION — run after applying this file.
----------------------------------------------------------------------
-- 1) View exists:
--    \d analytics.worldwide_candidates
--    -- expect: column list matching the SELECT above
--
-- 2) Count at start-of-replay (sim_now = 2026-04-15):
--    SELECT analytics.reset_clock('2026-04-15 00:00:00+00');
--    SELECT COUNT(*) FROM analytics.worldwide_candidates;
--    -- expect: low / near-zero (most post-D1 articles are May)
--
-- 3) Count at end-of-replay (sim_now = today):
--    SELECT analytics.reset_clock('2026-05-28 12:00:00+00');
--    SELECT COUNT(*) FROM analytics.worldwide_candidates;
--    -- expect: ~40K and growing (full post-D1 set as drain finishes)
--
-- 4) Sanity: row shape:
--    SELECT id, title, source_country, source_tier, collected_at
--      FROM analytics.worldwide_candidates
--     LIMIT 5;
--    -- expect: 5 English news articles with non-null source_country

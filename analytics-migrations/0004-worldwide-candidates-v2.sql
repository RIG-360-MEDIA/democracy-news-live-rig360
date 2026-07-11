-- 0004-worldwide-candidates-v2.sql
--
-- Revises analytics.worldwide_candidates after two upstream/downstream events:
--   1. Rig migration 077 reclassified ~81% of article_type='other' rows
--      into proper types (news, analysis, opinion, explainer). The 'other'
--      bucket dropped from 68% of post-D1 corpus to ~7%, and is now
--      genuinely the ambiguous-fallback set (court notices, viral curiosities).
--   2. Filter audit (see docs/mistakes.md 2026-05-28 entry) — the original
--      0002 filtered to article_type='news' AND language_iso='en', dropping
--      ~85% of legitimate Worldwide candidates including the 22% Telugu and
--      3% Hindi corpus that IS Worldwide's multilingual identity.
--
-- Filter changes:
--   - DROP language_iso = 'en'                  → Worldwide is multilingual
--   - REPLACE article_type = 'news'             → allowlist of journalism types
--     with article_type IN ('news', 'analysis', 'opinion', 'explainer', 'interview')
--   - KEEP everything else (substrate_status, extraction_version,
--     substrate_processed_at, NOT is_duplicate, collected_at <= now_sim())
--
-- Expected impact at T2 = '2026-05-28 23:59': pool grows from ~24K → ~35K.
-- The 2.7K delta vs the denylist alternative is mostly `other` rows
-- we deliberately exclude.

-- NOTE: CREATE OR REPLACE VIEW requires NEW columns to be appended at the
-- end. The two added columns (language_iso, article_type) sit after the
-- original column order from 0002.

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
  -- new columns appended (Postgres restriction)
  a.language_iso,
  a.article_type
FROM public.articles a
JOIN public.sources s ON s.id = a.source_id
WHERE a.substrate_status         = 'ok'
  AND a.extraction_version       = 3
  AND a.substrate_processed_at   > '2026-05-27 16:00:00+00'
  AND a.article_type             IN ('news', 'analysis', 'opinion', 'explainer', 'interview')
  AND NOT a.is_duplicate
  AND a.collected_at             <= analytics.now_sim();

----------------------------------------------------------------------
-- VERIFICATION — run after applying this file.
----------------------------------------------------------------------
-- 1) View definition picked up the changes:
--    \d+ analytics.worldwide_candidates
--    -- expect: new columns (language_iso, article_type), new WHERE clauses
--
-- 2) Smoke test — counts should jump from ~24K → ~35K at T2:
--    SELECT analytics.reset_clock('2026-05-28 23:59:00+00');
--    SELECT COUNT(*) FROM analytics.worldwide_candidates;
--    -- expect: ~35,400
--
-- 3) Sanity — language mix on the new pool:
--    SELECT analytics.reset_clock('2026-05-28 23:59:00+00');
--    SELECT language_iso, COUNT(*)
--      FROM analytics.worldwide_candidates
--     GROUP BY language_iso ORDER BY 2 DESC;
--    -- expect: en ~26K, te ~8K, hi ~700, kn ~100, '' ~30
--
-- 4) Reset clock for next run:
--    SELECT analytics.reset_clock('2026-04-15 00:00:00+00');

-- 0011-dup-overrides.sql
--
-- Editorial override layer + the analytics.articles_to_dedup view that
-- Worldwide (and future All Sides, Newsletter) reads from.
--
-- Why this exists:
--   The dedup algorithm has ~1-2% FP rate at threshold 0.55. Articles
--   wrongly flagged as duplicates must have a recovery path. Editorial
--   inserts a row in analytics.dup_overrides to mark a pair as
--   'not_duplicate' (or 'force_duplicate'). The view respects this.
--
-- Convention:
--   In each pair (a_id, b_id), a_id < b_id (set by 0009's CHECK constraint).
--   The LATER article by collected_at is the "duplicate" (hidden);
--   the EARLIER is the "canonical" (kept).
--
-- The override table doesn't need rows to function — it's queried
-- via NOT EXISTS, so empty table = no overrides applied.

----------------------------------------------------------------------
-- 1. Override table
----------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analytics.dup_overrides (
  a_id        UUID NOT NULL,
  b_id        UUID NOT NULL,
  decision    TEXT NOT NULL CHECK (decision IN ('not_duplicate', 'force_duplicate')),
  editor      TEXT NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dup_overrides_pkey      PRIMARY KEY (a_id, b_id),
  CONSTRAINT dup_overrides_ordering  CHECK (a_id < b_id)
);

CREATE INDEX IF NOT EXISTS dup_overrides_decision_idx
  ON analytics.dup_overrides (decision);

----------------------------------------------------------------------
-- 2. articles_to_dedup view
----------------------------------------------------------------------
-- Returns the set of article IDs to HIDE (i.e., the duplicate side of
-- each confirmed dup pair). Worldwide / All Sides exclude these.
--
-- Logic:
--   - Start with all pair_scores rows where trgm_subject >= threshold
--   - Exclude pairs that have an override 'not_duplicate'
--   - Add pairs that have an override 'force_duplicate' (editorial
--     said yes even though algorithm didn't catch it)
--   - For each remaining pair, return the LATER article (the duplicate)

CREATE OR REPLACE VIEW analytics.articles_to_dedup AS
WITH algo_dups AS (
  -- Algorithm-flagged duplicates above threshold
  SELECT ps.a_id, ps.b_id,
         ps.a_collected_at, ps.b_collected_at
    FROM analytics.pair_scores ps
   WHERE ps.trgm_subject >= 0.55
     AND NOT EXISTS (
       SELECT 1 FROM analytics.dup_overrides o
        WHERE o.a_id = ps.a_id AND o.b_id = ps.b_id
          AND o.decision = 'not_duplicate'
     )
),
forced_dups AS (
  -- Editorial-forced duplicates not in pair_scores
  SELECT o.a_id, o.b_id,
         pa.collected_at AS a_collected_at,
         pb.collected_at AS b_collected_at
    FROM analytics.dup_overrides o
    JOIN public.articles pa ON pa.id = o.a_id
    JOIN public.articles pb ON pb.id = o.b_id
   WHERE o.decision = 'force_duplicate'
     AND NOT EXISTS (
       SELECT 1 FROM analytics.pair_scores ps
        WHERE ps.a_id = o.a_id AND ps.b_id = o.b_id
     )
),
all_dups AS (
  SELECT * FROM algo_dups
  UNION ALL
  SELECT * FROM forced_dups
)
SELECT
  CASE
    WHEN a_collected_at <= b_collected_at THEN b_id   -- b is later → hide
    ELSE a_id                                          -- a is later → hide
  END AS duplicate_id,
  CASE
    WHEN a_collected_at <= b_collected_at THEN a_id   -- a is canonical
    ELSE b_id
  END AS canonical_id
FROM all_dups;

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) Override table exists and is queryable:
--    SELECT COUNT(*) FROM analytics.dup_overrides;
--    -- expect: 0 (empty initially)
--
-- 2) articles_to_dedup view returns rows from pair_scores at threshold:
--    SELECT COUNT(*) FROM analytics.articles_to_dedup;
--    -- expect: ~7,300 (the count of pair_scores rows with trgm >= 0.55)
--
-- 3) Override flow:
--    -- Pick a duplicate pair we want to keep:
--    INSERT INTO analytics.dup_overrides (a_id, b_id, decision, editor, reason)
--    VALUES ('<a_uuid>', '<b_uuid>', 'not_duplicate', 'alice@editorial', 'wrong match');
--    -- Re-query: the duplicate_id from that pair should no longer appear:
--    SELECT * FROM analytics.articles_to_dedup
--     WHERE duplicate_id IN ('<a_uuid>', '<b_uuid>');
--    -- expect: 0 rows

-- 0009-pair-scores.sql
--
-- Production-scale pair-scoring table for dedup pipeline.
--
-- Holds one row per unique (a_id, b_id) article pair where a_id < b_id
-- (canonical ordering — each pair stored once).
--
-- INSERT path generates pairs via LATERAL JOIN on article_signals_mv
-- (top-K nearest neighbours by primary_subject trigram, within ±5 days,
-- same language). Multiple seeds finding the same pair → ON CONFLICT
-- DO NOTHING (idempotent).
--
-- Signal columns populated by separate UPDATE passes — keeps each
-- pass independently retryable and parallelisable.
--
-- Algo version is recorded so re-tunings (new weights, new prompts
-- upstream) can coexist with old data.

CREATE TABLE IF NOT EXISTS analytics.pair_scores (
  -- canonical pair identity (a_id < b_id always)
  a_id                UUID NOT NULL,
  b_id                UUID NOT NULL,

  -- text-based signals
  trgm_subject        NUMERIC(4,3) NOT NULL,
  trgm_title          NUMERIC(4,3),

  -- structured signals (populated by UPDATE passes)
  shared_actors       INT     NOT NULL DEFAULT 0,
  shared_speakers     INT     NOT NULL DEFAULT 0,
  shared_locations    INT     NOT NULL DEFAULT 0,
  shared_primary_loc  BOOLEAN NOT NULL DEFAULT FALSE,
  idf_loc_score       NUMERIC(6,3) NOT NULL DEFAULT 0,
  canonical_url_match BOOLEAN NOT NULL DEFAULT FALSE,
  event_date_match    BOOLEAN NOT NULL DEFAULT FALSE,
  length_ratio        NUMERIC(5,1),

  -- meta
  time_diff_hours     NUMERIC(7,1) NOT NULL,
  a_language          TEXT,
  b_language          TEXT,
  a_source_id         UUID,
  b_source_id         UUID,
  a_collected_at      TIMESTAMPTZ NOT NULL,
  b_collected_at      TIMESTAMPTZ NOT NULL,

  -- derived flags
  same_source   BOOLEAN GENERATED ALWAYS AS (a_source_id   = b_source_id  ) STORED,
  same_language BOOLEAN GENERATED ALWAYS AS (a_language    = b_language   ) STORED,

  -- versioning + provenance
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  algo_version TEXT NOT NULL DEFAULT 'v4-2026-05-29',

  CONSTRAINT pair_scores_pkey       PRIMARY KEY (a_id, b_id),
  CONSTRAINT pair_scores_ordering   CHECK (a_id < b_id)
);

CREATE INDEX IF NOT EXISTS pair_scores_a_idx       ON analytics.pair_scores (a_id);
CREATE INDEX IF NOT EXISTS pair_scores_b_idx       ON analytics.pair_scores (b_id);
CREATE INDEX IF NOT EXISTS pair_scores_trgm_idx    ON analytics.pair_scores (trgm_subject DESC);
CREATE INDEX IF NOT EXISTS pair_scores_same_src_idx
  ON analytics.pair_scores (same_source, trgm_subject DESC)
  WHERE same_source IS TRUE;

-- Watermark for incremental refresh (single-row table tracking the last
-- collected_at we've fully scored from). Future job advances this as it
-- processes newly-arrived articles.
CREATE TABLE IF NOT EXISTS analytics.pair_scores_watermark (
  id INT PRIMARY KEY DEFAULT 1,
  last_processed_collected_at TIMESTAMPTZ,
  total_pairs INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO analytics.pair_scores_watermark (id, last_processed_collected_at)
VALUES (1, '1970-01-01'::TIMESTAMPTZ)
ON CONFLICT (id) DO NOTHING;

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) Table exists, empty initially:
--    SELECT COUNT(*) FROM analytics.pair_scores;
--
-- 2) Indexes present:
--    \d analytics.pair_scores
--
-- 3) Watermark row exists:
--    SELECT * FROM analytics.pair_scores_watermark;

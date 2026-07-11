-- 0006-pgtrgm-extension.sql
--
-- Idempotent: pg_trgm is already installed in the rig-postgres container
-- (verified 2026-05-28). This migration records the dependency so any
-- future fresh DB knows we rely on it.
--
-- Used by: analytics.article_signals_mv (GIN trigram index on
-- primary_subject) and downstream pair-scoring logic.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verification:
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';
--   -- expect: pg_trgm | <some version>
-- SELECT similarity('chief minister of assam', 'assam chief minister');
--   -- expect: ~0.4+

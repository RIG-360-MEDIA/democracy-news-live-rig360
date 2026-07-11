-- 0003-verification-smoke.sql
--
-- Smoke test for the replay harness — three checkpoints.
-- This file is RUN, not APPLIED — it doesn't define schema.
--
-- Run AFTER 0001 (replay-clock) and 0002 (worldwide-candidates).
-- Compare the output of each checkpoint to its expected value.
--
-- PASS condition: T0_count < T1_count < T2_count (strictly monotonic).
--
-- FAIL conditions (and what each tells you):
--   T0 ≈ T2  → the `collected_at <= analytics.now_sim()` gate isn't applied
--              (check 0002's WHERE clause).
--   T2 < expected ~40K → post-D1 filter too strict (check substrate_processed_at threshold).
--   T0 > T1  → impossible; you have a clock-going-backwards bug.

\echo '=========================================='
\echo '   REPLAY HARNESS SMOKE TEST'
\echo '=========================================='

-- ---------------- T0: 2026-04-15 ----------------
\echo ''
\echo '--- T0: April 15 (expect near-zero) ---'
SELECT analytics.reset_clock('2026-04-15 00:00:00+00') AS sim_now;
SELECT 'T0' AS checkpoint,
       COUNT(*) AS visible_articles,
       MIN(collected_at) AS earliest,
       MAX(collected_at) AS latest
  FROM analytics.worldwide_candidates;

-- ---------------- T1: 2026-05-15 ----------------
\echo ''
\echo '--- T1: May 15 (expect partial count) ---'
SELECT analytics.reset_clock('2026-05-15 00:00:00+00') AS sim_now;
SELECT 'T1' AS checkpoint,
       COUNT(*) AS visible_articles,
       MIN(collected_at) AS earliest,
       MAX(collected_at) AS latest
  FROM analytics.worldwide_candidates;

-- ---------------- T2: 2026-05-28 ----------------
\echo ''
\echo '--- T2: May 28 (expect ~40K, growing as drain completes) ---'
SELECT analytics.reset_clock('2026-05-28 12:00:00+00') AS sim_now;
SELECT 'T2' AS checkpoint,
       COUNT(*) AS visible_articles,
       MIN(collected_at) AS earliest,
       MAX(collected_at) AS latest
  FROM analytics.worldwide_candidates;

-- ---------------- Reset to start ----------------
\echo ''
\echo '--- Resetting clock to 2026-04-15 for next run ---'
SELECT analytics.reset_clock('2026-04-15 00:00:00+00') AS sim_now;

\echo ''
\echo '=========================================='
\echo '   PASS if T0 < T1 < T2 (strictly).'
\echo '   FAIL if T0 ≈ T2 — gate not applied.'
\echo '=========================================='

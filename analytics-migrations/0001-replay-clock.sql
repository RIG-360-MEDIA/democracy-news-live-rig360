-- 0001-replay-clock.sql
--
-- Replay testing: simulated time. The harness lets us test our system
-- against the "articles arriving continuously" pattern using the existing
-- frozen snapshot — before scrapers turn back on.
--
-- ONE row in analytics.replay_clock holds the current simulated time.
-- analytics.now_sim()       reads it.
-- analytics.tick(minutes)    advances it.
-- analytics.reset_clock(ts)  jumps to a specific timestamp.
--
-- Every Rig Wire view that's time-sensitive uses analytics.now_sim()
-- where it would otherwise use NOW().

CREATE TABLE IF NOT EXISTS analytics.replay_clock (
  id         INT         PRIMARY KEY DEFAULT 1,
  sim_now    TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)                         -- singleton — only one row ever
);

-- Seed: one month before the post-D1 boundary (2026-05-27 16:00 UTC).
-- This means T0 in the smoke test shows ~0 visible articles, and
-- ticking forward to 2026-05-28+ surfaces the full post-D1 set.
INSERT INTO analytics.replay_clock (id, sim_now)
VALUES (1, '2026-04-15 00:00:00+00')
ON CONFLICT (id) DO NOTHING;

-- Read simulated time. STABLE so PostgreSQL caches it within a query.
CREATE OR REPLACE FUNCTION analytics.now_sim()
RETURNS TIMESTAMPTZ
LANGUAGE SQL STABLE AS $$
  SELECT sim_now FROM analytics.replay_clock WHERE id = 1
$$;

-- Advance the simulated clock by N minutes. Returns the new value.
CREATE OR REPLACE FUNCTION analytics.tick(minutes INT)
RETURNS TIMESTAMPTZ
LANGUAGE SQL AS $$
  UPDATE analytics.replay_clock
     SET sim_now    = sim_now + (minutes::TEXT || ' minutes')::INTERVAL,
         updated_at = NOW()
   WHERE id = 1
  RETURNING sim_now
$$;

-- Jump the simulated clock to a specific timestamp.
-- Used for smoke tests and for resetting the harness between runs.
CREATE OR REPLACE FUNCTION analytics.reset_clock(target TIMESTAMPTZ)
RETURNS TIMESTAMPTZ
LANGUAGE SQL AS $$
  UPDATE analytics.replay_clock
     SET sim_now    = target,
         updated_at = NOW()
   WHERE id = 1
  RETURNING sim_now
$$;

----------------------------------------------------------------------
-- VERIFICATION — run after applying this file.
----------------------------------------------------------------------
-- 1) Table exists and seeded:
--    SELECT * FROM analytics.replay_clock;
--    -- expect: one row, sim_now = '2026-04-15 00:00:00+00'
--
-- 2) Read function works:
--    SELECT analytics.now_sim();
--    -- expect: '2026-04-15 00:00:00+00'
--
-- 3) Tick advances correctly:
--    SELECT analytics.tick(60);
--    -- expect: '2026-04-15 01:00:00+00'
--    SELECT analytics.tick(-60);
--    -- expect: '2026-04-15 00:00:00+00' (negative tick = rewind)
--
-- 4) Reset jumps directly:
--    SELECT analytics.reset_clock('2026-05-28 12:00:00+00');
--    -- expect: '2026-05-28 12:00:00+00'
--    SELECT analytics.reset_clock('2026-04-15 00:00:00+00');
--    -- expect: back to start, ready for smoke test

# Replay Harness — make a frozen database behave like live data for testing

**Copy this entire file into the new chat as your first message.**

## The problem

You have a database snapshot — articles, events, whatever — that's currently frozen because the upstream scrapers / ingestion pipeline are offline. You're building a product on top of this data. When ingestion turns back on, articles will arrive **continuously** (e.g., one every 30-60 seconds), and your queries / materialised views / refresh jobs will need to handle that flow correctly.

**Static query testing misses every timing bug.** Things like:

- An article arrives at 06:31 but your MV refreshes at 06:30 — does it appear today or tomorrow?
- Two articles about the same event arrive 30 minutes apart — does your clustering merge them, or treat them as separate?
- An editor pulls a story at 09:00 and a related new article lands at 09:30 — does the override carry?
- A vector index goes stale 15 minutes after the last batch arrived — when do you rebuild?

These bugs only show up when **time is moving**. The frozen DB lets you simulate it.

## The pattern in plain words

Pick a date in the past — say 30 days before the most recent article. Tell the system "right now, in your simulated world, it is *that* date." Every article in the DB has a `collected_at` timestamp; the system pretends each article appears at the moment its timestamp says it did. Then tick the simulated clock forward — say 15 simulated minutes per 1 wall-clock minute. Articles "arrive" at their natural rate, in their natural order. Every time-sensitive query sees the world as it would have been mid-flow.

Like a flight simulator. You don't wait for a real storm to train pilots — you simulate the storm at a desk.

## The SQL building blocks

Five minimal pieces. Adapt to your schema.

### 1. The clock table (a tiny singleton)

```sql
CREATE TABLE analytics.replay_clock (
  id         INT         PRIMARY KEY DEFAULT 1,
  sim_now    TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (id = 1)
);

INSERT INTO analytics.replay_clock (id, sim_now)
VALUES (1, '<a date before your earliest article>')
ON CONFLICT (id) DO NOTHING;
```

One row. One column that matters (`sim_now`). The CHECK constraint enforces singleton.

### 2. Read the simulated time

```sql
CREATE OR REPLACE FUNCTION analytics.now_sim()
RETURNS TIMESTAMPTZ
LANGUAGE SQL STABLE AS $$
  SELECT sim_now FROM analytics.replay_clock WHERE id = 1
$$;
```

`STABLE` so Postgres caches it within a single query.

### 3. Advance the clock by N minutes

```sql
CREATE OR REPLACE FUNCTION analytics.tick(minutes INT)
RETURNS TIMESTAMPTZ LANGUAGE SQL AS $$
  UPDATE analytics.replay_clock
     SET sim_now    = sim_now + (minutes::TEXT || ' minutes')::INTERVAL,
         updated_at = NOW()
   WHERE id = 1
  RETURNING sim_now
$$;
```

### 4. Reset to a specific moment (useful for testing)

```sql
CREATE OR REPLACE FUNCTION analytics.reset_clock(target TIMESTAMPTZ)
RETURNS TIMESTAMPTZ LANGUAGE SQL AS $$
  UPDATE analytics.replay_clock
     SET sim_now    = target,
         updated_at = NOW()
   WHERE id = 1
  RETURNING sim_now
$$;
```

### 5. Gate every time-sensitive view by the simulated clock

This is the whole trick. Every view that would normally use `NOW()` for time windows uses `analytics.now_sim()` instead:

```sql
CREATE VIEW analytics.candidates AS
SELECT ...
FROM public.articles
WHERE substrate_status = 'ok'
  AND collected_at <= analytics.now_sim()   -- THE REPLAY GATE
  AND collected_at >  analytics.now_sim() - INTERVAL '24 hours';
```

**One line of substitution, system-wide.** When `sim_now` = '2026-04-15', this view only shows articles with `collected_at <= '2026-04-15'`. Move sim_now forward, more articles appear automatically.

## How to drive the replay

A small loop. Pseudocode (TypeScript or Python):

```ts
for (let i = 0; i < n_ticks; i++) {
  await db.query(`SELECT analytics.tick(15)`);  // advance 15 sim-minutes
  // Optional: REFRESH MATERIALIZED VIEW analytics.your_view
  await sleep(60_000);  // wait one wall-clock minute
}
```

Run it as a CLI tool. While it runs:
- Your app sees articles appearing in their natural order at compressed time
- Your MV refresh jobs fire at their normal times in sim-time
- Time-sensitive bugs surface

## The validation pattern (three-checkpoint smoke test)

After applying the harness, run this to confirm the gate works:

```sql
-- T0: rewind to before any articles
SELECT analytics.reset_clock('<early date>');
SELECT 'T0' AS t, COUNT(*) FROM analytics.candidates;
-- expect: 0 or very low

-- T1: middle of the corpus
SELECT analytics.reset_clock('<midpoint date>');
SELECT 'T1', COUNT(*) FROM analytics.candidates;
-- expect: ~half the eventual count

-- T2: most recent
SELECT analytics.reset_clock('<today>');
SELECT 'T2', COUNT(*) FROM analytics.candidates;
-- expect: full count

-- reset
SELECT analytics.reset_clock('<early date>');
```

**Pass condition:** T0 < T1 < T2 strictly monotonic.
**Fail condition:** T0 ≈ T2 means the gate isn't being applied — check your view's WHERE clause.

## Production considerations

- **The gate is opt-in per view.** Views without `analytics.now_sim()` ignore the replay — that's intentional, lets you run regression queries unaffected by sim time.
- **Materialised views need refresh.** A MV computed before you ticked the clock won't update automatically. Either rebuild your MV inside the replay loop, OR use plain views so they always recompute from `now_sim()`.
- **One Postgres connection, one sim time.** All sessions see the same `sim_now` because it's a real DB row. If you need parallel replays, run them against separate schemas.
- **Reset between test runs.** Always `reset_clock(early_date)` before a fresh replay run so state is deterministic.

## Common pitfalls

1. **Embedding-based filters miss the boilerplate problem.** If you use ANN-based candidate generation and your data has same-source articles sharing boilerplate, you'll get spurious matches. Replay won't catch this — that's a model bug, not a timing bug.
2. **Old MVs become stale.** A materialised view created before the harness was added doesn't know about `now_sim()`. Drop and recreate it with the gate.
3. **Joins to unrelated tables don't get gated automatically.** If you join `articles` to `events`, both sides need filtering by `now_sim()` if both have time-sensitive content.
4. **The clock isn't atomic across multiple ticks.** If you tick rapidly and queries fire in parallel, they may see different `sim_now` values. Not usually a problem for testing, but mention it if exact timing matters.

## Fidelity gaps you accept

- **Pre-computed columns are present from t=0.** If your DB has LaBSE embeddings or pre-extracted SPO claims on all articles, they exist in the replay even before their `substrate_processed_at` would have computed them. To simulate this gap, gate those columns too: `WHERE substrate_processed_at <= analytics.now_sim()`.
- **No upstream pressure simulation.** Real ingestion has rate limits and back-pressure. Replay assumes infinite throughput.

## When NOT to use replay

- For pure data-quality checks on a fixed snapshot (no time-flow involved).
- For backfills that need to run faster than wall-clock (just use the data directly).
- For testing breaking-news pipeline behaviour that depends on a specific real event happening — that needs real-time data.

## Why this pattern is portable

It's just three SQL objects (table, two functions) and a discipline of using `analytics.now_sim()` instead of `NOW()` in time-sensitive views. Works on any Postgres. No external dependencies. Tested at ~50K-article scale in our setup; should scale linearly because every additional article is just one extra `collected_at <= now_sim()` check.

The total infrastructure: about 50 lines of SQL + 50 lines of runner code. One day to implement, one day to validate.

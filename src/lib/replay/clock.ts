// src/lib/replay/clock.ts
//
// TypeScript helpers around the analytics.replay_clock SQL functions.
// These call the functions defined in analytics-migrations/0001-replay-clock.sql.
//
// Used by:
//   - tools/scripts/replay.ts (the CLI runner)
//   - any future admin route at /api/_admin/replay/*
//   - test setup for golden tests

import { sql } from '@/lib/db';

/** Read the current simulated time. */
export async function nowSim(): Promise<Date> {
  const [row] = await sql<{ now_sim: Date }[]>`
    SELECT analytics.now_sim() AS now_sim
  `;
  return row.now_sim;
}

/** Advance the simulated clock by N minutes. Returns the new value.
 *  Negative N rewinds.
 */
export async function tick(minutes: number): Promise<Date> {
  const [row] = await sql<{ tick: Date }[]>`
    SELECT analytics.tick(${minutes}) AS tick
  `;
  return row.tick;
}

/** Jump the simulated clock to a specific timestamp.
 *  Used for resetting between replay runs or for spot-checks.
 */
export async function resetClock(target: Date): Promise<Date> {
  const [row] = await sql<{ reset_clock: Date }[]>`
    SELECT analytics.reset_clock(${target}) AS reset_clock
  `;
  return row.reset_clock;
}

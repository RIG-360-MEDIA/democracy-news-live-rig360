// src/lib/replay/runner.ts
//
// The replay loop. Advances the simulated clock at a configurable rate.
// Pure logic — no DB connection of its own, no CLI parsing. The
// CLI wrapper in tools/scripts/replay.ts handles those.
//
// Conceptual model:
//   - Every `tickIntervalMs` of wall-clock time, advance the simulated
//     clock by `simMinutesPerTick`.
//   - After each advance, call the optional `onTick` callback (used by
//     the CLI to log, refresh MVs, run assertions, etc.).
//
// Example invocations:
//   runReplay({ simMinutesPerTick: 60,  tickIntervalMs: 60_000, ticks: 24  })
//     → 24 hours of wall-clock, 1 sim-day total (60×24 = 1440 sim-min)
//
//   runReplay({ simMinutesPerTick: 15,  tickIntervalMs: 60_000, ticks: 1440 })
//     → 24 hours of wall-clock, 15 sim-days total

import { tick } from './clock';

export interface ReplayOptions {
  /** How many simulated minutes to advance per tick. */
  simMinutesPerTick: number;
  /** Wall-clock delay between ticks (ms). */
  tickIntervalMs: number;
  /** Total number of ticks to run. */
  ticks: number;
  /** Optional callback after each tick. */
  onTick?: (simNow: Date, tickNumber: number) => Promise<void> | void;
  /** Optional abort signal — replay stops cleanly on next iteration. */
  signal?: AbortSignal;
}

export async function runReplay(opts: ReplayOptions): Promise<void> {
  const { simMinutesPerTick, tickIntervalMs, ticks, onTick, signal } = opts;

  for (let i = 0; i < ticks; i++) {
    if (signal?.aborted) {
      console.log(`[replay] aborted at tick ${i}/${ticks}`);
      return;
    }

    const simNow = await tick(simMinutesPerTick);
    if (onTick) await onTick(simNow, i + 1);

    // Don't sleep after the final tick.
    if (i < ticks - 1) {
      await sleep(tickIntervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

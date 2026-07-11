// tools/scripts/replay.ts
//
// CLI entry point for the replay harness.
//
// Usage:
//   npx tsx tools/scripts/replay.ts [sim-min-per-tick] [tick-interval-sec] [ticks]
//
// Defaults:
//   sim-min-per-tick   15    (advance 15 sim-minutes per tick)
//   tick-interval-sec  60    (one wall-clock minute between ticks)
//   ticks              1440  (24 hours of wall-clock → 15 sim-days)
//
// Examples:
//   # Fast smoke run — 1 hour of wall-clock, 6 sim-days
//   npx tsx tools/scripts/replay.ts 60 60 24
//
//   # Slow precision run for boundary bugs — 1 sim-min per wall-min, 1 hour
//   npx tsx tools/scripts/replay.ts 1 60 60
//
// Setup before running:
//   1. SSH tunnel open to Hetzner:
//        ssh -i ~/.ssh/rig_hetzner -L 5433:rig-postgres:5432 root@<RIG_BOX_IP> -N
//   2. ANALYTICS_DB_URL set (e.g. in .env.local, gitignored):
//        ANALYTICS_DB_URL=postgresql://analytics_user:PASSWORD@localhost:5433/rig
//   3. Migrations 0001 and 0002 applied (see analytics-migrations/README.md).

import { runReplay } from '@/lib/replay/runner';
import { nowSim, resetClock } from '@/lib/replay/clock';

async function main() {
  const args = process.argv.slice(2);
  const simMinutesPerTick = Number(args[0]) || 15;
  const tickIntervalSec   = Number(args[1]) || 60;
  const ticks             = Number(args[2]) || 1440;

  const totalWallMin = (ticks * tickIntervalSec) / 60;
  const totalSimHr   = (ticks * simMinutesPerTick) / 60;

  console.log('[replay] configuration');
  console.log(`  sim-minutes per tick: ${simMinutesPerTick}`);
  console.log(`  wall-clock per tick:  ${tickIntervalSec}s`);
  console.log(`  total ticks:          ${ticks}`);
  console.log(`  total wall-clock:     ${totalWallMin.toFixed(0)} min`);
  console.log(`  total sim-time:       ${totalSimHr.toFixed(1)}h`);
  console.log('');

  // Allow Ctrl-C to stop cleanly.
  const controller = new AbortController();
  process.on('SIGINT', () => {
    console.log('\n[replay] SIGINT received, finishing current tick then exiting');
    controller.abort();
  });

  const startSim = await nowSim();
  console.log(`[replay] starting sim_now: ${startSim.toISOString()}`);
  console.log('');

  await runReplay({
    simMinutesPerTick,
    tickIntervalMs: tickIntervalSec * 1000,
    ticks,
    signal: controller.signal,
    onTick: (simNow, tickNumber) => {
      console.log(`[tick ${tickNumber}/${ticks}] sim_now → ${simNow.toISOString()}`);
    },
  });

  const endSim = await nowSim();
  console.log('');
  console.log(`[replay] done. final sim_now: ${endSim.toISOString()}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[replay] fatal:', err);
  process.exit(1);
});

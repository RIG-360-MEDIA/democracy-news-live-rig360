// Max tolerated clock skew for a source's publish time; later = a future-dated feed row (seen up to ~76 h ahead).
const FUTURE_SKEW_MS = 10 * 60 * 1000;

/**
 * The time a story's "X ago" label (and the "Latest first" rail order) is based on: the story's NEWEST SOURCE
 * ARTICLE — when the news last moved. It used to be the clustering run_id, i.e. when the cluster was first
 * formed or re-clustered, which showed "8 h ago" on stories still developing and hid fresh ones.
 * A future-dated last_seen (bad feed timestamp) would read "just now" forever, so it falls back to the run time.
 */
export function displayedTimeMs(lastSeenMs: number, runId: string | number | null, now: number): number {
  if (Number.isFinite(lastSeenMs) && lastSeenMs <= now + FUTURE_SKEW_MS) return Math.min(lastSeenMs, now);
  const run = Number(runId);
  return run > 1_000_000_000 && run < 20_000_000_000 ? Math.min(run * 1000, now) : now;
}

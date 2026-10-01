// Watch rail recency gate (E6). The rail must never show a clip older than WATCH_MAX_AGE_DAYS:
// a months-old bulletin under "Watch" reads as a stale front page. Pure so it is unit-testable and
// runs once on the server — the client never re-evaluates "now", so there is no hydration drift.

export const WATCH_MAX_AGE_DAYS = 30;

const DAY_MS = 86_400_000;

/**
 * Keep only clips published within the last `maxAgeDays` (inclusive), preserving editorial order.
 * Defensive: a missing/unparseable date, or one in the future, is dropped rather than shown.
 */
export function recentVideos<T extends { publishedAt: string }>(
  list: readonly T[],
  nowMs: number,
  maxAgeDays: number = WATCH_MAX_AGE_DAYS,
): T[] {
  const oldest = nowMs - maxAgeDays * DAY_MS;
  return list.filter((v) => {
    const at = Date.parse(v.publishedAt);
    return Number.isFinite(at) && at >= oldest && at <= nowMs;
  });
}

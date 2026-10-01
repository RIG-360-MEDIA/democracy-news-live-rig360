import { describe, expect, it } from 'vitest';

import { displayedTimeMs } from '@/lib/worldwide/displayed-time';

const NOW = Date.UTC(2026, 9, 1, 7, 30);
const H = 3_600_000;

describe('displayedTimeMs — the "X ago" label', () => {
  it('uses the newest source article, not the clustering run', () => {
    const lastSeen = NOW - 0.5 * H; // news moved 30 min ago
    const runId = Math.floor((NOW - 10 * H) / 1000); // cluster formed 10 h ago
    expect(displayedTimeMs(lastSeen, runId, NOW)).toBe(lastSeen);
  });

  it('a future-dated source row falls back to the run time instead of "just now" forever', () => {
    const runId = Math.floor((NOW - 2 * H) / 1000);
    expect(displayedTimeMs(NOW + 76 * H, runId, NOW)).toBe(runId * 1000);
  });

  it('tolerates small clock skew', () => {
    expect(displayedTimeMs(NOW + 60_000, null, NOW)).toBe(NOW);
  });

  it('never returns a time in the future, even with garbage inputs', () => {
    expect(displayedTimeMs(Number.NaN, 'garbage', NOW)).toBe(NOW);
    expect(displayedTimeMs(NOW + 76 * H, Math.floor((NOW + H) / 1000), NOW)).toBe(NOW);
  });
});

// Hold-and-release buffer for machine-generated stories.
//
// Shared by BOTH the reader ranking (src/lib/worldwide/ranking.ts) and the Studio desk
// (src/lib/studio/feed.ts), so the front page and the CMS agree on one window.
//
// A freshly generated machine story sits for BUFFER_MINUTES before it auto-appears on the
// reader site — the desk sees it in "Next Up" with a live countdown and can Hold it (never
// appears) or Publish now (appears immediately). Do nothing and it releases automatically
// once the window elapses. Editor force-surfaced (Published/Pinned) and manual/Door B
// stories bypass this entirely.

export const BUFFER_MINUTES = 15;

const BUFFER_MS = BUFFER_MINUTES * 60 * 1000;

function toMs(generatedAt: Date | string): number {
  return generatedAt instanceof Date ? generatedAt.getTime() : new Date(generatedAt).getTime();
}

/** Milliseconds until the story leaves the hold window; 0 once the window has elapsed. */
export function bufferMsRemaining(generatedAt: Date | string): number {
  const gen = toMs(generatedAt);
  if (Number.isNaN(gen)) return 0; // unparseable timestamp → treat as already released
  return Math.max(0, gen + BUFFER_MS - Date.now());
}

/** True once a story is at least BUFFER_MINUTES old (past the hold window). */
export function isPastBuffer(generatedAt: Date | string): boolean {
  return bufferMsRemaining(generatedAt) === 0;
}

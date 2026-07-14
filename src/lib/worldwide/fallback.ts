// DNL-branded fallback thumbnails. Shown ONLY when a story has no real image, or its real image
// fails to load — never in place of a usable photo. Three variants; pick is stable per seed so the
// same story always shows the same card and the three spread across the page.
export const FALLBACKS = ['/cards/fallback-1.png', '/cards/fallback-2.png', '/cards/fallback-3.png'] as const;

export function pickFallback(seed?: string | null): string {
  if (!seed) return FALLBACKS[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return FALLBACKS[h % FALLBACKS.length];
}

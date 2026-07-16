// Editorial CMS — shared timestamp formatting for story cards.

/**
 * Compact, deterministic UTC stamp for CMS cards, e.g. "16 Jul, 19:13 UTC".
 *
 * Formatted in UTC on purpose: these desks render server-side (Vercel runs in
 * UTC) and then hydrate on the client, so a local-timezone format would produce
 * different server/client text and trip a React hydration mismatch. The
 * generation pipeline is all UTC, so this is also the least ambiguous choice.
 */
export function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return (
    d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    }) + ' UTC'
  );
}

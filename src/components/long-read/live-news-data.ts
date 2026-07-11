/* ═════════════════════════════════════════════════════════════════
   LIVE NEWS — short breaking-news ticker entries.
   The rail cycles through these every few seconds, animating new
   items in at the top and pushing older ones down.
═════════════════════════════════════════════════════════════════ */

export interface LiveNewsItem {
  id:       string;
  category: string;
  title:    string;
  /* Optional one-line context shown below the headline */
  deck?:    string;
  /* If true, item shows a red BREAKING tag instead of the category */
  breaking?: boolean;
}

export const LIVE_NEWS: LiveNewsItem[] = [
  { id: 'ln-1',  category: 'POLITICS', breaking: true,  title: 'Senate rejects $89B defense supplemental in surprise procedural vote',
    deck: 'Five Republicans cross to vote with Democrats. Bill returns to committee.' },
  { id: 'ln-2',  category: 'MARKETS',  title: 'Federal Reserve holds rates steady, signals June rate cut likely',
    deck: 'Powell cites cooling labour market, dampening services inflation.' },
  { id: 'ln-3',  category: 'WEATHER',  breaking: true,  title: 'Tornado warning expanded for central Oklahoma; ten counties affected' },
  { id: 'ln-4',  category: 'TECHNOLOGY', title: 'Apple confirms 14:00 ET event today; details under embargo until launch' },
  { id: 'ln-5',  category: 'BUSINESS', title: 'TSMC begins commercial production at second Arizona fab — six months ahead of schedule' },
  { id: 'ln-6',  category: 'MARKETS',  title: 'Indian rupee touches 86.21 against the dollar, fresh all-time low' },
  { id: 'ln-7',  category: 'WORLD',    title: 'ECB minutes show three-way split on July rate decision' },
  { id: 'ln-8',  category: 'AVIATION', breaking: true,  title: 'Boeing 737 MAX grounded at Dallas after engine-warning incident; no injuries reported' },
  { id: 'ln-9',  category: 'POLITICS', title: 'DOJ files antitrust complaint against Spotify over podcast-distribution practices' },
  { id: 'ln-10', category: 'WORLD',    breaking: true,  title: 'Nepal: 5.8-magnitude earthquake near Kathmandu; no immediate damage reports' },
  { id: 'ln-11', category: 'BUSINESS', title: 'Tesla halts production at Berlin gigafactory after component-supply disruption' },
  { id: 'ln-12', category: 'TECHNOLOGY', title: 'Microsoft confirms $4.2 billion acquisition of European defense-AI firm Helsing' },
  { id: 'ln-13', category: 'WORLD',    breaking: true,  title: 'NATO emergency meeting called for Tuesday following Ukraine border incident' },
  { id: 'ln-14', category: 'POLITICS', title: 'US visa appointments suspended at Beijing embassy through end of month' },
  { id: 'ln-15', category: 'MARKETS',  title: 'S&P 500 closes at fresh record high after softer-than-expected April CPI print' },
  { id: 'ln-16', category: 'HEALTH',   title: 'WHO declares mpox no longer a public-health emergency of international concern' },
  { id: 'ln-17', category: 'WORLD',    title: 'Argentine peso devaluation surprises markets; central bank intervenes within hours' },
  { id: 'ln-18', category: 'TECHNOLOGY', breaking: true, title: 'Cloudflare confirms major DNS outage; downstream services degraded globally' },
  { id: 'ln-19', category: 'DEFENSE',  title: 'Saudi naval forces intercept Yemen-bound weapons shipment in Red Sea' },
  { id: 'ln-20', category: 'BUSINESS', title: 'Adani Group denies SEBI report; shares close down 4.2% in Mumbai' },
];

/* Convert a position offset to a human-readable timestamp. */
export function timestampForOffset(i: number): string {
  if (i === 0) return 'JUST NOW';
  if (i === 1) return '2 MIN AGO';
  if (i === 2) return '5 MIN AGO';
  if (i === 3) return '11 MIN AGO';
  if (i === 4) return '18 MIN AGO';
  if (i === 5) return '27 MIN AGO';
  return `${30 + (i - 5) * 8} MIN AGO`;
}

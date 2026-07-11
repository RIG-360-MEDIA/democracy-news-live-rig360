/* ═════════════════════════════════════════════════════════════════
   THE QUEUE — audio queue data. Mix of news briefs, long-read
   readings, interviews, daily briefings, and opinion essays.
═════════════════════════════════════════════════════════════════ */

export type QueueCategory =
  | 'NEWS BRIEF'
  | 'LONG READ'
  | 'INTERVIEW'
  | 'DAILY BRIEFING'
  | 'MARKETS'
  | 'WORLD'
  | 'OPINION'
  | 'CULTURE'
  | 'INVESTIGATION';

export interface QueueItem {
  id:          string;
  title:       string;
  source:      string;        /* e.g. "Reuters audio digest" */
  narrator:    string;        /* "Narrated by Maya Krishnan" or "AI voice" */
  category:    QueueCategory;
  duration:    string;        /* "3:42" */
  durationSec: number;        /* numeric for math */
  coverHue:    string;        /* background color of the cover plate */
  coverLabel:  string;        /* big initial or short word on cover */
  /* When present, browser speech-synthesis reads this aloud on play. */
  transcript?: string;
}

/* Category accent palette (used on covers + category pills) */
export const CATEGORY_COLORS: Record<QueueCategory, string> = {
  'NEWS BRIEF':       '#3b5b8a',
  'LONG READ':        '#4d3a85',
  'INTERVIEW':        '#a86a2e',
  'DAILY BRIEFING':   '#1a1815',
  'MARKETS':          '#1f5d4a',
  'WORLD':            '#2a4a78',
  'OPINION':          '#7a2e5a',
  'CULTURE':          '#8a5a2a',
  'INVESTIGATION':    '#7a1a1a',
};

/* ── 40 queue items ────────────────────────────────────────── */
export const QUEUE: QueueItem[] = [
  { id: 'q1',  title: 'Today’s six things, in five minutes',                                source: 'Rig Wire Daily',         narrator: 'Maya Krishnan',          category: 'DAILY BRIEFING',  duration: '4:48',  durationSec: 288,  coverHue: '#1a1815', coverLabel: 'TODAY',
    transcript: `Good morning. Today is Saturday, May twenty-third. Here are today's six things, in under five minutes.

First. India has overtaken Japan to become the world's third-largest economy. Nominal GDP crossed four-point-five trillion dollars this quarter. The transition was anticipated by IMF projections last year. The drivers: robust manufacturing growth, a record services trade surplus, and the country's population dividend.

Second. A federal judge has ruled that OpenAI infringed New York Times articles during GPT training. Damages exceed one-point-eight billion dollars in actual losses, plus statutory penalties. The decision sets the first major US precedent on training-data liability, and is expected to reshape AI licensing across the industry.

Third. Arctic sea ice has hit its lowest May extent since records began in nineteen-seventy-nine. Satellite data confirms coverage fell to eleven-point-two million square kilometers — eighteen percent below the nineteen-eighty-one to twenty-ten average. Researchers attribute the loss to a persistent marine heatwave in the Barents Sea.

Fourth. The White House has extended H-one-B visa review periods to ninety days. The new executive order cites fraud-screening upgrades. Tech employers warn the change could delay two-hundred-thousand work-authorization renewals this fiscal year.

Fifth. India's Nifty Fifty has closed above twenty-eight thousand for the first time. Foreign institutional investors purchased nine-thousand-two-hundred crore of equities net — the highest single-day inflow this year. Banking, IT, and capital goods led the rally on cooler-than-expected April inflation.

And sixth. SpaceX has confirmed an uncrewed Mars cargo mission for the November launch window. The vehicle will deliver one-hundred tonnes of supplies to Jezero Crater. A successful demonstration is the gating step for a crewed flight, planned for twenty-twenty-eight.

That's today's six things. The full reading of "The slow death of local news" plays next — twenty-four minutes with Maya Krishnan. Press the skip arrow if you'd rather hear something else from your queue. This is The Queue.` },
  { id: 'q2',  title: 'India overtakes Japan as world’s third-largest economy',             source: 'Rig Wire Newsroom',      narrator: 'Anand Pillai (voice)',   category: 'NEWS BRIEF',      duration: '2:18',  durationSec: 138,  coverHue: '#3b5b8a', coverLabel: 'IN' },
  { id: 'q3',  title: 'The slow death of local news — full reading',                             source: 'Rig Wire Long Read',     narrator: 'Maya Krishnan',          category: 'LONG READ',       duration: '24:12', durationSec: 1452, coverHue: '#4d3a85', coverLabel: 'LR' },
  { id: 'q4',  title: 'OpenAI loses the New York Times case — what happens now',                 source: 'Rig Wire Tech Desk',     narrator: 'Sara Liu',               category: 'NEWS BRIEF',      duration: '3:42',  durationSec: 222,  coverHue: '#3b5b8a', coverLabel: 'OAI' },
  { id: 'q5',  title: 'Sandra Pittman on shutting down a 158-year-old newspaper',                source: 'Rig Wire Voices',        narrator: 'Maya Krishnan, host',    category: 'INTERVIEW',       duration: '38:24', durationSec: 2304, coverHue: '#a86a2e', coverLabel: 'INT' },
  { id: 'q6',  title: 'Nifty 50 crosses 28,000 — what FII buying signals',                 source: 'Rig Wire Markets',       narrator: 'Ananya Rao',             category: 'MARKETS',         duration: '5:11',  durationSec: 311,  coverHue: '#1f5d4a', coverLabel: 'MKT' },
  { id: 'q7',  title: 'Arctic sea ice hits lowest May extent on record',                         source: 'Rig Wire Climate',       narrator: 'Henri Dubois',           category: 'NEWS BRIEF',      duration: '2:45',  durationSec: 165,  coverHue: '#3b5b8a', coverLabel: 'ICE' },
  { id: 'q8',  title: 'The European rearmament gamble — a 16-minute deep-dive',             source: 'Rig Wire Long Read',     narrator: 'Klaus Mueller',          category: 'LONG READ',       duration: '16:38', durationSec: 998,  coverHue: '#4d3a85', coverLabel: 'EU' },
  { id: 'q9',  title: 'The case against generative search',                                       source: 'Rig Wire Opinion',       narrator: 'Casey Newton, contributor', category: 'OPINION',     duration: '8:14',  durationSec: 494,  coverHue: '#7a2e5a', coverLabel: 'OP' },
  { id: 'q10', title: 'Inside an Amazon fulfillment centre',                                      source: 'Rig Wire Investigation', narrator: 'Pablo Mendoza',          category: 'INVESTIGATION',   duration: '32:08', durationSec: 1928, coverHue: '#7a1a1a', coverLabel: 'INV' },
  { id: 'q11', title: 'A year inside an Eko Atlantic megaproject',                                source: 'Rig Wire Long Read',     narrator: 'Daniel Okafor',          category: 'LONG READ',       duration: '21:32', durationSec: 1292, coverHue: '#4d3a85', coverLabel: 'EK' },
  { id: 'q12', title: 'SpaceX confirms uncrewed Mars launch in November',                         source: 'Rig Wire Science',       narrator: 'Wei Tan',                category: 'NEWS BRIEF',      duration: '3:18',  durationSec: 198,  coverHue: '#3b5b8a', coverLabel: 'MRS' },
  { id: 'q13', title: 'Senate rejects $89B defense supplemental — what happens next',        source: 'Rig Wire Politics',      narrator: 'Anand Pillai (voice)',   category: 'NEWS BRIEF',      duration: '4:02',  durationSec: 242,  coverHue: '#3b5b8a', coverLabel: 'POL' },
  { id: 'q14', title: 'How Seoul became the world capital of soft power',                         source: 'Rig Wire Culture',       narrator: 'Ji-Hye Park',            category: 'CULTURE',         duration: '18:46', durationSec: 1126, coverHue: '#8a5a2a', coverLabel: 'KR' },
  { id: 'q15', title: 'The OpenAI boardroom crisis, three months later',                          source: 'Rig Wire Long Read',     narrator: 'Sara Liu',               category: 'LONG READ',       duration: '14:22', durationSec: 862,  coverHue: '#4d3a85', coverLabel: 'AI' },
  { id: 'q16', title: 'Elizabeth Green on Press Forward and the philanthropic turn',              source: 'Rig Wire Voices',        narrator: 'Maya Krishnan, host',    category: 'INTERVIEW',       duration: '42:10', durationSec: 2530, coverHue: '#a86a2e', coverLabel: 'EG' },
  { id: 'q17', title: 'NATO calls emergency Article 4 meeting',                                   source: 'Rig Wire World',         narrator: 'Anand Pillai (voice)',   category: 'WORLD',           duration: '3:56',  durationSec: 236,  coverHue: '#2a4a78', coverLabel: 'NTO' },
  { id: 'q18', title: 'Adani Group denies SEBI report — markets respond',                    source: 'Rig Wire Markets',       narrator: 'Vikram Mehta',           category: 'MARKETS',         duration: '4:34',  durationSec: 274,  coverHue: '#1f5d4a', coverLabel: 'ADA' },
  { id: 'q19', title: 'The drone war that didn’t end',                                      source: 'Rig Wire Long Read',     narrator: 'Maryam Hosseini',        category: 'LONG READ',       duration: '19:58', durationSec: 1198, coverHue: '#4d3a85', coverLabel: 'DR' },
  { id: 'q20', title: 'Hawaii Big Island 6.0 — what we know',                                 source: 'Rig Wire World',         narrator: 'Henri Dubois',           category: 'WORLD',           duration: '2:12',  durationSec: 132,  coverHue: '#2a4a78', coverLabel: 'HI' },
  { id: 'q21', title: 'Pratap Bhanu Mehta on India’s Amrit Kaal politics',                  source: 'Rig Wire Opinion',       narrator: 'Pratap Bhanu Mehta',     category: 'OPINION',         duration: '11:28', durationSec: 688,  coverHue: '#7a2e5a', coverLabel: 'IN' },
  { id: 'q22', title: 'Tata’s Gujarat fab ships first 28nm wafers',                          source: 'Rig Wire Business',      narrator: 'Vikram Mehta',           category: 'NEWS BRIEF',      duration: '3:24',  durationSec: 204,  coverHue: '#3b5b8a', coverLabel: 'TAT' },
  { id: 'q23', title: 'The vanishing American shopping mall',                                     source: 'Rig Wire Long Read',     narrator: 'Priya Subramanian',      category: 'LONG READ',       duration: '15:42', durationSec: 942,  coverHue: '#4d3a85', coverLabel: 'ML' },
  { id: 'q24', title: 'Bitcoin breaches $150,000 — the structural read',                    source: 'Rig Wire Markets',       narrator: 'Jordan Klein',           category: 'MARKETS',         duration: '6:18',  durationSec: 378,  coverHue: '#1f5d4a', coverLabel: 'BTC' },
  { id: 'q25', title: 'The IPL’s ten thousand under-15 academies',                          source: 'Rig Wire Sports',        narrator: 'Vikram Mehta',           category: 'CULTURE',         duration: '14:18', durationSec: 858,  coverHue: '#8a5a2a', coverLabel: 'IPL' },
  { id: 'q26', title: 'Taiwan reports 24 PLA warplanes overnight',                                source: 'Rig Wire World',         narrator: 'Anand Pillai (voice)',   category: 'WORLD',           duration: '3:08',  durationSec: 188,  coverHue: '#2a4a78', coverLabel: 'TW' },
  { id: 'q27', title: 'When private equity owns your hospital',                                   source: 'Rig Wire Investigation', narrator: 'Rachel Goldman',         category: 'INVESTIGATION',   duration: '24:52', durationSec: 1492, coverHue: '#7a1a1a', coverLabel: 'PE' },
  { id: 'q28', title: 'Apple’s on-device AI search announcement — explained',            source: 'Rig Wire Tech',          narrator: 'Sara Liu',               category: 'NEWS BRIEF',      duration: '5:42',  durationSec: 342,  coverHue: '#3b5b8a', coverLabel: 'APL' },
  { id: 'q29', title: 'David Ignatius on Taiwan, ambiguity, and what comes next',                 source: 'Rig Wire Opinion',       narrator: 'David Ignatius',         category: 'OPINION',         duration: '9:32',  durationSec: 572,  coverHue: '#7a2e5a', coverLabel: 'TW' },
  { id: 'q30', title: 'How rural Japan is teaching the world to age',                             source: 'Rig Wire Long Read',     narrator: 'Kenji Yamamoto',         category: 'LONG READ',       duration: '17:14', durationSec: 1034, coverHue: '#4d3a85', coverLabel: 'JP' },
  { id: 'q31', title: 'Cloudflare DNS outage post-mortem — what failed',                     source: 'Rig Wire Tech',          narrator: 'Marcus Chen',            category: 'NEWS BRIEF',      duration: '4:18',  durationSec: 258,  coverHue: '#3b5b8a', coverLabel: 'CF' },
  { id: 'q32', title: 'Yair Rosenberg on what news was for',                                       source: 'Rig Wire Opinion',       narrator: 'Yair Rosenberg',         category: 'OPINION',         duration: '12:48', durationSec: 768,  coverHue: '#7a2e5a', coverLabel: 'YR' },
  { id: 'q33', title: 'EU finance ministers approve €150 billion defense bond',              source: 'Rig Wire World',         narrator: 'Anand Pillai (voice)',   category: 'WORLD',           duration: '3:34',  durationSec: 214,  coverHue: '#2a4a78', coverLabel: 'EU' },
  { id: 'q34', title: 'The Argentine experiment that no one expected to work',                    source: 'Rig Wire Long Read',     narrator: 'Lucía Fernández', category: 'LONG READ',    duration: '23:18', durationSec: 1398, coverHue: '#4d3a85', coverLabel: 'AR' },
  { id: 'q35', title: 'Donanemab-OR Phase III — the medical read',                          source: 'Rig Wire Health',        narrator: 'Dr. Anjali Kapoor',      category: 'NEWS BRIEF',      duration: '4:56',  durationSec: 296,  coverHue: '#3b5b8a', coverLabel: 'ALZ' },
  { id: 'q36', title: 'How the German far-right normalised itself',                                source: 'Rig Wire Long Read',     narrator: 'Klaus Mueller',          category: 'LONG READ',       duration: '20:48', durationSec: 1248, coverHue: '#4d3a85', coverLabel: 'DE' },
  { id: 'q37', title: 'Tonight’s big six — your evening briefing',                       source: 'Rig Wire Daily',         narrator: 'Maya Krishnan',          category: 'DAILY BRIEFING',  duration: '5:22',  durationSec: 322,  coverHue: '#1a1815', coverLabel: 'EVE' },
  { id: 'q38', title: 'Renee DiResta on AI moderation as a category error',                       source: 'Rig Wire Voices',        narrator: 'Maya Krishnan, host',    category: 'INTERVIEW',       duration: '36:12', durationSec: 2172, coverHue: '#a86a2e', coverLabel: 'RD' },
  { id: 'q39', title: 'Saudi naval forces intercept Yemen-bound shipment',                        source: 'Rig Wire World',         narrator: 'Mohammed Al-Rashid',     category: 'WORLD',           duration: '3:42',  durationSec: 222,  coverHue: '#2a4a78', coverLabel: 'YE' },
  { id: 'q40', title: 'WHO drops mpox emergency designation',                                     source: 'Rig Wire Health',        narrator: 'Dr. Anjali Kapoor',      category: 'NEWS BRIEF',      duration: '2:38',  durationSec: 158,  coverHue: '#3b5b8a', coverLabel: 'WHO' },
];

/* ── Pre-baked waveform amplitudes ──────────────────────────── */
/* 80 bars, deterministic so the waveform doesn't flicker between
   renders. Heights 0.18–1.0 ratio, vaguely speech-shaped. */
export const WAVEFORM_BARS: number[] = (() => {
  const seed = 0.62831853;
  return Array.from({ length: 80 }, (_, i) => {
    const x = (i + 1) * seed;
    const a = Math.abs(Math.sin(x * 1.7)) * 0.55;
    const b = Math.abs(Math.sin(x * 0.7 + 1.3)) * 0.35;
    const c = Math.abs(Math.cos(x * 2.3)) * 0.25;
    return Math.min(1, 0.22 + a + b + c);
  });
})();

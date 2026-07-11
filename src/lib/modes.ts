export interface Mode {
  key: 'minute' | 'digest' | 'all-sides' | 'long-read' | 'long-view' | 'queue';
  name: string;
  // Light mode palette: pastel card background + saturated title/accent
  cardBg: string;     // pale pastel
  accent: string;     // deep saturated — for card title text & accent rule
  rule:   string;     // mid tone — for thin accent lines
  time: string;
  shortTime: string;
  tagline: string;
  blurb: string;
  cta: string;
  meta: string;
  href: string;
  image: string;      // path under /public/cards/*.png
}

export const MODES: Mode[] = [
  {
    key:       'minute',
    name:      'Flash',
    cardBg:    '#fcded0',
    accent:    '#a03a20',
    rule:      '#c44a2e',
    time:      '60 seconds',
    shortTime: '60 sec',
    tagline:   "Today's biggest story, finished in sixty seconds — one screen, no scrolling.",
    blurb:     "The single most important story of the day, written so you can read the whole thing in sixty seconds. One screen, no scrolling, no clickbait. The headline, the context, the takeaway — then you're done.",
    cta:       'Read the minute',
    meta:      'Synthesised from up to 31 sources · Updated hourly',
    href:      '/minute',
    image:     '/cards/minute.png',
  },
  {
    key:       'digest',
    name:      'Newsletter',
    cardBg:    '#d6e8dc',
    accent:    '#2e5e3e',
    rule:      '#2e7c45',
    time:      '5 minutes',
    shortTime: '5 min',
    tagline:   "Five stories, in your inbox by 6:30 — the world before your day starts, finishable with one coffee.",
    blurb:     "Five stories, hand-picked overnight, in your inbox by 6:30. Coffee-and-commute length. The world before your day starts — and short enough that you'll still be there at the bottom.",
    cta:       "See today's digest",
    meta:      'Email · WhatsApp · Web · 06:30 local',
    href:      '/digest',
    image:     '/cards/digest.png',
  },
  {
    key:       'all-sides',
    name:      'All Sides',
    cardBg:    '#e8e5e0',
    accent:    '#3a3633',
    rule:      '#5a5550',
    time:      '8 minutes',
    shortTime: '8 min',
    tagline:   "Today's most divisive story, read from the left, the right, the Global South — and what every newsroom left out.",
    blurb:     'The most divisive story of the day, read four ways — from the left, from the right, from the Global South, and from what every newsroom left out. The same facts, framed by four different rooms.',
    cta:       'Read All Sides',
    meta:      'Left · Right · Global South · Omitted facts',
    href:      '/all-sides',
    image:     '/cards/all-sides.png',
  },
  {
    key:       'long-read',
    name:      'Worldwide',
    cardBg:    '#d6e2f0',
    accent:    '#264e78',
    rule:      '#2d5c8a',
    time:      '14 minutes',
    shortTime: '14 min',
    tagline:   "Fourteen minutes of the world's biggest news — every continent's headline today, gathered into one read.",
    blurb:     "Today's news from every region of the world, arranged into a single fourteen-minute read. Africa, Asia, the Americas, Europe, Oceania — the biggest story from each, side by side. Comprehensive daily global news, without the Anglo-Atlantic bias of any single newsroom's homepage. The world as it actually looks today.",
    cta:       'Read Worldwide',
    meta:      '6 continents · 31 newsrooms · 14 minute read',
    href:      '/long-read',
    image:     '/cards/long-read.png',
  },
  {
    key:       'long-view',
    name:      'Aftermath',
    cardBg:    '#f4e2c0',
    accent:    '#6a4c19',
    rule:      '#8a6520',
    time:      '12 minutes',
    shortTime: '12 min',
    tagline:   "One story revisited ninety days later — what held up, what we got wrong, what actually happened.",
    blurb:     "We revisit one story every quarter, ninety days after the headlines moved on. What held up. What we got wrong. What actually happened, once the spin faded. The accountability layer most news quietly skips.",
    cta:       'Revisit the news',
    meta:      '29 sources · Quarterly retrospectives',
    href:      '/long-view',
    image:     '/cards/long-view.png',
  },
  {
    key:       'queue',
    name:      'Pocket',
    cardBg:    '#e1d8f0',
    accent:    '#4d3a85',
    rule:      '#5d4a9a',
    time:      'Ambient',
    shortTime: '∞',
    tagline:   "Press play. The next story auto-plays, picked for you — like a Spotify playlist for the day's news.",
    blurb:     "Press play and the next story loads itself — picked for you from the other five modes, based on what you've read and what you skipped. No menus, no front page, no choosing. Stops only when you do.",
    cta:       'Start The Queue',
    meta:      'Personalised · No decisions · Always on',
    href:      '/queue',
    image:     '/cards/queue.png',
  },
];

export const MODES_BY_KEY: Record<Mode['key'], Mode> = MODES.reduce(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {} as Record<Mode['key'], Mode>,
);

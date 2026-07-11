/* ═════════════════════════════════════════════════════════════════
   THE DIGEST — onboarding data: topics, tones, archetypes,
   sample personalised newsletter stories.
═════════════════════════════════════════════════════════════════ */

export interface Topic {
  id:    string;
  label: string;
  group: 'world' | 'work' | 'life' | 'craft';
  tagline: string;
}

export const TOPICS: Topic[] = [
  /* World & Politics */
  { id: 'politics',       label: 'Politics',       group: 'world', tagline: 'Governments, elections, the institutions in between.' },
  { id: 'world',          label: 'World',          group: 'world', tagline: 'Beyond your border — the slow news of other countries.' },
  { id: 'investigations', label: 'Investigations', group: 'world', tagline: 'Six-month reporting projects that change things.' },
  { id: 'climate',        label: 'Climate',        group: 'world', tagline: 'Energy, weather, capital, migration.' },

  /* Work & Money */
  { id: 'markets',        label: 'Markets',        group: 'work',  tagline: 'Stocks, rates, currencies, bonds.' },
  { id: 'economy',        label: 'Economy',        group: 'work',  tagline: 'GDP, jobs, inflation, the macro picture.' },
  { id: 'business',       label: 'Business',       group: 'work',  tagline: 'Companies, deals, founders, factories.' },
  { id: 'technology',     label: 'Technology',     group: 'work',  tagline: 'Hardware, software, platforms, regulation.' },
  { id: 'ai',             label: 'AI',             group: 'work',  tagline: 'Models, labs, policy, the second-order effects.' },

  /* Life */
  { id: 'health',         label: 'Health',         group: 'life',  tagline: 'Drugs, public health, the body.' },
  { id: 'science',        label: 'Science',        group: 'life',  tagline: 'Research, space, biology, physics.' },
  { id: 'sports',         label: 'Sports',         group: 'life',  tagline: 'Cricket, football, F1, the games behind the games.' },

  /* Craft */
  { id: 'culture',        label: 'Culture',        group: 'craft', tagline: 'Film, music, books, taste.' },
  { id: 'opinion',        label: 'Opinion',        group: 'craft', tagline: 'Arguments. The good ones.' },
  { id: 'long-reads',     label: 'Long reads',     group: 'craft', tagline: 'Twelve to twenty-two minutes. The deep dives.' },
  { id: 'profiles',       label: 'Profiles',       group: 'craft', tagline: 'One life, told slowly.' },
];

export const TOPIC_GROUPS = {
  world: { label: 'World & politics', tagline: 'The wide angle.' },
  work:  { label: 'Work & money',     tagline: 'How the world earns.' },
  life:  { label: 'Life',             tagline: 'Health, sport, science.' },
  craft: { label: 'Craft & criticism', tagline: 'How the world reads itself.' },
} as const;

/* ── 4 TONES ─────────────────────────────────────────────────── */
export interface Tone {
  id:        string;
  label:     string;
  byline:    string;     /* who writes this voice */
  pitch:     string;     /* one-line description */
  sample:    string;     /* a headline written in this tone */
  sampleSub: string;     /* a 1-line subheading in this tone */
}

export const TONES: Tone[] = [
  {
    id: 'editor',
    label: 'The Editor',
    byline: 'Sober, analytical, primary-source-driven.',
    pitch:  'Tells you what is happening. Leaves the verdict to you.',
    sample: 'India crosses Japan to become the world’s third-largest economy',
    sampleSub: 'The transition was anticipated. The consequences will not be.',
  },
  {
    id: 'reporter',
    label: 'The Reporter',
    byline: 'Clear, factual, evenly weighted.',
    pitch:  'Both sides quoted. No adjectives.',
    sample: 'OpenAI loses NYT case. Damages exceed $1.8 billion',
    sampleSub: 'A federal judge rules. Industry awaits the appeal.',
  },
  {
    id: 'critic',
    label: 'The Critic',
    byline: 'Sharp, opinionated, well-read.',
    pitch:  'A point of view. Defensible. Often correct.',
    sample: 'OpenAI’s NYT loss is the right verdict — and the wrong fix',
    sampleSub: 'The court got the law right. The law was always behind the technology.',
  },
  {
    id: 'generalist',
    label: 'The Generalist',
    byline: 'Curious, broad, lightly written.',
    pitch:  'A wide net. Five different worlds before breakfast.',
    sample: 'Five stories you didn’t know you needed today',
    sampleSub: 'A judge, an iceberg, a cricketer, a chip, and a Lagos street.',
  },
];

/* ── 3 DELIVERY TIMES ────────────────────────────────────────── */
export interface Slot {
  id:    string;
  time:  string;
  label: string;
  tagline: string;
}

export const SLOTS: Slot[] = [
  { id: 'dawn',    time: '5:30 a.m.', label: 'Before the day starts',   tagline: 'Read before the email arrives.' },
  { id: 'morning', time: '7:30 a.m.', label: 'With the coffee',         tagline: 'The standard. Most readers pick this.' },
  { id: 'evening', time: '6:00 p.m.', label: 'After the day ends',      tagline: 'Wind-down reading. A slower digest.' },
];

/* ── ARCHETYPES — generated from topic+tone combos ───────────── */
export interface Archetype {
  id:       string;
  name:     string;
  subtitle: string;
  prose:    string;     /* a sentence describing this archetype */
  match: (topicIds: Set<string>, toneId: string) => number;  /* fit score 0–1 */
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'diplomat',
    name: 'The Diplomat',
    subtitle: 'World-watcher · Slow reader',
    prose: 'You read for the wide angle. Foreign capitals, slow institutions, the long arc.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('world'))         s += 0.35;
      if (t.has('politics'))      s += 0.25;
      if (t.has('long-reads'))    s += 0.15;
      if (t.has('investigations')) s += 0.10;
      if (tone === 'editor')      s += 0.20;
      return s;
    },
  },
  {
    id: 'builder',
    name: 'The Builder',
    subtitle: 'Technologist · Pragmatist',
    prose: 'You read the future of work. Models, chips, founders, factories — the things actually being made.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('technology')) s += 0.30;
      if (t.has('ai'))         s += 0.30;
      if (t.has('business'))   s += 0.15;
      if (t.has('science'))    s += 0.10;
      if (tone === 'reporter') s += 0.15;
      return s;
    },
  },
  {
    id: 'trader',
    name: 'The Trader',
    subtitle: 'Markets-first · Macro-aware',
    prose: 'Rates, currencies, earnings. Politics matters when it moves the curve.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('markets'))  s += 0.35;
      if (t.has('economy'))  s += 0.25;
      if (t.has('business')) s += 0.20;
      if (tone === 'reporter') s += 0.15;
      return s;
    },
  },
  {
    id: 'skeptic',
    name: 'The Skeptic',
    subtitle: 'Opinionated · Well-armed',
    prose: 'You came for the argument. You stayed because the argument was good.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('opinion'))   s += 0.35;
      if (t.has('politics'))  s += 0.20;
      if (t.has('long-reads')) s += 0.15;
      if (tone === 'critic')  s += 0.30;
      return s;
    },
  },
  {
    id: 'watchdog',
    name: 'The Watchdog',
    subtitle: 'Investigator · Accountability-minded',
    prose: 'You want what nobody else printed. The six-month projects. The receipts.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('investigations')) s += 0.40;
      if (t.has('politics'))       s += 0.15;
      if (t.has('climate'))        s += 0.10;
      if (tone === 'critic')       s += 0.15;
      if (tone === 'editor')       s += 0.10;
      return s;
    },
  },
  {
    id: 'connoisseur',
    name: 'The Connoisseur',
    subtitle: 'Cultural reader · Slow palate',
    prose: 'Film, music, books, taste. The long essay over the news flash.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('culture'))     s += 0.30;
      if (t.has('long-reads'))  s += 0.25;
      if (t.has('profiles'))    s += 0.15;
      if (t.has('opinion'))     s += 0.10;
      if (tone === 'editor')    s += 0.10;
      if (tone === 'critic')    s += 0.10;
      return s;
    },
  },
  {
    id: 'spectator',
    name: 'The Spectator',
    subtitle: 'Sports-and-stories reader',
    prose: 'Sport tells you who a country is. You read for the team and the story behind it.',
    match: (t, tone) => {
      let s = 0;
      if (t.has('sports'))      s += 0.40;
      if (t.has('culture'))     s += 0.15;
      if (t.has('profiles'))    s += 0.15;
      if (tone === 'generalist') s += 0.20;
      return s;
    },
  },
  {
    id: 'generalist',
    name: 'The Generalist',
    subtitle: 'Wide-net reader · Daily-driver',
    prose: 'A bit of everything. The world is a varied place; your digest should be too.',
    match: (t, tone) => {
      const breadth = Math.min(1, t.size / 8);
      let s = 0.20 + breadth * 0.40;
      if (tone === 'generalist') s += 0.30;
      return s;
    },
  },
];

export function pickArchetype(topicIds: Set<string>, toneId: string): Archetype {
  let best = ARCHETYPES[ARCHETYPES.length - 1];
  let bestScore = best.match(topicIds, toneId);
  for (const a of ARCHETYPES) {
    const s = a.match(topicIds, toneId);
    if (s > bestScore) { bestScore = s; best = a; }
  }
  return best;
}

/* ── SAMPLE NEWSLETTER STORIES per topic ─────────────────────── */
export interface DigestStory {
  topicId:   string;
  category:  string;
  title:     string;
  summary:   string;
  source:    string;
  readTime:  string;
  image:     string;
}

const img = (tags: string) => `https://loremflickr.com/600/400/${encodeURIComponent(tags)}?lock=1`;

export const SAMPLE_STORIES: DigestStory[] = [
  { topicId: 'politics',       category: 'POLITICS',       title: 'White House extends H-1B visa review to 90 days',                  summary: 'A new executive order lengthens the review window, citing fraud-screening upgrades. Tech employers warn of delayed renewals.', source: 'Politico',        readTime: '4 min', image: img('whitehouse,washington') },
  { topicId: 'world',          category: 'WORLD',          title: 'Taiwan reports 24 PLA warplanes crossed the median line overnight', summary: 'The largest single-night incursion this quarter. Taipei scrambled F-16Vs; no contact reported.', source: 'Al Jazeera',     readTime: '3 min', image: img('fighter,jet,taiwan') },
  { topicId: 'investigations', category: 'INVESTIGATION',  title: 'When private equity owns your hospital',                            summary: 'Patient mortality, staffing cuts, and the financial engineering behind 400 American hospital closures.', source: 'Rig Wire',        readTime: '23 min', image: img('hospital,medical') },
  { topicId: 'climate',        category: 'CLIMATE',        title: 'Arctic sea ice hits lowest May extent since records began',          summary: 'Satellite data confirms coverage fell to 11.2 million km². Researchers cite a persistent marine heatwave.', source: 'BBC',             readTime: '3 min', image: img('arctic,ice') },
  { topicId: 'markets',        category: 'MARKETS',        title: 'Nifty 50 closes above 28,000 for the first time',                   summary: 'India’s benchmark added 1.4 percent. Foreign investors bought ₹9,200 crore of equities net.', source: 'Bloomberg',       readTime: '3 min', image: img('stockmarket,trading') },
  { topicId: 'economy',        category: 'ECONOMY',        title: 'India overtakes Japan as world’s third-largest economy',       summary: 'Nominal GDP crossed $4.5 trillion this quarter. The transition was anticipated by IMF projections.', source: 'Reuters',         readTime: '3 min', image: img('mumbai,skyline') },
  { topicId: 'business',       category: 'BUSINESS',       title: 'Tata’s Gujarat chip fab ships first 28nm wafers',              summary: 'Six months ahead of schedule. India becomes the seventh nation with operational large-scale logic chip capacity.', source: 'Mint',           readTime: '4 min', image: img('semiconductor,factory') },
  { topicId: 'technology',     category: 'TECHNOLOGY',     title: 'Apple unveils on-device AI search at WWDC',                         summary: 'New layer replaces Google as default for short factual queries. The $20B partnership has been restructured.', source: 'The Verge',       readTime: '5 min', image: img('apple,iphone') },
  { topicId: 'ai',             category: 'AI',             title: 'OpenAI loses landmark New York Times copyright case',               summary: 'A federal judge ruled OpenAI infringed NYT articles during GPT training. Damages exceed $1.8 billion.', source: 'WSJ',             readTime: '4 min', image: img('artificial,intelligence') },
  { topicId: 'health',         category: 'HEALTH',         title: 'First oral Alzheimer’s pill clears Phase III with 47% slowdown', summary: 'Eli Lilly’s donanemab-OR slowed cognitive decline in a 3,400-patient trial. FDA filing targeted for July.', source: 'NEJM',           readTime: '4 min', image: img('medicine,pharmacy') },
  { topicId: 'science',        category: 'SCIENCE',        title: 'SpaceX confirms uncrewed Mars cargo mission for November',          summary: 'Vehicle will deliver 100 tonnes of supplies to Jezero Crater. The gating step for crewed flight in 2028.', source: 'Ars Technica',    readTime: '4 min', image: img('rocket,space,launch') },
  { topicId: 'sports',         category: 'SPORTS',         title: 'Chennai Super Kings clinch sixth IPL title in last-ball thriller',  summary: 'CSK beat Mumbai Indians by 4 runs. Dhoni, in his farewell season at 44, scored 38 from 16 balls.', source: 'ESPNcricinfo',    readTime: '4 min', image: img('cricket,stadium,india') },
  { topicId: 'culture',        category: 'CULTURE',        title: 'Academy moves Oscars 2027 to January',                              summary: 'The 99th Oscars will air January 24, 2027. The shift aligns with streaming-era release cadences.', source: 'Variety',         readTime: '3 min', image: img('cinema,oscars,redcarpet') },
  { topicId: 'opinion',        category: 'OPINION',        title: 'We forgot what news was for. The internet didn’t cause it.',   summary: 'Yair Rosenberg argues the crisis of attention is older, deeper, and not principally technological.', source: 'Rig Wire Opinion', readTime: '8 min', image: img('newspaper,reader') },
  { topicId: 'long-reads',     category: 'LONG READ',      title: 'The slow death of local news',                                      summary: 'Why 2,547 American newsrooms have closed since 2005 — and what quietly disappears with them.', source: 'Rig Wire',        readTime: '24 min', image: img('newsroom,empty') },
  { topicId: 'profiles',       category: 'PROFILE',        title: 'The 70-year-old engineer rebuilding India’s railways',         summary: 'After five decades inside the world’s largest employer, Suresh Iyer oversees the largest rail programme since independence.', source: 'Rig Wire',        readTime: '11 min', image: img('railway,india,engineer') },
];

export function storiesFor(topicIds: Set<string>, limit = 5): DigestStory[] {
  /* Prefer stories whose topicId is in the user's selections.
     If insufficient, top up with general picks. */
  const matched = SAMPLE_STORIES.filter((s) => topicIds.has(s.topicId));
  const rest    = SAMPLE_STORIES.filter((s) => !topicIds.has(s.topicId));
  return [...matched, ...rest].slice(0, limit);
}

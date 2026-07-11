/* ═════════════════════════════════════════════════════════════════
   ALL SIDES — data for the Ground-News-style aggregation view.
   Every story carries a bias breakdown (Left / Centre / Right %),
   total source count, location tag, dominant lean. Some are flagged
   as Blindspots — disproportionately under-reported by one side.
═════════════════════════════════════════════════════════════════ */

export type Bias = 'left' | 'center' | 'right';

export interface AllSidesStory {
  id:           string;
  category:     string;   /* small uppercase pill, e.g. "WORLD" */
  title:        string;
  summary:      string;
  image:        string;
  location:     string;   /* e.g. "Colombia Politics · Colombia" */
  credit:       string;   /* photo credit, e.g. "REUTERS / Mahmoud Hassano" */
  bias:         { left: number; center: number; right: number };  /* sums to 100 */
  totalSources: number;
  isBlindspot?: boolean;
  /* Which side is missing from coverage (the side that DOESN'T cover it).
     Used when isBlindspot is true. */
  blindspotSide?: Bias;
  timestamp:    string;
  factuality?:  'High' | 'Mixed' | 'Mostly factual';
  ownership?:   string;   /* aggregated ownership type */
}

const img = (tags: string) =>
  `https://loremflickr.com/1400/800/${encodeURIComponent(tags)}?lock=1`;

/* helper to derive dominant bias from a bias breakdown */
export function dominantOf(b: { left: number; center: number; right: number }): Bias {
  if (b.center >= b.left && b.center >= b.right) return 'center';
  return b.left >= b.right ? 'left' : 'right';
}

/* ── 30 STORIES ─────────────────────────────────────────────── */
export const STORIES: AllSidesStory[] = [
  { id: 's1',  category: 'ECONOMY',   title: 'India overtakes Japan to become world’s third-largest economy',
    summary: 'Nominal GDP crosses $4.5 trillion this quarter, formally surpassing Japan and trailing only the US and China.',
    image: img('mumbai,skyline,india'),  location: 'India · Economy',  credit: 'REUTERS / Francis Mascarenhas',
    bias: { left: 35, center: 40, right: 25 }, totalSources: 187, timestamp: '2h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's2',  category: 'TECH',      title: 'OpenAI loses landmark New York Times copyright case',
    summary: 'Federal judge rules OpenAI infringed NYT articles during GPT training. Damages exceed $1.8 billion.',
    image: img('court,gavel,judge'),     location: 'New York · Tech & Law',  credit: 'AP / Seth Wenig',
    bias: { left: 28, center: 42, right: 30 }, totalSources: 234, timestamp: '4h ago', factuality: 'High', ownership: 'Mostly private' },

  { id: 's3',  category: 'CLIMATE',   title: 'Arctic sea ice hits lowest May extent since 1979 records began',
    summary: 'Satellite data confirms coverage fell to 11.2 million km², 18 percent below the 1981–2010 average.',
    image: img('arctic,sea,ice'),        location: 'Arctic · Climate',  credit: 'NASA / Earth Observatory',
    bias: { left: 48, center: 36, right: 16 }, totalSources: 89, timestamp: '5h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's4',  category: 'POLITICS',  title: 'White House extends H-1B visa review period to 90 days',
    summary: 'New executive order lengthens the H-1B specialty-occupation visa review window, citing fraud-screening upgrades.',
    image: img('whitehouse,washington,politics'),  location: 'Washington D.C. · Immigration', credit: 'Getty / Drew Angerer',
    bias: { left: 32, center: 35, right: 33 }, totalSources: 167, timestamp: '6h ago', factuality: 'Mostly factual', ownership: 'Mixed' },

  { id: 's5',  category: 'MARKETS',   title: 'Nifty 50 closes above 28,000 for the first time on FII buying',
    summary: 'India’s benchmark added 1.4 percent to settle at 28,162. Foreign investors bought ₹9,200 crore of equities net.',
    image: img('stockmarket,trading,india'),  location: 'Mumbai · Markets', credit: 'Bloomberg / Dhiraj Singh',
    bias: { left: 25, center: 55, right: 20 }, totalSources: 142, timestamp: '7h ago', factuality: 'High', ownership: 'Corporate' },

  { id: 's6',  category: 'SCIENCE',   title: 'SpaceX confirms uncrewed Mars cargo mission for November launch window',
    summary: 'Vehicle will deliver 100 tonnes of supplies to Jezero Crater. A successful demo is the gating step for crewed flight in 2028.',
    image: img('rocket,space,launch'),  location: 'Texas · Space', credit: 'SpaceX / Handout',
    bias: { left: 30, center: 45, right: 25 }, totalSources: 198, timestamp: '8h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's7',  category: 'SPORTS',    title: 'Chennai Super Kings clinch sixth IPL title in last-ball thriller',
    summary: 'CSK beat Mumbai Indians by 4 runs at Narendra Modi Stadium. Dhoni scored 38 from 16 balls in his farewell season.',
    image: img('cricket,stadium,india'),  location: 'Ahmedabad · Sports',  credit: 'BCCI / Sportzpics',
    bias: { left: 22, center: 56, right: 22 }, totalSources: 123, timestamp: '10h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's8',  category: 'HEALTH',    title: 'First oral Alzheimer’s pill clears Phase III with 47% cognitive-decline slowdown',
    summary: 'Eli Lilly’s donanemab-OR tablet slowed cognitive decline in a 3,400-patient trial. FDA filing targeted for July.',
    image: img('medicine,pill,pharmacy'),  location: 'Indianapolis · Health',  credit: 'Reuters / Andrew Kelly',
    bias: { left: 28, center: 52, right: 20 }, totalSources: 167, timestamp: '12h ago', factuality: 'High', ownership: 'Corporate' },

  { id: 's9',  category: 'CULTURE',   title: 'Academy moves Oscars 2027 to January, shortest gap in history',
    summary: '99th Oscars to air January 24, 2027. Shift aligns with streaming-era release cadences and expanded International Feature field.',
    image: img('cinema,oscars,redcarpet'),  location: 'Hollywood · Film', credit: 'Variety / Getty',
    bias: { left: 33, center: 50, right: 17 }, totalSources: 145, timestamp: '14h ago', factuality: 'Mostly factual', ownership: 'Mixed' },

  { id: 's10', category: 'WORLD',     title: 'Taiwan reports 24 PLA warplanes crossed median line overnight',
    summary: 'Taiwan’s MND said 24 Chinese aircraft including J-16 fighters crossed the Strait between 11pm and 4am. Largest single-night incursion this quarter.',
    image: img('fighter,jet,military'),  location: 'Taipei · Defense', credit: 'AFP / Sam Yeh',
    bias: { left: 24, center: 36, right: 40 }, totalSources: 287, timestamp: '15h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's11', category: 'BUSINESS',  title: 'Tata’s Gujarat chip fab ships first 28nm wafers six months ahead of schedule',
    summary: 'Dholera $11 billion fabrication plant produced first commercial wafers. India becomes seventh nation with operational large-scale logic chip capacity.',
    image: img('semiconductor,chip,factory'),  location: 'Dholera · Business', credit: 'Tata Electronics / Handout',
    bias: { left: 21, center: 56, right: 23 }, totalSources: 89, timestamp: '16h ago', factuality: 'High', ownership: 'Corporate' },

  { id: 's12', category: 'TECH',      title: 'Apple unveils on-device AI search at WWDC; Google deal restructured',
    summary: 'Apple introduces on-device generative-AI search for iOS 19 and macOS 16, replacing Google as default for short factual queries.',
    image: img('apple,iphone,technology'),  location: 'Cupertino · Tech', credit: 'Apple / Handout',
    bias: { left: 32, center: 48, right: 20 }, totalSources: 312, timestamp: '18h ago', factuality: 'High', ownership: 'Corporate' },

  { id: 's13', category: 'WORLD',     title: 'EU finance ministers approve €150 billion joint defense bond',
    summary: 'ECOFIN unanimously approves the largest joint debt instrument since pandemic-era NextGenerationEU. Funds will purchase air-defense systems and munitions.',
    image: img('europe,parliament,brussels'),  location: 'Brussels · World',  credit: 'Reuters / Yves Herman',
    bias: { left: 26, center: 48, right: 26 }, totalSources: 198, timestamp: '19h ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's14', category: 'CLIMATE',   title: 'India crosses 200 GW of installed renewable-energy capacity',
    summary: 'Solar leads at 112 GW, wind at 48 GW. The country remains on track for its 500 GW non-fossil target by 2030.',
    image: img('solar,panel,renewable'),  location: 'India · Climate', credit: 'PIB / Government of India',
    bias: { left: 38, center: 45, right: 17 }, totalSources: 87, timestamp: '20h ago', factuality: 'High', ownership: 'Public' },

  { id: 's15', category: 'MARKETS',   title: 'Bitcoin breaches $150,000 amid record US spot-ETF inflows',
    summary: 'BTC gained 6.2 percent in 24 hours. US spot Bitcoin ETFs recorded $2.1 billion of net inflows yesterday, the second-highest single-day on record.',
    image: img('bitcoin,cryptocurrency,coin'),  location: 'Global · Markets', credit: 'Getty / Chesnot',
    bias: { left: 25, center: 52, right: 23 }, totalSources: 234, timestamp: '22h ago', factuality: 'High', ownership: 'Mixed' },

  /* BLINDSPOT — story disproportionately covered by left, missed by right */
  { id: 's16', category: 'WORLD',     title: 'Ebola outbreak in eastern DRC: 47 confirmed cases, screening expanded',
    summary: 'WHO confirms a new outbreak in North Kivu. Three border countries begin enhanced screening. Treatment-center attack disrupts response.',
    image: img('hospital,africa,medicine'),  location: 'Goma · Health', credit: 'WHO / Photographer',
    bias: { left: 64, center: 28, right: 8 }, totalSources: 89, timestamp: '23h ago',
    isBlindspot: true, blindspotSide: 'right', factuality: 'High', ownership: 'Mixed' },

  /* BLINDSPOT — story disproportionately covered by right, missed by left */
  { id: 's17', category: 'POLITICS',  title: 'School-district AI policy mandates parental opt-in for student data use',
    summary: 'A coalition of 14 Republican-led states finalizes opt-in framework. Tech industry groups warn of fragmented compliance burden.',
    image: img('school,classroom,students'),  location: 'Texas · Policy', credit: 'AP / Eric Gay',
    bias: { left: 12, center: 25, right: 63 }, totalSources: 67, timestamp: '1 day ago',
    isBlindspot: true, blindspotSide: 'left', factuality: 'Mostly factual', ownership: 'Mixed' },

  { id: 's18', category: 'WORLD',     title: 'NATO calls emergency meeting after Ukraine border incident',
    summary: 'Article 4 consultations scheduled for Tuesday. Western capitals coordinating response to overnight cross-border activity in Eastern Poland.',
    image: img('nato,flag,europe'),  location: 'Brussels · World', credit: 'Getty / Sean Gallup',
    bias: { left: 30, center: 40, right: 30 }, totalSources: 245, timestamp: '1 day ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's19', category: 'TECH',      title: 'Cloudflare confirms major DNS outage; downstream services degraded globally',
    summary: 'Outage lasted approximately 78 minutes. Affected services included Discord, Spotify, ChatGPT, and several major payment processors.',
    image: img('server,datacenter,network'),  location: 'San Francisco · Tech', credit: 'Cloudflare / Handout',
    bias: { left: 32, center: 55, right: 13 }, totalSources: 178, timestamp: '1 day ago', factuality: 'High', ownership: 'Corporate' },

  { id: 's20', category: 'WORLD',     title: 'Saudi naval forces intercept Yemen-bound weapons shipment in Red Sea',
    summary: 'Riyadh confirms the operation. Cargo included drone components and anti-ship missile parts. Crew detained for questioning.',
    image: img('navy,ship,sea'),  location: 'Red Sea · Defense', credit: 'Reuters / Saudi MoD',
    bias: { left: 25, center: 35, right: 40 }, totalSources: 134, timestamp: '1 day ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's21', category: 'POLITICS',  title: 'Senate rejects $89B defense supplemental in surprise procedural vote',
    summary: 'Five Republicans crossed to vote with Democrats. The package, which included Israel and Taiwan funding, returns to committee.',
    image: img('senate,capitol,congress'),  location: 'Washington D.C. · Politics', credit: 'AP / J. Scott Applewhite',
    bias: { left: 40, center: 35, right: 25 }, totalSources: 234, timestamp: '1 day ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's22', category: 'HEALTH',    title: 'WHO declares mpox no longer a public-health emergency of international concern',
    summary: 'Committee cites sustained decline in case rates and improved surveillance. Vaccine stockpiles to be maintained.',
    image: img('vaccine,laboratory,medicine'),  location: 'Geneva · Health', credit: 'WHO / Pierre Albouy',
    bias: { left: 35, center: 52, right: 13 }, totalSources: 145, timestamp: '1 day ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's23', category: 'WORLD',     title: 'Argentine peso devalues sharply; central bank intervenes within hours',
    summary: 'Peso lost 14 percent against dollar in morning trading. BCRA sold $400 million in reserves to stabilise. Milei addresses nation.',
    image: img('buenosaires,argentina,bank'),  location: 'Buenos Aires · Markets', credit: 'Reuters / Tomas Cuesta',
    bias: { left: 22, center: 52, right: 26 }, totalSources: 167, timestamp: '1 day ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's24', category: 'BUSINESS',  title: 'Adani Group denies SEBI report; shares close down 4.2% in Mumbai',
    summary: 'Conglomerate issues 18-page response to regulator’s findings. Adani Enterprises, Adani Ports lead the decline. Group total market cap loses $8 billion.',
    image: img('mumbai,stockmarket,trading'),  location: 'Mumbai · Business', credit: 'Reuters / Francis Mascarenhas',
    bias: { left: 28, center: 52, right: 20 }, totalSources: 145, timestamp: '1 day ago', factuality: 'Mixed', ownership: 'Corporate' },

  { id: 's25', category: 'POLITICS',  title: 'Tulsi Gabbard resigns as Director of National Intelligence',
    summary: 'Resignation effective immediately. Acting director to be named within 72 hours. No reason given in the official statement.',
    image: img('washington,intelligence,government'),  location: 'Washington D.C. · Politics', credit: 'AP / Mariam Zuhaib',
    bias: { left: 48, center: 27, right: 25 }, totalSources: 278, timestamp: '2 days ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's26', category: 'WORLD',     title: 'At least 90 dead in Chinese coal mine explosion, state media reports',
    summary: 'Methane blast at a Shanxi province mine. 240 miners reported underground at time of incident. Rescue operations underway.',
    image: img('mine,coal,industry'),  location: 'Shanxi · World', credit: 'Xinhua / Wang Jianhua',
    bias: { left: 35, center: 50, right: 15 }, totalSources: 156, timestamp: '2 days ago', factuality: 'Mostly factual', ownership: 'Public' },

  { id: 's27', category: 'WORLD',     title: 'Israel says it killed the leader of Hamas’ military wing in overnight strike',
    summary: 'IDF identifies the target as an architect of the October 7, 2023 attacks. Hamas has not confirmed. Civilian casualties under investigation.',
    image: img('gaza,middleeast,conflict'),  location: 'Gaza · World', credit: 'Reuters / IDF Handout',
    bias: { left: 22, center: 42, right: 36 }, totalSources: 229, timestamp: '2 days ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's28', category: 'WORLD',     title: 'Magnitude 6.0 earthquake rattles Hawaii Big Island; no major damage',
    summary: 'USGS confirms epicentre 7 miles southwest of Pahala. No tsunami warning issued. Several structures damaged in Volcano Village.',
    image: img('hawaii,volcano,island'),  location: 'Hawaii · World', credit: 'USGS / Handout',
    bias: { left: 28, center: 52, right: 20 }, totalSources: 89, timestamp: '2 days ago', factuality: 'High', ownership: 'Mixed' },

  { id: 's29', category: 'POLITICS',  title: 'Trump meets with national-security officials as he weighs next steps on Iran',
    summary: 'Hour-long Situation Room meeting included DNI, SecDef, and Joint Chiefs. White House declines to characterise outcomes.',
    image: img('whitehouse,oval,office'),  location: 'Washington D.C. · Politics', credit: 'AP / Evan Vucci',
    bias: { left: 35, center: 30, right: 35 }, totalSources: 267, timestamp: '2 days ago', factuality: 'High', ownership: 'Mixed' },

  /* BLINDSPOT — under-reported by left */
  { id: 's30', category: 'WORLD',     title: 'Death toll in Starobilsk dorm strike rises to 10; Russia claims drone command centre',
    summary: 'Yesterday’s attack on Russian-occupied Luhansk killed ten and injured 38. Ukraine claims the building housed a drone command centre rather than civilians.',
    image: img('ukraine,conflict,destruction'),  location: 'Luhansk · War', credit: 'AFP / Stringer',
    bias: { left: 18, center: 45, right: 37 }, totalSources: 198, timestamp: '2 days ago',
    isBlindspot: true, blindspotSide: 'left', factuality: 'Mostly factual', ownership: 'Mixed' },
];

/* ── DAILY BRIEFING ─────────────────────────────────────────── */
export interface DailyBriefing {
  title:        string;
  storyCount:   number;
  articleCount: number;
  readTime:     string;
  topStoryId:   string;
  bullets:      string[];
}
export const DAILY_BRIEFING: DailyBriefing = {
  title:        'India’s economy crosses Japan; OpenAI loses NYT case; Cloudflare outage; and more.',
  storyCount:   8,
  articleCount: 685,
  readTime:     '8m read',
  topStoryId:   's1',
  bullets: [
    'India overtakes Japan as third-largest economy',
    'OpenAI loses landmark New York Times copyright case',
    'Arctic sea ice hits lowest May extent on record',
    'Senate rejects $89B defense supplemental',
    'NATO calls emergency meeting after Ukraine incident',
  ],
};

/* ── TRENDING INTEREST TOPICS ────────────────────────────────── */
export interface InterestTopic {
  id:    string;
  label: string;
  count: number;  /* stories trending in this topic right now */
  emoji: string;
}
export const TRENDING_TOPICS: InterestTopic[] = [
  { id: 't1',  label: 'Artificial Intelligence',  count: 47, emoji: '🤖' },
  { id: 't2',  label: 'Business & Markets',       count: 89, emoji: '📈' },
  { id: 't3',  label: 'Climate',                  count: 32, emoji: '🌍' },
  { id: 't4',  label: 'World Cup',                count: 28, emoji: '⚽' },
  { id: 't5',  label: 'Memorial Day',             count: 15, emoji: '🇺🇸' },
  { id: 't6',  label: 'Cannes Film Festival',     count: 21, emoji: '🎬' },
  { id: 't7',  label: 'Inflation',                count: 43, emoji: '💰' },
  { id: 't8',  label: 'Donald Trump',             count: 124, emoji: '🇺🇸' },
  { id: 't9',  label: 'Health & Medicine',        count: 56, emoji: '🩺' },
  { id: 't10', label: 'Social Media',             count: 38, emoji: '📱' },
  { id: 't11', label: 'Soccer',                   count: 19, emoji: '⚽' },
  { id: 't12', label: 'Extreme Weather',          count: 41, emoji: '🌪️' },
  { id: 't13', label: 'Baseball',                 count: 17, emoji: '⚾' },
  { id: 't14', label: 'Ukraine War',              count: 67, emoji: '🇺🇦' },
  { id: 't15', label: 'NFL',                      count: 22, emoji: '🏈' },
];

/* ── REGIONS ─────────────────────────────────────────────────── */
export const REGIONS: { id: string; label: string }[] = [
  { id: 'world',   label: 'World'         },
  { id: 'na',      label: 'North America' },
  { id: 'sa',      label: 'South America' },
  { id: 'eu',      label: 'Europe'        },
  { id: 'asia',    label: 'Asia'          },
  { id: 'au',      label: 'Australia'     },
  { id: 'africa',  label: 'Africa'        },
];

/* ═════════════════════════════════════════════════════════════════
   LONG READ INDEX — 50 articles + 15 opinions + 8 most-read +
   4 features + 4 podcasts.
   Images use LoremFlickr with topic-matched keywords + lock=1 so
   each URL consistently returns the same on-topic photo.
═════════════════════════════════════════════════════════════════ */

export interface LongReadItem {
  slug:        string;
  kicker:      string;
  title:       string;
  deck:        string;
  author:      string;
  authorPhoto: string;
  readTime:    string;
  image:       string;
  timestamp:   string;
}

export interface OpinionPiece {
  slug:        string;
  author:      string;
  authorPhoto: string;
  title:       string;
  isCartoon?:  boolean;
}

export interface MostReadItem {
  rank:    number;
  kicker?: string;
  title:   string;
}

export interface FeatureCard {
  slug:   string;
  type:   string;
  title:  string;
  author: string;
  image:  string;
}

export interface PodcastItem {
  slug:        string;
  show:        string;
  title:       string;
  duration:    string;
  authorPhoto: string;
}

/* Topic-matched image helper. Picsum serves a stable, reliable photo per
   seed (LoremFlickr was flaky and left broken image slots). The seed is the
   tag string, so each story keeps a consistent image across reloads. */
const img = (tags: string): string =>
  `https://picsum.photos/seed/${encodeURIComponent(tags)}/1200/800`;

/* ── 50 LONG READS ─────────────────────────────────────────── */
export const LONG_READS: LongReadItem[] = [
  /* Top stories — media, tech, business, world */
  { slug: 'slow-death-of-local-news', kicker: 'MEDIA', title: 'The slow death of local news', deck: 'Why 2,547 American newsrooms have closed since 2005 — and what quietly disappears with them.', author: 'Maya Krishnan', authorPhoto: 'https://picsum.photos/seed/auth-1/120/120', readTime: '14 min', image: img('newsroom,newspaper'), timestamp: '4h ago' },
  { slug: 'ai-writes-the-news', kicker: 'TECHNOLOGY', title: 'When AI writes the news: 18 months inside Reuters', deck: 'The wire service quietly ran a generative-AI editorial pilot. The results trouble even the people who built it.', author: 'Marcus Chen', authorPhoto: 'https://picsum.photos/seed/auth-2/120/120', readTime: '18 min', image: img('artificial,intelligence,computer'), timestamp: '6h ago' },
  { slug: 'openai-boardroom-crisis', kicker: 'TECHNOLOGY', title: 'The OpenAI boardroom crisis, three months later', deck: 'A reconstruction of the 72 hours that nearly ended the most important company in tech.', author: 'Sara Liu', authorPhoto: 'https://picsum.photos/seed/auth-3/120/120', readTime: '12 min', image: img('boardroom,office,corporate'), timestamp: '8h ago' },
  { slug: 'brittle-supply-chains', kicker: 'BUSINESS', title: 'Inside the brittle architecture of global supply chains', deck: 'Three port closures, one chip shortage, and the quiet rewiring of how the world moves goods.', author: 'Ananya Rao', authorPhoto: 'https://picsum.photos/seed/auth-4/120/120', readTime: '15 min', image: img('shipping,port,container'), timestamp: '12h ago' },
  { slug: 'india-railways-engineer', kicker: 'PROFILE', title: 'The 70-year-old engineer rebuilding India’s railways', deck: 'After five decades inside the world’s largest employer, Suresh Iyer oversees the biggest rail programme since independence.', author: 'Vikram Mehta', authorPhoto: 'https://picsum.photos/seed/auth-5/120/120', readTime: '11 min', image: img('train,railway,india'), timestamp: '14h ago' },
  { slug: 'vanishing-american-mall', kicker: 'CULTURE', title: 'The vanishing of the American shopping mall', deck: 'They were the cathedrals of the postwar consumer economy. Now half are gone.', author: 'Priya Subramanian', authorPhoto: 'https://picsum.photos/seed/auth-6/120/120', readTime: '13 min', image: img('mall,shopping,empty'), timestamp: '16h ago' },
  { slug: 'climate-capital-migration', kicker: 'CLIMATE', title: 'Climate, capital, and the great migration of money', deck: 'How $1.4 trillion of insurance and pension assets is quietly relocating ahead of the physical-risk curve.', author: 'Lin Wei', authorPhoto: 'https://picsum.photos/seed/auth-7/120/120', readTime: '16 min', image: img('flood,coast,climate'), timestamp: '18h ago' },
  { slug: 'lagos-megaproject', kicker: 'WORLD', title: 'A year inside a Lagos megaproject', deck: 'Eko Atlantic is a city of 250,000 being built on land reclaimed from the Atlantic.', author: 'Daniel Okafor', authorPhoto: 'https://picsum.photos/seed/auth-8/120/120', readTime: '17 min', image: img('lagos,construction,skyline'), timestamp: '20h ago' },
  { slug: 'rural-japan-ageing', kicker: 'WORLD', title: 'How rural Japan is teaching the world to age', deck: 'In a village of 1,400 — average age 71 — researchers are quietly building the future of elder care.', author: 'Kenji Yamamoto', authorPhoto: 'https://picsum.photos/seed/auth-9/120/120', readTime: '14 min', image: img('japan,village,countryside'), timestamp: '22h ago' },
  { slug: 'american-homelessness', kicker: 'SOCIETY', title: 'The new geography of American homelessness', deck: 'It has moved out of the cities. Where it has gone, and who it has become, is reshaping politics.', author: 'Rachel Goldman', authorPhoto: 'https://picsum.photos/seed/auth-10/120/120', readTime: '19 min', image: img('homeless,street,city'), timestamp: 'Yesterday' },
  { slug: 'tigray-war-women', kicker: 'WORLD', title: 'What happened to the women of the Tigray war', deck: 'Four years after the ceasefire, a generation lives with what was done to it.', author: 'Amare Tesfaye', authorPhoto: 'https://picsum.photos/seed/auth-11/120/120', readTime: '22 min', image: img('ethiopia,village,mountain'), timestamp: 'Yesterday' },
  { slug: 'saudi-industrialization', kicker: 'WORLD', title: 'The quiet industrialization of Saudi Arabia', deck: 'Beneath the Vision 2030 PR is a real manufacturing build-out — and a labour bet whose stakes are now national.', author: 'Mohammed Al-Rashid', authorPhoto: 'https://picsum.photos/seed/auth-12/120/120', readTime: '16 min', image: img('saudi,factory,desert'), timestamp: 'Yesterday' },
  { slug: 'arctic-shipping-routes', kicker: 'CLIMATE', title: 'The new shipping lanes opening above the Arctic Circle', deck: 'Russian, Chinese, and Norwegian operators are charting routes that didn’t exist a decade ago. The geopolitics is just starting.', author: 'Nina Halvorsen', authorPhoto: 'https://picsum.photos/seed/auth-13/120/120', readTime: '15 min', image: img('arctic,icebreaker,ship'), timestamp: '2 days ago' },
  { slug: 'crispr-clinic', kicker: 'SCIENCE', title: 'Inside the first walk-in CRISPR clinic', deck: 'In Singapore, gene-editing therapy is becoming as routine as an MRI. The ethics are catching up slowly.', author: 'Wei Tan', authorPhoto: 'https://picsum.photos/seed/auth-14/120/120', readTime: '13 min', image: img('laboratory,microscope,science'), timestamp: '2 days ago' },
  { slug: 'venture-capital-collapse', kicker: 'BUSINESS', title: 'The quiet collapse of the venture-capital model', deck: 'The numbers that defined Silicon Valley for forty years have stopped working.', author: 'Jordan Klein', authorPhoto: 'https://picsum.photos/seed/auth-15/120/120', readTime: '17 min', image: img('sanfrancisco,startup,office'), timestamp: '2 days ago' },
  { slug: 'argentina-experiment', kicker: 'WORLD', title: 'The Argentine experiment that no one expected to work', deck: 'Two years in, Javier Milei’s shock therapy has done what economists said was impossible — and what they warned against.', author: 'Lucía Fernández', authorPhoto: 'https://picsum.photos/seed/auth-16/120/120', readTime: '20 min', image: img('buenosaires,argentina,city'), timestamp: '3 days ago' },
  { slug: 'amazon-warehouse-life', kicker: 'INVESTIGATION', title: 'A year inside an Amazon fulfillment centre', deck: 'Eight reporters spent twelve months working the floor. This is what the algorithm felt like from inside.', author: 'Pablo Mendoza', authorPhoto: 'https://picsum.photos/seed/auth-17/120/120', readTime: '24 min', image: img('warehouse,worker,boxes'), timestamp: '3 days ago' },
  { slug: 'taiwan-semiconductors', kicker: 'TECHNOLOGY', title: 'The semiconductor map is being redrawn', deck: 'TSMC is no longer the only game. A reporting trip through the new fabs in Arizona, Dresden, and Kumamoto.', author: 'Sara Liu', authorPhoto: 'https://picsum.photos/seed/auth-3/120/120', readTime: '21 min', image: img('semiconductor,chip,silicon'), timestamp: '4 days ago' },
  { slug: 'congo-cobalt', kicker: 'INVESTIGATION', title: 'The 9-year-olds who mine the cobalt in your phone', deck: 'A six-month investigation into the artisanal supply chain that powers the world’s electric-vehicle transition.', author: 'Daniel Okafor', authorPhoto: 'https://picsum.photos/seed/auth-8/120/120', readTime: '28 min', image: img('mining,africa,cobalt'), timestamp: '4 days ago' },
  { slug: 'private-equity-hospitals', kicker: 'INVESTIGATION', title: 'When private equity owns your hospital', deck: 'Patient mortality, staffing cuts, and the financial engineering behind 400 American hospital closures.', author: 'Rachel Goldman', authorPhoto: 'https://picsum.photos/seed/auth-10/120/120', readTime: '23 min', image: img('hospital,medical,corridor'), timestamp: '5 days ago' },
  { slug: 'antarctic-station', kicker: 'SCIENCE', title: 'The Antarctic station preparing for life on Mars', deck: 'Concordia Base is the closest thing on Earth to another planet. Three winters spent there.', author: 'Henri Dubois', authorPhoto: 'https://picsum.photos/seed/auth-19/120/120', readTime: '17 min', image: img('antarctic,research,station'), timestamp: '5 days ago' },
  { slug: 'iran-women-protests', kicker: 'WORLD', title: 'The Iranian women who refused to stop', deck: 'Three years after Mahsa Amini, a quieter, more organised resistance is shaping the country’s political future.', author: 'Maryam Hosseini', authorPhoto: 'https://picsum.photos/seed/auth-20/120/120', readTime: '19 min', image: img('iran,tehran,protest'), timestamp: '6 days ago' },
  { slug: 'crypto-after-collapse', kicker: 'BUSINESS', title: 'Crypto, after the collapse', deck: 'FTX. Terra. Celsius. The retail wave is gone. What is being built in its absence is stranger and more durable.', author: 'Jordan Klein', authorPhoto: 'https://picsum.photos/seed/auth-15/120/120', readTime: '14 min', image: img('bitcoin,cryptocurrency'), timestamp: '6 days ago' },
  { slug: 'fertility-decline', kicker: 'SOCIETY', title: 'The fertility decline no one saw coming', deck: 'South Korea hit 0.72. Italy is at 1.2. The US just crossed below 1.6.', author: 'Sophia Bauer', authorPhoto: 'https://picsum.photos/seed/auth-22/120/120', readTime: '18 min', image: img('cradle,baby,family'), timestamp: '1 week ago' },
  { slug: 'gulf-water-crisis', kicker: 'CLIMATE', title: 'The Gulf is running out of fresh water — and no one is talking about it', deck: 'Saudi Arabia and the UAE’s aquifers are 80 percent depleted.', author: 'Mohammed Al-Rashid', authorPhoto: 'https://picsum.photos/seed/auth-12/120/120', readTime: '20 min', image: img('desert,dune,arid'), timestamp: '1 week ago' },
  { slug: 'k-drama-soft-power', kicker: 'CULTURE', title: 'How Seoul became the world capital of soft power', deck: 'Government policy, cheap broadband, and a generation of obsessive showrunners. The Korean Wave was not an accident.', author: 'Ji-Hye Park', authorPhoto: 'https://picsum.photos/seed/auth-24/120/120', readTime: '15 min', image: img('seoul,korea,television'), timestamp: '1 week ago' },
  { slug: 'antibiotic-resistance', kicker: 'HEALTH', title: 'The post-antibiotic world is closer than you think', deck: 'Cases of total-resistance bacterial infection have doubled in five years. The drug pipeline is empty.', author: 'Dr. Anjali Kapoor', authorPhoto: 'https://picsum.photos/seed/auth-25/120/120', readTime: '16 min', image: img('bacteria,microscope,medicine'), timestamp: '1 week ago' },
  { slug: 'german-far-right', kicker: 'POLITICS', title: 'How the German far-right normalised itself', deck: 'AfD now polls third nationally. A reporting trip through five towns shows the slow, deliberate machinery behind it.', author: 'Klaus Mueller', authorPhoto: 'https://picsum.photos/seed/auth-26/120/120', readTime: '21 min', image: img('germany,protest,flag'), timestamp: '2 weeks ago' },
  { slug: 'mexico-cartel-economy', kicker: 'INVESTIGATION', title: 'The cartel businesses you’ve never heard of', deck: 'Avocados, limes, lithium, fish. The Mexican drug cartels diversified.', author: 'Sofía Ramírez', authorPhoto: 'https://picsum.photos/seed/auth-27/120/120', readTime: '23 min', image: img('mexico,border,truck'), timestamp: '2 weeks ago' },
  { slug: 'paris-olympics-after', kicker: 'PROFILE', title: 'Paris, two years after the Olympics', deck: 'What the 2024 Games did to the city, the suburbs, and the people who never wanted them.', author: 'Anne Lacroix', authorPhoto: 'https://picsum.photos/seed/auth-28/120/120', readTime: '14 min', image: img('paris,olympic,stadium'), timestamp: '2 weeks ago' },

  /* ── POLITICS (5) ─────────────────────────────────────────── */
  { slug: 'end-of-bipartisan-center', kicker: 'POLITICS', title: 'The end of the bipartisan center', deck: 'For forty years, a Washington middle existed where deals were made. We tracked its last 200 members.', author: 'Klaus Mueller', authorPhoto: 'https://picsum.photos/seed/auth-26/120/120', readTime: '18 min', image: img('capitol,washington,congress'), timestamp: '4h ago' },
  { slug: 'districting-2030', kicker: 'POLITICS', title: 'Why congressional districting may not survive 2030', deck: 'Three Supreme Court cases, two state experiments, and one quiet movement to abolish single-member districts.', author: 'Rachel Goldman', authorPhoto: 'https://picsum.photos/seed/auth-10/120/120', readTime: '15 min', image: img('voting,ballot,election'), timestamp: '7h ago' },
  { slug: 'quiet-coalition', kicker: 'POLITICS', title: 'The Quiet Coalition: how the new Republican-Democrat split formed', deck: 'It happened in school boards before it happened in Washington. A demographic and economic re-sorting reshaping every election.', author: 'David Brooks', authorPhoto: 'https://picsum.photos/seed/op-6/120/120', readTime: '22 min', image: img('rally,politics,crowd'), timestamp: '11h ago' },
  { slug: 'france-after-macron', kicker: 'POLITICS', title: 'France after Macron: the rebuilding of the center-right', deck: 'Les Républicains were left for dead in 2017. How they came back.', author: 'Anne Lacroix', authorPhoto: 'https://picsum.photos/seed/auth-28/120/120', readTime: '19 min', image: img('paris,france,parliament'), timestamp: '15h ago' },
  { slug: 'india-election-commission', kicker: 'POLITICS', title: 'India’s Election Commission and the limits of independence', deck: 'The ECI ran the largest election in human history. Five former commissioners speak — for the first time — about what it cost.', author: 'Pratap Bhanu Mehta', authorPhoto: 'https://picsum.photos/seed/op-9/120/120', readTime: '16 min', image: img('india,election,voting'), timestamp: '1 day ago' },

  /* ── SPORTS (5) ───────────────────────────────────────────── */
  { slug: 'cfb-after-playoff', kicker: 'SPORTS', title: 'The economics of college football after the playoff expansion', deck: 'The 12-team CFP has reshaped athletic department budgets, conference television deals, and the meaning of the regular season.', author: 'Marcus Chen', authorPhoto: 'https://picsum.photos/seed/auth-2/120/120', readTime: '14 min', image: img('football,stadium,american'), timestamp: '5h ago' },
  { slug: 'south-korea-olympic-dynasty', kicker: 'SPORTS', title: 'How South Korea engineered an Olympic dynasty', deck: 'A 1970s government memo, a 1990s academy programme, and a 2010s data-science overhaul.', author: 'Ji-Hye Park', authorPhoto: 'https://picsum.photos/seed/auth-24/120/120', readTime: '18 min', image: img('archery,olympic,athlete'), timestamp: '9h ago' },
  { slug: 'middle-class-athlete', kicker: 'SPORTS', title: 'The vanishing American middle-class athlete', deck: 'Travel teams, private coaches, year-round leagues. The economics of youth sport have priced out the families that once dominated it.', author: 'Rachel Goldman', authorPhoto: 'https://picsum.photos/seed/auth-10/120/120', readTime: '15 min', image: img('youth,sport,training'), timestamp: '13h ago' },
  { slug: 'f1-carbon-fiber', kicker: 'SPORTS', title: 'Inside the F1 carbon-fiber arms race', deck: 'A factory tour with the four constructors who actually make the chassis. The technology has separated from the racing.', author: 'Henri Dubois', authorPhoto: 'https://picsum.photos/seed/auth-19/120/120', readTime: '17 min', image: img('formula1,racecar,motorsport'), timestamp: '17h ago' },
  { slug: 'ipl-academies', kicker: 'SPORTS', title: 'The IPL’s secret weapon: ten thousand under-15 academies', deck: 'India’s cricket ecosystem is no longer about Mumbai or Bangalore. The new talent base is rural, federally funded, and global.', author: 'Vikram Mehta', authorPhoto: 'https://picsum.photos/seed/auth-5/120/120', readTime: '13 min', image: img('cricket,batting,india'), timestamp: 'Yesterday' },

  /* ── MUSIC (5) ────────────────────────────────────────────── */
  { slug: 'algorithm-as-ar', kicker: 'MUSIC', title: 'When the algorithm became the A&R: 18 months inside Spotify', deck: 'A look at the team that quietly replaced the music-industry tastemaker — and what they say about the songs you love.', author: 'Sara Liu', authorPhoto: 'https://picsum.photos/seed/auth-3/120/120', readTime: '16 min', image: img('recording,studio,music'), timestamp: '6h ago' },
  { slug: 'k-pop-after-k-pop', kicker: 'MUSIC', title: 'K-pop, after K-pop: where Hallyu goes next', deck: 'The four major Korean labels are pivoting — to AI artists, Western co-writes, and Latin distribution.', author: 'Ji-Hye Park', authorPhoto: 'https://picsum.photos/seed/auth-24/120/120', readTime: '14 min', image: img('kpop,concert,stage'), timestamp: '10h ago' },
  { slug: 'death-of-album', kicker: 'MUSIC', title: 'The slow death of the album: what comes after the song', deck: 'Spotify, TikTok, and the playlist economy have unbundled the LP.', author: 'Pablo Mendoza', authorPhoto: 'https://picsum.photos/seed/auth-17/120/120', readTime: '12 min', image: img('vinyl,record,turntable'), timestamp: '14h ago' },
  { slug: 'berlin-last-club', kicker: 'MUSIC', title: 'Inside Berlin’s last great club', deck: 'Berghain was once one of fifty. It is now one of three.', author: 'Klaus Mueller', authorPhoto: 'https://picsum.photos/seed/auth-26/120/120', readTime: '17 min', image: img('nightclub,berlin,nightlife'), timestamp: '18h ago' },
  { slug: 'african-pop-world', kicker: 'MUSIC', title: 'How African pop conquered the world without crossing it', deck: 'Afrobeats, Amapiano, Pidgin rap. The streams are global but the industry stayed local.', author: 'Daniel Okafor', authorPhoto: 'https://picsum.photos/seed/auth-8/120/120', readTime: '19 min', image: img('lagos,music,africa'), timestamp: 'Yesterday' },

  /* ── MILITARY (5) ─────────────────────────────────────────── */
  { slug: 'drone-war-no-end', kicker: 'MILITARY', title: 'The drone war that didn’t end', deck: 'Three years after the official US withdrawal, the targeted-strike programme runs at higher tempo than ever. We mapped it.', author: 'Maryam Hosseini', authorPhoto: 'https://picsum.photos/seed/auth-20/120/120', readTime: '21 min', image: img('drone,military,aircraft'), timestamp: '3h ago' },
  { slug: 'pentagon-silicon-valley', kicker: 'MILITARY', title: 'Pentagon vs. Silicon Valley: the procurement battle', deck: 'Anduril, Palantir, Shield AI. The new defense primes are now bigger than the old ones in their categories.', author: 'Marcus Chen', authorPhoto: 'https://picsum.photos/seed/auth-2/120/120', readTime: '18 min', image: img('pentagon,defense,military'), timestamp: '8h ago' },
  { slug: 'european-rearmament', kicker: 'MILITARY', title: 'The European rearmament gamble', deck: 'Germany has tripled defense spending. France is mass-producing artillery shells. Poland fields the largest land army in Europe.', author: 'Klaus Mueller', authorPhoto: 'https://picsum.photos/seed/auth-26/120/120', readTime: '16 min', image: img('tank,army,military'), timestamp: '12h ago' },
  { slug: 'ukrainian-special-forces', kicker: 'MILITARY', title: 'A year embedded with Ukrainian special forces', deck: 'Pablo Mendoza spent twelve months with three SSO units. The story of a doctrine being invented in real time.', author: 'Pablo Mendoza', authorPhoto: 'https://picsum.photos/seed/auth-17/120/120', readTime: '26 min', image: img('soldier,combat,uniform'), timestamp: '16h ago' },
  { slug: 'chinese-carrier-fleet', kicker: 'MILITARY', title: 'The Chinese carrier fleet, and what comes next', deck: 'Three carriers, two more under construction, and a Pacific posture that has quietly changed the operational calculus of the US Navy.', author: 'Lin Wei', authorPhoto: 'https://picsum.photos/seed/auth-7/120/120', readTime: '17 min', image: img('aircraftcarrier,navy,ship'), timestamp: '20h ago' },
];

/* ── 15 OPINION PIECES ─────────────────────────────────────── */
export const OPINIONS: OpinionPiece[] = [
  { slug: 'forgot-news', author: 'Yair Rosenberg', authorPhoto: 'https://picsum.photos/seed/op-1/120/120', title: 'We forgot what news was for. The internet didn’t cause it.' },
  { slug: 'ai-mod-error', author: 'Renée DiResta', authorPhoto: 'https://picsum.photos/seed/op-2/120/120', title: 'Why AI moderation is a category error' },
  { slug: 'against-gen-search', author: 'Casey Newton', authorPhoto: 'https://picsum.photos/seed/op-3/120/120', title: 'The case against generative search' },
  { slug: 'shutting-down-paper', author: 'Sandra Pittman', authorPhoto: 'https://picsum.photos/seed/op-4/120/120', title: 'What I learned shutting down my newspaper' },
  { slug: 'local-witnesses', author: 'Margaret Sullivan', authorPhoto: 'https://picsum.photos/seed/op-5/120/120', title: 'Local democracy needs local witnesses' },
  { slug: 'patriotism-revival', author: 'David Brooks', authorPhoto: 'https://picsum.photos/seed/op-6/120/120', title: 'The patriotism we’re going to need' },
  { slug: 'climate-grief', author: 'Naomi Klein', authorPhoto: 'https://picsum.photos/seed/op-7/120/120', title: 'On the uses, and limits, of climate grief' },
  { slug: 'argentina-lesson', author: 'Tyler Cowen', authorPhoto: 'https://picsum.photos/seed/op-8/120/120', title: 'The Argentine lesson nobody wants to learn' },
  { slug: 'india-amritkaal', author: 'Pratap Bhanu Mehta', authorPhoto: 'https://picsum.photos/seed/op-9/120/120', title: 'India’s “Amrit Kaal” and the politics of nostalgia' },
  { slug: 'wellness-trap', author: 'Edith Pritchett', authorPhoto: 'https://picsum.photos/seed/op-10/120/120', title: 'Cartoon: The wellness industry has crowned a new health food', isCartoon: true },
  { slug: 'taiwan-clarity', author: 'David Ignatius', authorPhoto: 'https://picsum.photos/seed/op-11/120/120', title: 'On Taiwan, ambiguity has run out of road' },
  { slug: 'second-term-reckless', author: 'Fareed Zakaria', authorPhoto: 'https://picsum.photos/seed/op-12/120/120', title: 'Donald Trump’s incredibly reckless second term' },
  { slug: 'fertility-honesty', author: 'Ross Douthat', authorPhoto: 'https://picsum.photos/seed/op-13/120/120', title: 'We need an honest conversation about fertility' },
  { slug: 'gender-language', author: 'Lionel Shriver', authorPhoto: 'https://picsum.photos/seed/op-14/120/120', title: 'What we lose when we lose specific words' },
  { slug: 'editorial-newzealand', author: 'Editorial Board', authorPhoto: 'https://picsum.photos/seed/op-15/120/120', title: 'A warning from New Zealand on press freedom' },
];

/* ── 8 MOST READ ──────────────────────────────────────────── */
export const MOST_READ: MostReadItem[] = [
  { rank: 1, title: 'The slow death of local news' },
  { rank: 2, kicker: 'OPINION', title: 'We forgot what news was for. The internet didn’t cause it.' },
  { rank: 3, title: 'When AI writes the news: 18 months inside Reuters' },
  { rank: 4, title: 'The 70-year-old engineer rebuilding India’s railways' },
  { rank: 5, title: 'Inside the brittle architecture of global supply chains' },
  { rank: 6, kicker: 'OPINION', title: 'The case against generative search' },
  { rank: 7, title: 'A year inside an Amazon fulfillment centre' },
  { rank: 8, title: 'Crypto, after the collapse' },
];

/* ── 4 FEATURE CARDS (RIG WIRE INTELLIGENCE band) ────────── */
export const FEATURES: FeatureCard[] = [
  { slug: 'disappearing-daily', type: 'PHOTOGRAPHY', title: 'The disappearing daily: 14 American newsrooms, photographed on their last day', author: 'Pablo Mendoza', image: img('newspaper,print,reporter') },
  { slug: 'where-newsrooms-went', type: 'INVESTIGATION', title: 'Where did America’s local newspapers go? An interactive county map.', author: 'Rig Wire Data', image: img('map,america,data') },
  { slug: 'meaning-town-paper', type: 'ESSAY', title: 'On the meaning of a town newspaper — and what we don’t yet know about its absence', author: 'James Fallows', image: img('newspaper,smalltown,print') },
  { slug: 'econ-geography-news', type: 'ANALYSIS', title: 'The economic geography of news: who pays, who reads, who pays attention', author: 'Felix Salmon', image: img('graph,chart,economy') },
];

/* ── 4 PODCASTS (Listen band) ─────────────────────────────── */
export const PODCASTS: PodcastItem[] = [
  { slug: 'pod-1', show: 'IMPROMPTU', title: 'Is life really better in Europe? It’s not so simple.', duration: '13 min', authorPhoto: 'https://picsum.photos/seed/pod-1/120/120' },
  { slug: 'pod-2', show: 'POST REPORTS', title: 'Inside the cobalt mines that power the EV transition', duration: '28 min', authorPhoto: 'https://picsum.photos/seed/pod-2/120/120' },
  { slug: 'pod-3', show: 'FIVE-MINUTE FIX', title: 'What the Senate said no to this week', duration: '6 min', authorPhoto: 'https://picsum.photos/seed/pod-3/120/120' },
  { slug: 'pod-4', show: 'CAN HE DO THAT', title: 'The president, the courts, and the executive order', duration: '19 min', authorPhoto: 'https://picsum.photos/seed/pod-4/120/120' },
];

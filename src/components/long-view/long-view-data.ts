/* ═════════════════════════════════════════════════════════════════
   THE LONG VIEW — retrospective analyses. Each piece looks back
   at an event N months/years later, asking what we got right and
   what we missed.
═════════════════════════════════════════════════════════════════ */

export interface LongViewEntry {
  id:        string;
  number:    string;     /* roman numeral or two-digit count */
  kicker:    string;     /* "POLITICS · 8 YEARS LATER" */
  title:     string;
  intro:     string;     /* 2-3 sentence pull, like a notebook entry */
  body:      string;     /* longer reflection, ~1 paragraph */
  margin?:   string;     /* hand-written margin note */
  highlight?: string;    /* a phrase highlighted in yellow within intro */
  byline:    string;
  date:      string;
  readTime:  string;
  pageNo:    number;     /* notebook page number */
}

export const LONG_VIEW: LongViewEntry[] = [
  {
    id: 'openai-3months',
    number: 'I',
    kicker: 'TECHNOLOGY · 3 MONTHS LATER',
    title: 'The OpenAI boardroom, three months on',
    intro: 'A reconstruction of the 72 hours that nearly ended the most important company in tech — and the slower reckoning that followed. What the board got wrong was less interesting than what it got, in private, right.',
    body: 'Two months after the dust settled, no one inside the company will speak on the record. Off the record, the answers are surprisingly consistent: the board was right to be worried, and almost everything about how they acted on that worry was wrong. The structural problem — a nonprofit foundation overseeing a $100 billion business — is unsolved. It will recur.',
    margin: 'cf. Carmack memo, p. 14',
    highlight: 'almost everything about how they acted on that worry was wrong',
    byline: 'Sara Liu',
    date: 'May 23, 2026',
    readTime: '12 min',
    pageNo: 1,
  },
  {
    id: 'brexit-8years',
    number: 'II',
    kicker: 'POLITICS · 8 YEARS LATER',
    title: 'Brexit, the verdict at eight years',
    intro: 'In June 2016, 52 percent of British voters chose to leave the European Union. Eight years later, the picture is clear enough to write down. Most predictions were wrong; some were prescient; none were neutral.',
    body: 'The economy is roughly 4 percent smaller than the counter-factual would suggest. London is no longer the financial capital of Europe; Amsterdam, Paris, and Dublin have absorbed the displaced volume. Northern Ireland has, against expectation, become the most economically integrated part of the UK by virtue of its protocol-mandated dual access. The Scotland question is not closed.',
    margin: 'see L. Sandbu, FT, 14 Mar 2026',
    byline: 'Klaus Mueller',
    date: 'May 21, 2026',
    readTime: '14 min',
    pageNo: 4,
  },
  {
    id: 'covid-five',
    number: 'III',
    kicker: 'HEALTH · 5 YEARS LATER',
    title: 'COVID-19, five years on: what we got right',
    intro: 'Five years after the first lockdowns, the verdict on the public-health response is becoming legible. The vaccines worked. The schools should not have closed for as long. Almost everything in between is contested still.',
    body: 'The mRNA platform delivered. The school-closure debate, which felt intractable in 2021, has been resolved by data: the costs were higher than the benefits, particularly for lower-income children. The lab-leak question remains formally open but has lost the binary cast of its 2021 framing. The Long Covid epidemiology continues to surprise researchers — its true burden is now estimated 30 percent higher than 2023 estimates.',
    margin: 'NEJM retrospective, Apr 2026',
    highlight: 'The vaccines worked',
    byline: 'Dr. Anjali Kapoor',
    date: 'May 19, 2026',
    readTime: '11 min',
    pageNo: 8,
  },
  {
    id: 'arab-spring-15',
    number: 'IV',
    kicker: 'WORLD · 15 YEARS LATER',
    title: 'The Arab Spring, fifteen years on',
    intro: 'A generation has now passed since Mohamed Bouazizi set himself on fire in Sidi Bouzid. Of the eleven countries where mass uprisings occurred, one — Tunisia — built and then lost a functioning democracy. The other ten remain, in different ways, where they were.',
    body: 'The story of the Arab Spring has been told as failure. That telling is partly right and largely incomplete. What persisted is the political imagination — the idea, no longer deniable in any of these societies, that the political order is not natural and is not eternal. Researchers tracking polling data find that this conviction has not weakened. What is missing is institutional infrastructure for translating it into outcomes.',
    byline: 'Maryam Hosseini',
    date: 'May 17, 2026',
    readTime: '16 min',
    pageNo: 12,
  },
  {
    id: 'lehman-17',
    number: 'V',
    kicker: 'MARKETS · 17 YEARS LATER',
    title: 'Lehman, the seventeen-year reckoning',
    intro: 'The global financial crisis is now older than most of the people working in finance. The structural reforms of 2009-2014 either held or didn’t. We can finally tell which.',
    body: 'Dodd-Frank, viewed as overreach at the time, mostly held. Basel III’s capital requirements eliminated the leverage that crashed Lehman in the first place — that piece worked. Where the reforms failed is the regulatory perimeter: shadow banking, hedge funds, and private credit now hold the systemic risks that banks used to. The next crisis, when it comes, will originate there.',
    margin: 'BIS Annual Report, Mar 2026',
    byline: 'Jordan Klein',
    date: 'May 14, 2026',
    readTime: '13 min',
    pageNo: 16,
  },
  {
    id: 'ftx-24months',
    number: 'VI',
    kicker: 'BUSINESS · 24 MONTHS LATER',
    title: 'FTX, an autopsy at two years',
    intro: 'Sam Bankman-Fried is in federal prison. The bankruptcy estate has recovered more than expected. The lessons being drawn are, in some ways, the wrong ones.',
    body: 'The conventional story — a young narcissist defrauded customers — is true and incomplete. The deeper story is about regulatory arbitrage between US, Caribbean, and Asian jurisdictions, the failure of audit firms to detect what was visible in the public balance sheet, and the persistence of celebrity endorsement as a fundamentally unregulated marketing channel. Two of these problems remain. One has gotten worse.',
    byline: 'Marcus Chen',
    date: 'May 11, 2026',
    readTime: '15 min',
    pageNo: 20,
  },
  {
    id: 'india-edu-pandemic',
    number: 'VII',
    kicker: 'SOCIETY · 6 YEARS LATER',
    title: 'India’s pandemic learning loss, six years later',
    intro: 'Indian schools closed for an average of 82 weeks during 2020-2022 — longer than nearly any other country. A new ASER survey, six years on, finds the damage was deeper than even the pessimists predicted.',
    body: 'The reading level of Class V students remains, on average, at a Class II benchmark. The largest losses fell on rural girls in non-Hindi-belt states. The recovery curve is not bending: 2025 numbers were worse than 2023 numbers. A generation of teachers has aged out without ever fully teaching to grade level. The country’s human-capital trajectory has been altered, and is not yet visible in the GDP data because the affected cohort has not yet entered the labour force.',
    margin: 'ASER 2026, p. 47',
    byline: 'Maya Krishnan',
    date: 'May 8, 2026',
    readTime: '14 min',
    pageNo: 24,
  },
  {
    id: 'snowden-decade',
    number: 'VIII',
    kicker: 'PRIVACY · 13 YEARS LATER',
    title: 'Snowden, the verdict at thirteen years',
    intro: 'Edward Snowden died last winter in Moscow. The disclosures that made him famous are now old enough to be evaluated calmly. Most of what they revealed has been normalised; the parts that have not are the parts we should still be talking about.',
    body: 'Bulk metadata collection by the NSA has been narrowed but not eliminated. The Five Eyes intelligence-sharing relationship has, if anything, deepened. What ended is the assumption — universal among technology companies pre-2013 — that customer data could be handed to government without disclosure. The encryption-by-default move at Apple and Google traces directly to the Snowden moment, and is the single durable change.',
    highlight: 'the single durable change',
    byline: 'Renée DiResta',
    date: 'May 4, 2026',
    readTime: '12 min',
    pageNo: 28,
  },
  {
    id: 'paris-10',
    number: 'IX',
    kicker: 'CLIMATE · 10 YEARS LATER',
    title: 'Paris, the ten-year audit',
    intro: 'In December 2015, every country in the world agreed to keep warming below two degrees Celsius, and to aim for 1.5. We are now, definitively, going to miss the 1.5 number. Whether we miss the two-degree number depends on what happens in the next thirty-six months.',
    body: 'Renewables deployment has outpaced every IEA forecast. Coal is in structural decline. Methane emissions, the lower-hanging fruit, have been addressed at scale by 23 countries. None of this has been enough. The gap between policy and physics has widened, not narrowed. The honest framing in 2026 is that Paris was a procedural success and a substantive failure, and the procedural success is what we have to work with.',
    margin: 'IEA Net-Zero update, Apr 26',
    byline: 'Lin Wei',
    date: 'May 2, 2026',
    readTime: '16 min',
    pageNo: 32,
  },
  {
    id: 'trump-first-term-verdict',
    number: 'X',
    kicker: 'POLITICS · 9 YEARS LATER',
    title: 'Trump’s first term: a historian’s verdict',
    intro: 'Enough time has passed to write the first draft of history rather than journalism. Three new scholarly books, taken together, attempt the verdict. They disagree about much. They agree about more than the politics would suggest.',
    body: 'The institutional damage was real and partial. The Justice Department recovered; the courts did not. The presidency as office is more constrained than 2020 commentators predicted; the presidency as political brand is more unconstrained than they predicted. The most important continuity between then and now is not a person but a method: governance by improvisation, defended by claim of mandate, judged by the news cycle rather than by outcome.',
    byline: 'David Brooks',
    date: 'Apr 28, 2026',
    readTime: '15 min',
    pageNo: 36,
  },
];

/* Tab dividers shown on the right edge of the notebook */
export const SECTIONS = [
  { id: 'tech',     label: 'Tech',     color: '#5b21b6' },
  { id: 'pol',      label: 'Politics', color: '#7f1d1d' },
  { id: 'world',    label: 'World',    color: '#1e3a8a' },
  { id: 'business', label: 'Business', color: '#065f46' },
  { id: 'climate',  label: 'Climate',  color: '#0e7490' },
  { id: 'society',  label: 'Society',  color: '#92400e' },
];

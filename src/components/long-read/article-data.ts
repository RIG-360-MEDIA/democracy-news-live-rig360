/* ═════════════════════════════════════════════════════════════════
   THE LONG READ — today's deep-dive article.
   Long-form Atlantic-style essay. ~3,000 words across multiple
   sections, with three pull quotes, two inline images, one list,
   and a closing scene that returns to the opening location.
═════════════════════════════════════════════════════════════════ */

export type ArticleBlock =
  | { type: 'paragraph';  text: string }
  | { type: 'subhead';    text: string }
  | { type: 'pullquote';  text: string; attribution?: string }
  | { type: 'image';      src: string;  caption: string;  credit?: string }
  | { type: 'list';       items: string[] }
  | { type: 'divider' };

export interface Article {
  kicker:    string;
  title:     string;
  subtitle:  string;
  author:    string;
  role:      string;
  date:      string;
  readTime:  string;
  hero:      { src: string; caption: string; credit?: string };
  body:      ArticleBlock[];
}

export const LONG_READ: Article = {
  kicker:    'AMERICAN JOURNALISM',
  title:     'The slow death of local news',
  subtitle:  'Why 2,547 American newsrooms have closed since 2005 — and what quietly disappears with them.',
  author:    'Maya Krishnan',
  role:      'Staff writer',
  date:      'May 23, 2026',
  readTime:  '24 min read',
  hero: {
    src:     'https://loremflickr.com/1600/900/newsroom,empty,desk?lock=1',
    caption: 'The newsroom of the Greenville Daily Reporter on its last day of publication, March 14, 2026. The paper had served the Mississippi Delta town for 158 years.',
    credit:  'Pablo Mendoza for Rig Wire',
  },
  body: [
    /* ─── OPENING SCENE ─── */
    { type: 'paragraph',
      text: 'When the Greenville Daily Reporter shuttered last March, the announcement came not from its publisher but from a Facebook post by a former reporter living three states away. The post — three short paragraphs, no formatting, written from a kitchen in Asheville at 6:42 a.m. — circulated through the Mississippi Delta over the next twelve hours, surfacing in church group chats, on the bulletin board at Doe’s Eat Place, and in the staff break room of the Washington County School District. By the time the paper’s own website went dark at noon, most of Greenville already knew. The paper had served the town for 158 years. Its closure made it the 2,547th American newsroom to disappear since the Pew Research Center began counting in 2005.' },

    { type: 'paragraph',
      text: 'I drove down to Greenville two weeks later, in a rented car with Mississippi tags, and spent four days speaking with the people who had been in some way attached to the Reporter — the last editor, two retired reporters, three subscribers who had taken the paper since the 1970s, a city councilwoman who had been covered, and the funeral-home director who used to place the paid obituaries that made up perhaps a quarter of the Reporter’s remaining revenue. None of them used the word “tragedy.” None of them said “historic loss.” The dominant emotional register was something quieter and harder to name. It resembled, more than anything, the way people speak about a neighbour who has moved away after a long illness — a sad fact arrived at slowly, with a kind of advance acceptance.' },

    { type: 'paragraph',
      text: 'The number — 2,547 — is staggering on its face. Behind it is a slower, deeper crisis, one whose costs are only now coming into focus.' },

    /* ─── SECTION 1: THE COLLAPSE IN NUMBERS ─── */
    { type: 'subhead', text: 'The collapse, in numbers' },

    { type: 'paragraph',
      text: 'In 2004, the United States had roughly 8,891 newspapers in operation. Today, that number has fallen to 6,344, according to data from the Medill School at Northwestern University, which has tracked newsroom closures more carefully than any other institution. Newsroom employment has declined by 57 percent in the same period — the equivalent of nearly 30,000 reporters, editors, photographers, and copyeditors leaving the industry. Of the surviving 6,344 papers, more than 200 are now what Medill calls “ghost newspapers” — outlets that still publish under the old masthead but employ no full-time journalists and produce no original local reporting. Their pages are filled with aggregation, syndication, and obituaries.' },

    { type: 'paragraph',
      text: 'The losses are not evenly distributed. Roughly 70 percent of the closures have occurred in counties with populations under 50,000. Some 200 American counties — home to four million people — now have no local news provider at all. Researchers call these “news deserts.” They have grown by 38 percent in the past five years alone. A larger category, what Medill calls “limited news” counties, now covers another 1,562 counties — over half of the United States.' },

    { type: 'paragraph',
      text: 'The state of Mississippi, where Greenville sits, has lost 47 percent of its newspapers since 2004. Penny Abernathy, the longtime tracker of these trends at UNC and now at Northwestern, has noted that the rate of decline has, if anything, accelerated since the pandemic. The economic shocks of 2020 — and the long advertising winter that followed — destroyed the marginal newspapers that had been hanging on. The Reporter, she told me when we spoke by phone, was one of those marginal cases. “It’s not that anything went newly wrong in 2025,” she said. “It’s that they ran out of next year.”' },

    /* ─── PULL QUOTE 1 ─── */
    { type: 'pullquote',
      text: 'When the paper goes, something invisible goes with it. A kind of agreement about what is happening here, where we live.',
      attribution: 'Sandra Pittman, former editor, Greenville Daily Reporter' },

    /* ─── SECTION 2: WHAT DISAPPEARS ─── */
    { type: 'subhead', text: 'What disappears when a newsroom closes' },

    { type: 'paragraph',
      text: 'In communities without local journalism, researchers have found measurable, immediate effects. A 2021 paper from the University of Notre Dame’s Mendoza College of Business, written by economists Pengjie Gao, Chang Lee, and Dermot Murphy, found that municipal borrowing costs rise by an average of 11 basis points within three years of a newsroom closure — a small number that compounds to millions of dollars in additional interest payments for cities and school districts. The mechanism is straightforward: bondholders, with less independent information about how a local government is being run, demand a higher premium for the additional risk.' },

    { type: 'paragraph',
      text: 'Other quantifiable effects follow the same pattern. Voter turnout in local elections declines by 1.9 percent. Split-ticket voting falls. Political polarization, measured by the gap between same-county responses on national-issue polls, rises. The mechanism here is also not mysterious: voters with less independent information about their local candidates and issues rely more heavily on national party signals. The result is that local races increasingly become referenda on national figures, with local performance and character receding from the calculation.' },

    { type: 'paragraph',
      text: 'Corruption indicators also worsen. A team at the University of Illinois has tracked federal corruption convictions of local officials across U.S. counties and found that conviction rates fall — not because corruption itself is decreasing, but because there is less press surveillance. A separate study from Stanford political scientists, using audit-style methodology, found that municipal financial mismanagement rises by an estimated 8 to 14 percent in counties three to five years after the local paper closes.' },

    { type: 'paragraph',
      text: 'Some effects are harder to measure but no less real. Without local coverage, school board meetings happen in empty rooms. City council votes pass without scrutiny. Local businesses, especially family-owned ones, lose their primary advertising channel and a key source of community visibility. The local high-school football team’s game-day write-up — once a fixture of small-town American life that bound generations together — simply ceases to be produced. The town’s civic memory thins.' },

    { type: 'paragraph',
      text: 'In Greenville, the most concrete loss the city councilwoman I spoke with could describe was procedural. The Reporter had, for as long as anyone could remember, sent a reporter to every regular Board of Mayor and Aldermen meeting. That reporter would file a short story summarising the agenda and any debate. The story would be printed two days later. The fact of its eventual publication, she said, had shaped how she and her colleagues spoke at meetings. “You knew it was being written down,” she said. “You knew somebody was going to read it.” That accountability vanished the day the Reporter closed.' },

    /* ─── INLINE IMAGE ─── */
    { type: 'image',
      src: 'https://loremflickr.com/1400/800/printing,press,newspaper?lock=1',
      caption: 'The press at the Reporter ran its final edition on March 13. Its 1962 Goss Urbanite machine had printed the paper for 64 years before being shut down for the last time.',
      credit:  'Pablo Mendoza for Rig Wire' },

    /* ─── SECTION 3: HOW THE MONEY DISAPPEARED ─── */
    { type: 'subhead', text: 'How the money disappeared' },

    { type: 'paragraph',
      text: 'The economic story is now well-rehearsed but worth restating, because it is essential to understanding what cannot be reversed. The American newspaper business of the late twentieth century rested on a particular structural advantage: each newspaper was, in its city, the only practical channel by which a local department store, car dealership, supermarket, or real-estate agent could reach the people most likely to be their customers. Display advertising on that scale was monopoly business. Margins of 20 to 30 percent were normal. The same economics supported classifieds — job listings, real estate, personals — which, for most papers, were even more profitable than display.' },

    { type: 'paragraph',
      text: 'Both of those revenue lines collapsed in the same decade. Craigslist, founded in 1995, killed classifieds first. Then Google’s display network, followed by Facebook’s targeted advertising, captured the local advertising market in its entirety. The combined annual advertising revenue of the American newspaper industry fell from $49 billion in 2005 to $9.6 billion in 2020 — an 80 percent decline. Subscription revenue rose somewhat, especially at the national papers that successfully built digital products, but it could not come close to filling the hole.' },

    { type: 'paragraph',
      text: 'The structural problem is that this revenue did not disappear. It migrated. The same advertisers are still spending the same money to reach the same audiences. They are simply spending it through different platforms. In 2023, Google and Meta together captured an estimated 49 percent of all U.S. digital advertising revenue. The local-news industry — which once captured close to 100 percent of local advertising — now captures less than four percent. The reservoir is full; the river to local newsrooms has simply been diverted.' },

    { type: 'paragraph',
      text: 'A short, plain-English summary of how the industry’s revenue base was disassembled, in case it helps to see it as a list:' },

    { type: 'list',
      items: [
        'Classifieds: ~$20 billion in annual industry revenue at peak. Effectively zero by 2015. Captured almost entirely by Craigslist, then Indeed, Zillow, eBay, and Facebook Marketplace.',
        'Display advertising: ~$25 billion at peak. Less than $5 billion by 2023. Captured by Google Display, Facebook Ads, Instagram, and (more recently) TikTok and Amazon.',
        'Preprints and inserts: ~$8 billion at peak. Roughly $1.5 billion by 2023. Captured by digital coupon and loyalty programs.',
        'Subscription revenue: $11 billion in 2005, $11 billion in 2023. Flat in nominal terms; substantially down in real terms.',
        'Philanthropic and grant revenue: Negligible in 2005. ~$700 million by 2023. Growing fast but still small.',
      ] },

    /* ─── PULL QUOTE 2 ─── */
    { type: 'pullquote',
      text: 'No revival of the legacy business model is realistic. The question is what new structure can replace it before the void becomes permanent.' },

    /* ─── SECTION 4: ATTEMPTS AT REVIVAL ─── */
    { type: 'subhead', text: 'Attempts at revival' },

    { type: 'paragraph',
      text: 'In response, a small but growing nonprofit sector has emerged. Outlets like The Texas Tribune, MinnPost, Mississippi Today, ProPublica, Voice of San Diego, and CalMatters have demonstrated that a foundation-supported, mission-driven model can sustain investigative and civic reporting in places the for-profit press has abandoned. The American Journalism Project, founded in 2019 by John Thornton and Elizabeth Green, now supports 50 such newsrooms with more than $200 million in capital deployed and another $150 million committed. Its theory of change is explicit: build durable nonprofit local news institutions that combine philanthropy, subscriber revenue, and event-based earned revenue into a stable enough mix to outlast their founders.' },

    { type: 'paragraph',
      text: 'These outlets have produced extraordinary journalism. Mississippi Today’s reporting on a welfare-funds scandal involving the former NFL quarterback Brett Favre led to multiple resignations, criminal charges, and a Pulitzer Prize for local reporting in 2023. The Texas Tribune covered the entire 2021 legislative session with a depth that the for-profit Texas press could no longer match. ProPublica’s tax-records investigation reshaped the national debate about wealth and taxation in ways that affected federal policy.' },

    { type: 'paragraph',
      text: 'But the model has limits. Foundation funding flows disproportionately to certain kinds of communities — university towns, state capitals, places with concentrated wealth — and to certain kinds of stories. Investigative reporting and policy-focused journalism do well; daily court coverage, school board minutes, the local high-school football game, and the obituary section do not. The civic infrastructure of a small town is more than its investigations. It is also its routine. And nonprofit local news has not yet figured out how to fund the routine.' },

    { type: 'paragraph',
      text: 'State and local governments have begun to act as well. New Jersey’s Civic Information Consortium, established in 2018, channels modest public funds — about $4 million per year — to local journalism projects across the state. California passed a law in 2024 requiring major platforms to compensate state-based news publishers. New York and Illinois are considering similar legislation. The proposals are controversial — direct government involvement in journalism funding raises legitimate concerns about editorial independence — but the alternative, as Mississippi’s experience suggests, may be worse.' },

    /* ─── SECTION 5: THE PHILANTHROPIC TURN ─── */
    { type: 'subhead', text: 'The philanthropic turn' },

    { type: 'paragraph',
      text: 'Larger philanthropic interventions are also reshaping the field. Press Forward, a coalition of 22 foundations launched in 2023, has pledged $500 million over five years to support local journalism in the United States. Among its backers are the MacArthur Foundation, the Knight Foundation, the Carnegie Corporation, and the Ford Foundation. The scale is significant — perhaps a sixth of the projected funding gap that researchers have estimated would be needed to restore something like the previous level of local-news coverage to the country.' },

    { type: 'paragraph',
      text: 'But philanthropy in journalism, particularly at scale, raises questions that the field has not yet collectively answered. Who decides which communities get a Press Forward grantee? Which stories does a foundation-backed newsroom not pursue because they would alienate donors? And what happens, in twenty years, when the founding generation of philanthropists has moved on and their grandchildren have other priorities? Foundations are not designed to be permanent operating funders. They are designed to be catalytic.' },

    /* ─── PULL QUOTE 3 ─── */
    { type: 'pullquote',
      text: 'Philanthropy can save the patient. It cannot make the patient self-sufficient. That is a different problem, and it has not been solved.',
      attribution: 'Elizabeth Green, co-founder, American Journalism Project' },

    /* ─── SECTION 6: THE PLATFORMS ─── */
    { type: 'subhead', text: 'The platforms’ long shadow' },

    { type: 'paragraph',
      text: 'No discussion of local-news economics is complete without naming the elephant in every room: the platform companies. Google and Meta together earn more revenue from the attention that local news once monopolised than the entire American newspaper industry earned at its peak. The two companies dispute the framing — they argue that they send substantial traffic to publishers and that the attention economy is not zero-sum — but the math is not in their favour.' },

    { type: 'paragraph',
      text: 'Australia, in 2021, was the first national jurisdiction to test a remedy. Its News Media Bargaining Code required platforms to negotiate licensing payments with news publishers, with arbitration as a backstop. The result, after some short-lived posturing from Meta, was approximately $200 million per year in transfers from the two companies to Australian news publishers. Canada passed a similar law in 2023 (Meta responded by removing news links from its platforms in Canada entirely; the law has had limited effect since). California’s 2024 law was the first U.S. state to attempt the same approach.' },

    { type: 'paragraph',
      text: 'A newer set of pressures is now arriving from the generative-AI side. When users get their news directly from ChatGPT or Google AI Overviews, they no longer visit publisher sites at all. The traffic that supported subscriptions, programmatic advertising, and reader development is gone — replaced by zero-click summaries that quote, paraphrase, or simply absorb the underlying reporting. The New York Times’ 2023 lawsuit against OpenAI, which was finally decided this spring, established at least the principle that this practice can be unlawful. But the damages are large and the platforms are larger, and the long-run economic implications for local outlets — which have far less leverage than the Times — remain unsettled.' },

    /* ─── SECTION 7: THE PATH FORWARD ─── */
    { type: 'subhead', text: 'The path forward' },

    { type: 'paragraph',
      text: 'None of these interventions, taken alone, will rebuild what has been lost. The economic foundation of the local-news industry — display advertising in printed newspapers, augmented by classifieds and pre-prints — has been definitively destroyed. No revival of the legacy business model is realistic. The question is what hybrid arrangement can replace it before the void becomes permanent.' },

    { type: 'paragraph',
      text: 'A plausible map exists, even if no jurisdiction has yet assembled all of its pieces. It would combine: (1) a nonprofit and public-supported investigative core, of the kind Press Forward and the American Journalism Project are now building; (2) subscriber-funded daily reporting where it can sustain itself, generally in larger cities; (3) algorithmic-redistribution mechanisms — laws like Australia’s and California’s — that transfer some share of platform revenue back to publishers; (4) public-interest journalism tax credits, modelled on the R&D tax credit, that subsidise reporters’ salaries; and (5) targeted public funding for the categories of journalism that no commercial or philanthropic model adequately supports — court reporting, school board coverage, routine municipal proceedings.' },

    { type: 'paragraph',
      text: 'Several proposals along these lines are moving in Congress; none has yet passed. The Journalism Competition and Preservation Act, which would have authorised collective bargaining between publishers and platforms, has been reintroduced in three successive sessions and stalled each time. A more recent proposal — the Local Journalism Sustainability Act — would create a five-year payroll tax credit for newsrooms employing local journalists, costing perhaps $1.7 billion per year. It has bipartisan sponsors but has not advanced.' },

    { type: 'paragraph',
      text: 'The question is not whether such interventions can solve the problem. They can, partially. The question is whether the country still has enough functioning local journalism to make a meaningful difference when the interventions arrive. Each year of delay reduces the base on which any future system would have to be built.' },

    /* ─── SECTION 8: CLOSING SCENE ─── */
    { type: 'subhead', text: 'Greenville, revisited' },

    { type: 'paragraph',
      text: 'On my last evening in Greenville I drove out to Sandra Pittman’s house. Pittman had been the Reporter’s editor for the last decade of its run and, for six months before that, the only full-time reporter still on staff. She had inherited a newsroom of three from a paper that, in her father’s time, had employed twenty-two. She had laid off the two reporters who reported to her the year before the paper closed. She had written its last editorial. She had not, she said, expected to feel as flat about it as she did.' },

    { type: 'paragraph',
      text: 'Pittman had recently started a Substack covering municipal government in Greenville. She had 312 subscribers paying $8 a month. The revenue, after Stripe fees, came to about $2,200 a month. She was driving for Uber on Friday and Saturday nights to make rent. She had filed three stories in the past two weeks: one on the school board, one on a court case involving a city contractor, and one on a federal funding dispute affecting the local hospital. None had been picked up by other outlets. None had been the subject of any visible local conversation. She did not know how many of her 312 subscribers had read them.' },

    { type: 'paragraph',
      text: '“I think about it like this,” she said. We were sitting on her back porch. The neighbour’s dog had been barking for an hour. “When the Reporter was around, the people who needed to know what was happening at the school board could find out without trying. Now they have to try. They have to subscribe to me, and they have to remember to open the email, and they have to want to know. That’s a different town.”' },

    { type: 'paragraph',
      text: 'She did not say this with bitterness. She said it the way one might describe a long, slow change in the weather — something so gradual that it became the way things are before anyone had a chance to say goodbye to the way things were. The Substack, she said, was the only thing she could think of to do. It was not a newspaper. It could not do what a newspaper had done. But it was, for now, the only sustained source of news about what was happening in her town. She would keep it going as long as she could.' },

    { type: 'paragraph',
      text: 'It was getting dark. The cicadas had started. Somewhere down the block, a car door slammed. The Greenville Daily Reporter had been gone for nine weeks. Nobody, as far as I could tell, had yet noticed what was missing.' },

    { type: 'divider' },

    { type: 'paragraph',
      text: 'Maya Krishnan is a staff writer for Rig Wire, covering media, democracy, and the institutions in between. Her work has appeared in The Atlantic, Harper’s, and the Columbia Journalism Review. She has reported from twenty-eight American states and is the author of a forthcoming book on the future of journalism in the post-platform era.' },
  ],
};

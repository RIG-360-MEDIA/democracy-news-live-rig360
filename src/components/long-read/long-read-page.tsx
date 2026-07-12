'use client';

import type { ReactNode, SyntheticEvent } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/brand/theme-toggle';
import { WorldClock } from '@/components/brand/world-clock';
import { BreakingTicker } from './breaking-ticker';
import { isHub, toCardView, toHubView, type CardView, type HubView } from '@/lib/worldwide/to-view';

import { AroundTheWorld } from './around-the-world';
import { isWorldScope } from './worldwide-scope-data';
import { useEditMode } from './edit-mode';
import { StoryPuck } from './story-puck';

import type { FrontPage, StoryCard, EventHub } from '@/lib/worldwide/types';

/* ═════════════════════════════════════════════════════════════════
   WORLDWIDE — live edition. Washington-Post-style section homepage.
   Dense, multi-row, multi-band grid. White canvas, black ink.
   Top Stories + themed bands + Around-the-World are LIVE (getFrontPage);
   Most Read / Editorial / Intelligence / Listen / Photo essays are
   editorial bands kept from the prototype until wired.
═════════════════════════════════════════════════════════════════ */

const INK = 'var(--rw-ink)';
const BODY = 'var(--rw-body)';
const MUTED = 'var(--rw-muted)';
const SOFT = 'var(--rw-faint)';
const RULE = 'var(--rw-rule)';
const RULE2 = 'var(--rw-rule-strong)';
const ACCENT = 'var(--rw-accent)';
const CREAM = 'var(--rw-cream)';
const FALLBACK_IMAGE = '/cards/placeholder.png';

/** News-site principle: an image slot is never empty or broken. On load failure, swap to the
 *  brand placeholder once (guarded against a fallback-also-fails loop). */
function onImgError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = FALLBACK_IMAGE;
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

/** Flatten live top-stories into a card pool (hubs → their members), preserving order. */
function cardPool(units: Array<StoryCard | EventHub>): CardView[] {
  const out: CardView[] = [];
  const seen = new Set<string>();
  for (const u of units) {
    // A hub collapses to ONE representative card (its freshest articled chapter) so a 200-member
    // mega-event doesn't flood the top of the page with near-duplicate fragments. The full member
    // list is shown only when the hub is the lead (HubLead umbrella).
    const cards = isHub(u) ? u.members.slice(0, 1) : [u];
    for (const c of cards) {
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      out.push(toCardView(c));
    }
  }
  return out;
}

export function LongReadPage({ data }: { data: FrontPage }) {
  let pool = cardPool(data.topStories);

  // Editor pins are a deliberate top-headline choice (CMS "★ Top headline"). They lead in
  // pin order and are EXEMPT from the automated lead rules below — those rules still apply
  // unchanged to the machine's own picks (the non-pinned remainder).
  const pinnedLead = pool.filter((c) => c.pinned);
  let auto = pool.filter((c) => !c.pinned);

  // Editorial lead rules — applied in order to the non-pinned remainder.

  // Rule 1: Sports can never lead — too many sources from a single match inflate its score.
  if (auto.length > 1 && auto[0].topic.toLowerCase() === 'sports') {
    const idx = auto.findIndex((c) => c.topic.toLowerCase() !== 'sports');
    if (idx > 0) auto = [auto[idx], ...auto.slice(0, idx), ...auto.slice(idx + 1)];
  }

  // Rule 2: Hero grid freshness — fresh stories (< 8 h) always appear above stale ones
  // in the 6 visible hero slots. Within each group, importance order is preserved.
  // This prevents a 15h-old story occupying the centre hero while fresh stories sit below it.
  const FRESH_S = 8 * 3600;
  const HERO_SLOTS = 12; // wider window: collect all fresh stories from top-12 before any stale fills slots 0-5
  const heroHead = auto.slice(0, HERO_SLOTS);
  const fresh = heroHead.filter((c) => c.freshnessSeconds <= FRESH_S);
  const stale = heroHead.filter((c) => c.freshnessSeconds > FRESH_S);
  auto = [...fresh, ...stale, ...auto.slice(HERO_SLOTS)];

  // Pins lead; automation fills the rest.
  pool = [...pinnedLead, ...auto];

  const heroPool = pool.slice(1); // lead renders pool[0]; the rest fill the grid

  // ── GLOBAL DE-DUPLICATION: every story appears exactly ONCE on the page. Surfaces claim stories in
  //    priority order; each later band skips anything already claimed. (Was ~20% duplicate headlines
  //    because the rails + Democracy band never de-duped against Top Stories.) ──
  const seen = new Set<string>();
  pool.slice(0, 15).forEach((c) => seen.add(c.slug));               // 1. Top Stories + More Top Stories grid (CardView.slug === story id)
  const fullCoverage = data.topStories.filter(isHub).map(toHubView);
  data.topStories.forEach((u) => { if (isHub(u)) u.members.forEach((m) => seen.add(m.id)); }); // 2. Full-coverage timelines

  const takeN = (cards: StoryCard[], n: number): StoryCard[] => {
    const out: StoryCard[] = [];
    for (const c of cards) { if (seen.has(c.id)) continue; seen.add(c.id); out.push(c); if (out.length >= n) break; }
    return out;
  };
  const claimAll = (cards: StoryCard[]): StoryCard[] => {
    const out: StoryCard[] = [];
    for (const c of cards) { if (seen.has(c.id)) continue; seen.add(c.id); out.push(c); }
    return out;
  };

  // 3. Around the World claims BEFORE the rails so the map stays full (one lead per country).
  const aroundTheWorld = claimAll(data.aroundTheWorld);

  // 4. The two rails draw from every remaining story, unique by id — "freshest / most-covered not
  //    already featured above" (so the LIVE rail never just mirrors the hero grid).
  const railUniq = new Set<string>();
  const railPool: StoryCard[] = [];
  for (const c of [
    ...data.topStories.flatMap((u) => (isHub(u) ? u.members : [u])),
    ...data.sections.flatMap((s) => s.stories),
  ]) if (!railUniq.has(c.id)) { railUniq.add(c.id); railPool.push(c); }
  const latest = takeN([...railPool].sort((a, b) => (a.publishedSeconds ?? a.freshnessSeconds) - (b.publishedSeconds ?? b.freshnessSeconds)), 8).map(toCardView);
  const mostCovered = takeN([...railPool].sort((a, b) => b.independentSources - a.independentSources), 6).map(toCardView);

  // 5. Democracy band, then 6. topic sections — each takes only stories not shown anywhere above.
  const democracy = takeN(data.democracy, 8).map(toCardView);
  const sections = data.sections
    .map((s) => ({ ...s, stories: claimAll(s.stories) }))
    .filter((s) => s.stories.length > 0);

  // Empty-state: a thin scope (few generated English articles) shows a clean message, not blank bands.
  if (pool.length === 0) {
    return (
      <div className="min-h-dvh" style={{ background: 'var(--rw-bg)', color: BODY, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
        <TopNav />
        <section className="px-5 py-28 md:py-36 text-center mx-auto" style={{ maxWidth: 640 }}>
          <p className="italic" style={{ color: INK, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 400, lineHeight: 1.2, fontVariationSettings: "'opsz' 144, 'SOFT' 100", marginBottom: 16 }}>
            No stories in this edition right now.
          </p>
          <p style={{ color: MUTED, fontSize: 15, marginBottom: 24 }}>Fresh coverage lands continuously — check back shortly, or browse the world.</p>
          <Link href="/long-read" style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: ACCENT, textTransform: 'uppercase' }}>← The World edition</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ background: 'var(--rw-bg)', color: BODY, fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
      <TopNav />

      {/* ═══════════ TOP STORIES BAND — 3 columns ═══════════ */}
      <section id="top" className="px-5 md:px-10 lg:px-16 pt-10 pb-14" style={{ scrollMarginTop: 96 }}>
        <div className="mx-auto grid gap-x-9 lg:[grid-template-columns:1fr_1.65fr_1fr]" style={{ maxWidth: 1600 }}>
          {/* LEFT — secondary lead + two stacked */}
          <div className="lg:pr-7" style={{ borderRight: `1px solid ${RULE}` }}>
            {heroPool[3] && <LeadStory story={heroPool[3]} />}
            {heroPool[4] && <><Rule /><CompactWithImage story={heroPool[4]} /></>}
            {heroPool[5] && <><Rule /><TextOnlyStory story={heroPool[5]} /></>}
          </div>
          {/* CENTRE — THE top headline (pool[0]) as the big hero + two stacked */}
          <div className="lg:pr-7" style={{ borderRight: `1px solid ${RULE}` }}>
            {pool[0] && <HeroStory story={pool[0]} />}
            {heroPool[1] && <><Rule /><CompactWithImage story={heroPool[1]} /></>}
            {heroPool[2] && <><Rule /><TextOnlyStory story={heroPool[2]} /></>}
          </div>
          {/* RIGHT — Live news ticker */}
          <div>
            <LiveNewsRail items={latest} />
          </div>
        </div>
      </section>

      {/* ═══════════ MORE TOP STORIES — image / headline-stack / most-read ═══════════ */}
      <section className="px-5 md:px-10 lg:px-16 pt-14 pb-16" style={{ borderTop: `3px solid ${RULE2}` }}>
        <div className="mx-auto" style={{ maxWidth: 1600 }}>
          <BandTitle text="More Top Stories" />
          <div className="grid gap-x-9 gap-y-8 lg:[grid-template-columns:1.2fr_1.5fr_1fr]">
            <div className="lg:pr-7" style={{ borderRight: `1px solid ${RULE}` }}>
              {heroPool[6] && <ImageHeroStory story={heroPool[6]} />}
            </div>
            <div className="lg:pr-7" style={{ borderRight: `1px solid ${RULE}` }}>
              <HeadlineStack stories={heroPool.slice(7, 14)} />
            </div>
            <div>
              <SidebarHead title="Most covered" />
              <ul className="mt-4">{mostCovered.map((item, i) => <MostReadEntry key={item.slug} item={item} rank={i + 1} />)}</ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FULL COVERAGE — developing storylines, their own section ═══════════ */}
      <FullCoverageSection hubs={fullCoverage} />

      {/* ═══════════ AROUND THE WORLD — secondary band, world scope only ═══════════ */}
      {isWorldScope(data.scope) && aroundTheWorld.length > 0 && (
        <AroundTheWorld stories={aroundTheWorld.map(toCardView)} />
      )}

      {/* ═══════════ DEMOCRACY — flagship section, leads the topic bands ═══════════ */}
      {democracy.length > 0 && (
        <ThemedBand anchor="democracy" title="Democracy" featured={democracy[0]} list={democracy.slice(1)} />
      )}

      {/* ═══════════ LIVE TOPIC BANDS — image-left + headline-stack ═══════════ */}
      {sections.map((section, i) => {
        const cards = section.stories.map(toCardView);
        if (cards.length === 0) return null;
        // Backend sends a big candidate buffer (survives global de-dup); cap the RENDERED band here:
        // one image-lead + up to 6 headlines in the stack.
        const [featured, ...rest] = cards;
        const list = rest.slice(0, 6);
        return <ThemedBand key={section.topic} anchor={section.topic.toLowerCase()} title={titleCase(section.topic)} featured={featured} list={list} darker={i % 2 === 1} />;
      })}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="px-5 md:px-8 lg:px-12 py-10" style={{ borderTop: `1px solid ${RULE}`, background: 'var(--rw-cream)' }}>
        <div className="mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ maxWidth: 1600 }}>
          <Wordmark size="sm" href="/long-read" rigColor="var(--rw-ink)" />
          <Link href="/long-read" className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 700, letterSpacing: '0.18em', color: ACCENT, textTransform: 'uppercase' }}>
            ← Back to top
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════ THEMED BAND — image-left + 4-headline stack right ═══════════ */
function ThemedBand({ anchor, title, featured, list, darker }: { anchor: string; title: string; featured: CardView; list: CardView[]; darker?: boolean }) {
  return (
    <section id={anchor} className="px-5 md:px-10 lg:px-16 pt-14 pb-16" style={{ borderTop: `2px solid ${RULE2}`, background: darker ? CREAM : 'var(--rw-bg)', scrollMarginTop: 96 }}>
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        <BandTitle text={title} />
        <div className="grid gap-x-7 gap-y-7 lg:[grid-template-columns:1.4fr_1fr]">
          <div className="lg:pr-7" style={{ borderRight: `1px solid ${RULE}` }}>
            <ImageHeroStory story={featured} />
          </div>
          <div><HeadlineStack stories={list} /></div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ QUOTE OF THE DAY — masthead line (democracy / free speech / liberty) ═══════════ */
// Verified, historically significant quotes. Rotates once per UTC day (stable within the day).
const QUOTES: ReadonlyArray<{ q: string; who: string }> = [
  { q: 'Give me the liberty to know, to utter, and to argue freely according to conscience, above all liberties.', who: 'John Milton' },
  { q: 'If liberty means anything at all, it means the right to tell people what they do not want to hear.', who: 'George Orwell' },
  { q: 'The only security of all is in a free press.', who: 'Thomas Jefferson' },
  { q: 'Censorship reflects a society’s lack of confidence in itself.', who: 'Potter Stewart' },
  { q: 'Freedom of expression is the indispensable condition of nearly every other form of freedom.', who: 'Benjamin N. Cardozo' },
  { q: 'Those who deny freedom to others deserve it not for themselves.', who: 'Abraham Lincoln' },
  { q: 'Injustice anywhere is a threat to justice everywhere.', who: 'Martin Luther King Jr.' },
  { q: 'A popular government without popular information is but a prologue to a farce or a tragedy.', who: 'James Madison' },
  { q: 'The liberty of the press is essential to the security of the state.', who: 'John Adams' },
  { q: 'Freedom is never voluntarily given by the oppressor; it must be demanded by the oppressed.', who: 'Martin Luther King Jr.' },
  { q: 'Where the press is free, and every man able to read, all is safe.', who: 'Thomas Jefferson' },
  { q: 'Better to die fighting for freedom than be a prisoner all the days of your life.', who: 'Bob Marley' },
];

function QuoteOfTheDay() {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const { q, who } = QUOTES[dayIndex % QUOTES.length];
  return (
    <figure className="text-right hidden md:block" style={{ maxWidth: 360, marginLeft: 'auto' }}>
      <blockquote className="italic" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: INK, fontSize: 'clamp(0.8rem, 0.95vw, 0.95rem)', fontWeight: 400, lineHeight: 1.4, letterSpacing: '0.003em', fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
        “{q}”
      </blockquote>
      <figcaption style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', marginTop: 7 }}>
        — {who}
      </figcaption>
    </figure>
  );
}

/* ═══════════ MASTHEAD DATE ═══════════ */
function MastheadDate() {
  const now = new Date();
  const day = now.toLocaleDateString('en-US', { weekday: 'long' });
  const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  return (
    <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, letterSpacing: '0.06em', color: MUTED, lineHeight: 1.55, textTransform: 'uppercase' }}>
      <div style={{ fontWeight: 700, color: INK }}>{day}</div>
      <div>{date}</div>
    </div>
  );
}

/* ═══════════ TOP NAV ═══════════ */
function TopNav() {
  return (
    <header style={{ borderBottom: `1px solid ${RULE}` }}>
      <div className="grid items-center px-5 md:px-8 py-2.5" style={{ gridTemplateColumns: '1fr auto 1fr', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: MUTED, borderBottom: `1px solid ${RULE}` }}>
        <div className="flex items-center gap-4 justify-self-start">
          <button aria-label="Menu" className="hover:opacity-70" style={{ color: INK }}>
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="1" y1="2" x2="15" y2="2" /><line x1="1" y1="7" x2="15" y2="7" /><line x1="1" y1="12" x2="15" y2="12" /></svg>
          </button>
          <span className="inline-flex"><WorldClock /></span>
        </div>
        <span className="justify-self-center inline-flex items-center gap-2 whitespace-nowrap" style={{ fontWeight: 800, letterSpacing: '0.14em', color: 'var(--rw-red)', textTransform: 'uppercase', fontSize: 10.5 }}>
          <span className="dnl-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--rw-red)', display: 'inline-block' }} />
          Live · Independent · Worldwide
        </span>
        <div className="flex items-center gap-3 justify-self-end">
          <Link href="/signin" className="hover:opacity-90 inline-flex items-center" style={{ padding: '6px 14px', background: ACCENT, color: '#fff', borderRadius: 999, fontWeight: 700, letterSpacing: '0.04em' }}>Subscribe</Link>
          <Link href="/signin" className="hover:opacity-70" style={{ color: INK, fontWeight: 600 }}>Sign in</Link>
          <ThemeToggle />
        </div>
      </div>
      {/* ── Three-column masthead: date | wordmark | tagline ── */}
      <div className="grid items-center px-5 md:px-10 lg:px-16 py-5" style={{ gridTemplateColumns: '1fr auto 1fr', borderBottom: `1px solid ${RULE}` }}>
        <MastheadDate />
        <Link
          href="/today"
          className="justify-self-center"
          aria-label="Democracy News Live — home"
          style={{
            textDecoration: 'none', whiteSpace: 'nowrap', color: 'var(--rw-ink)',
            fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 800,
            fontSize: 'clamp(1.75rem, 4.2vw, 3.6rem)', lineHeight: 0.92, letterSpacing: '-0.025em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 0, 'WONK' 0",
          }}
        >
          Democracy News{' '}
          <span style={{ fontStyle: 'italic', fontWeight: 800, color: 'var(--rw-red)', fontVariationSettings: "'opsz' 144, 'SOFT' 60, 'WONK' 0" }}>Live</span>
        </Link>
        <QuoteOfTheDay />
      </div>
      {/* ── Section strip ── */}
      <nav style={{ borderTop: `1px solid ${RULE}`, borderBottom: `2px solid ${INK}` }}>
        <div className="flex items-center justify-center overflow-x-auto scrollbar-none" style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>
          {(['Top Stories', 'Democracy', 'Politics', 'Business', 'Technology', 'Health', 'Environment', 'Sports', 'Legal', 'Security', 'Finance', 'Society'] as const).map((label, i) => (
            <a
              key={label}
              href={label === 'Top Stories' ? '#top' : `#${label.toLowerCase()}`}
              className="shrink-0 transition-colors hover:text-red-700"
              style={{
                display: 'inline-block',
                padding: '11px 20px',
                fontSize: i === 0 ? 13 : 12.5,
                fontWeight: label === 'Democracy' || i === 0 ? 800 : 600,
                letterSpacing: i === 0 ? '0.06em' : '0.05em',
                color: label === 'Democracy' ? 'var(--rw-red)' : i === 0 ? INK : BODY,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                textTransform: 'uppercase',
                borderRight: i < 9 ? `1px solid ${RULE}` : 'none',
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>
      {/* ── Breaking-news ticker (live articles, refreshed) ── */}
      <BreakingTicker />
    </header>
  );
}

/* ═══════════ STORY COMPONENTS ═══════════ */
function TitleLink({ story, children }: { story: CardView; children: ReactNode }) {
  const editing = useEditMode();
  if (!story.href) return <span>{children}</span>;
  if (!editing) return <Link href={story.href} className="hover:opacity-75 transition-opacity">{children}</Link>;
  // Curate mode: the headline is not a navigate-away link; it anchors the per-story control puck.
  const id = story.href.split('/').filter(Boolean).pop() ?? '';
  return (
    <span className="group" style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {id && <StoryPuck storyId={id} />}
    </span>
  );
}

function LeadStory({ story }: { story: CardView }) {
  return (
    <article>
      <img src={story.image} alt="" className="block w-full" style={{ aspectRatio: '4/3', objectFit: 'cover' }} onError={onImgError} />
      <div className="pt-5">
        <Kicker text={story.kicker} />
        <h2 style={{ color: INK, fontSize: 'clamp(1.75rem, 2.6vw, 2.625rem)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.024em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'balance', marginTop: 10, marginBottom: 12 }}>
          <TitleLink story={story}>{story.title}</TitleLink>
        </h2>
        {story.deck && <p style={{ color: BODY, fontSize: 'clamp(1rem, 1.2vw, 1.1875rem)', lineHeight: 1.5, marginBottom: 14, fontVariationSettings: "'opsz' 14, 'SOFT' 50" }}>{story.deck}</p>}
        <Byline story={story} />
      </div>
    </article>
  );
}

function HeroStory({ story }: { story: CardView }) {
  return (
    <article>
      <img src={story.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover' }} onError={onImgError} />
      <div className="pt-5">
        <Kicker text={story.kicker} />
        <h1 style={{ color: INK, fontSize: 'clamp(2.5rem, 4.6vw, 4.5rem)', fontWeight: 700, lineHeight: 1.02, letterSpacing: '-0.028em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'balance', marginTop: 14, marginBottom: 16 }}>
          <TitleLink story={story}>{story.title}</TitleLink>
        </h1>
        {story.deck && <p style={{ color: BODY, fontSize: 'clamp(1.0625rem, 1.3vw, 1.25rem)', lineHeight: 1.5, marginBottom: 14, fontVariationSettings: "'opsz' 14, 'SOFT' 50" }}>{story.deck}</p>}
        <Byline story={story} />
      </div>
    </article>
  );
}

function CompactWithImage({ story }: { story: CardView }) {
  return (
    <article className="grid gap-5 md:[grid-template-columns:1fr_150px] items-start">
      <div>
        <Kicker text={story.kicker} />
        <h3 style={{ color: INK, fontSize: 'clamp(1.25rem, 1.7vw, 1.5rem)', fontWeight: 700, lineHeight: 1.12, letterSpacing: '-0.016em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance', marginTop: 6, marginBottom: 8 }}>
          <TitleLink story={story}>{story.title}</TitleLink>
        </h3>
        {story.deck && <p style={{ color: BODY, fontSize: 14.5, lineHeight: 1.5, marginBottom: 10 }}>{story.deck}</p>}
        <Byline story={story} small />
      </div>
      <img src={story.image} alt="" className="block w-full" style={{ aspectRatio: '1/1', objectFit: 'cover' }} onError={onImgError} />
    </article>
  );
}

function TextOnlyStory({ story }: { story: CardView }) {
  return (
    <article>
      <Kicker text={story.kicker} small />
      <h4 style={{ color: INK, fontSize: 'clamp(1.1875rem, 1.55vw, 1.4375rem)', fontWeight: 700, lineHeight: 1.13, letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance', marginTop: 6, marginBottom: 6 }}>
        <TitleLink story={story}>{story.title}</TitleLink>
      </h4>
      <Byline story={story} small />
    </article>
  );
}

function ImageHeroStory({ story }: { story: CardView }) {
  return (
    <article>
      <img src={story.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover' }} onError={onImgError} />
      <div className="pt-4">
        <Kicker text={story.kicker} />
        <h3 style={{ color: INK, fontSize: 'clamp(1.75rem, 2.8vw, 2.625rem)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'balance', marginTop: 10, marginBottom: 12 }}>
          <TitleLink story={story}>{story.title}</TitleLink>
        </h3>
        {story.deck && <p style={{ color: BODY, fontSize: 'clamp(1rem, 1.2vw, 1.1875rem)', lineHeight: 1.5, marginBottom: 12 }}>{story.deck}</p>}
        <Byline story={story} />
      </div>
    </article>
  );
}

function HeadlineStack({ stories }: { stories: CardView[] }) {
  return (
    <ul>
      {stories.map((s, i) => (
        <li key={s.slug} style={{ paddingTop: i === 0 ? 0 : 18, paddingBottom: 18, borderTop: i === 0 ? 'none' : `1px solid ${RULE}` }}>
          <Kicker text={s.kicker} small />
          <h4 style={{ color: INK, fontSize: 'clamp(1.25rem, 1.65vw, 1.5rem)', fontWeight: 700, lineHeight: 1.13, letterSpacing: '-0.016em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance', marginTop: 6, marginBottom: 6 }}>
            <TitleLink story={s}>{s.title}</TitleLink>
          </h4>
          <Byline story={s} small />
        </li>
      ))}
    </ul>
  );
}

/* ═══════════ EVENT HUB (B+) ═══════════ */
/* ═══════════ FULL COVERAGE — developing storylines as live chapter timelines ═══════════ */
function FullCoverageSection({ hubs }: { hubs: HubView[] }) {
  if (hubs.length === 0) return null;
  return (
    <section className="px-5 md:px-10 lg:px-16 pt-14 pb-16" style={{ borderTop: `3px solid ${RULE2}`, background: CREAM }}>
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        <div className="flex items-center gap-3 flex-wrap" style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 10, marginBottom: 26 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: '#a8141a', color: '#fff', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', borderRadius: 3 }}>
            <motion.span aria-hidden animate={{ opacity: [1, 0.25, 1], scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 6, height: 6, background: '#fff', borderRadius: 999, display: 'inline-block' }} />
            Developing
          </span>
          <h2 style={{ color: INK, fontSize: 'clamp(1.6rem, 2.4vw, 2.25rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>Full coverage</h2>
          <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: 11.5, fontWeight: 600 }}>the biggest stories, covered from every angle</span>
        </div>
        <div>
          {hubs.map((h, i) => <StorylineRow key={h.hubId} hub={h} divided={i > 0} />)}
        </div>
      </div>
    </section>
  );
}

/* One developing storyline = a full-width row: entity on the left, its chapters (newest first) in a
   multi-column timeline on the right, so the band fills the width even with a single storyline. */
function StorylineRow({ hub, divided }: { hub: HubView; divided: boolean }) {
  const entity = hub.title.replace(/\s*[—-]\s*full coverage$/i, '');
  return (
    <article
      className="grid gap-x-10 gap-y-5 lg:[grid-template-columns:300px_1fr]"
      style={{ borderTop: divided ? `1px solid ${RULE}` : undefined, paddingTop: divided ? 26 : 4, paddingBottom: 26 }}
    >
      <div>
        <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Full coverage · {hub.memberCount} reports</span>
        <h3 style={{ color: INK, fontSize: 'clamp(1.5rem, 2.4vw, 2.125rem)', fontWeight: 700, lineHeight: 1.04, letterSpacing: '-0.02em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'balance', marginTop: 8 }}>{entity}</h3>
      </div>
      <ul className="grid gap-x-9 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
        {hub.members.map((m) => (
          <li key={m.slug} style={{ borderLeft: `2px solid ${RULE}`, paddingLeft: 14 }}>
            {m.href
              ? <Link href={m.href} aria-label={m.title} className="block"><img src={m.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover', marginBottom: 10 }} onError={onImgError} /></Link>
              : <img src={m.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover', marginBottom: 10 }} onError={onImgError} />}
            <div style={{ fontFamily: 'var(--font-mono), monospace', color: ACCENT, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>{m.timestamp}</div>
            <h4 style={{ color: INK, fontSize: 'clamp(0.95rem, 1.15vw, 1.0625rem)', fontWeight: 700, lineHeight: 1.24, letterSpacing: '-0.01em', textWrap: 'balance' }}>
              <TitleLink story={m}>{m.title}</TitleLink>
            </h4>
          </li>
        ))}
      </ul>
    </article>
  );
}

/* ═══════════ LIVE NEWS RAIL — rotating ticker over the freshest REAL stories ═══════════ */
/* A calm, readable "Top news" rail: a STABLE list of the freshest stories (newest first). No
   auto-rotation — headlines stay put so they can be read comfortably; the list refreshes on page
   load / navigation. The live motion on the page is the breaking ticker up top, not this column. */
function LiveNewsRail({ items }: { items: CardView[] }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, 8);
  return (
    <div>
      <div className="flex items-center justify-between gap-3" style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 8 }}>
        <div className="flex items-center gap-3">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: '#a8141a', color: '#fff', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', borderRadius: 3 }}>
            <motion.span aria-hidden animate={{ opacity: [1, 0.25, 1], scale: [1, 1.15, 1] }} transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 6, height: 6, background: '#fff', borderRadius: 999, display: 'inline-block' }} />
            LIVE
          </span>
          <h2 style={{ color: INK, fontSize: 'clamp(1.5rem, 1.9vw, 1.75rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.018em', fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>Top news</h2>
        </div>
        <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' }}>Latest first</span>
      </div>
      <ul className="mt-2">
        {visible.map((item, i) => (
          <li key={item.slug} style={{ borderBottom: `1px solid ${RULE}`, paddingTop: 14, paddingBottom: 14 }}>
            <LiveNewsItemView item={item} isNew={i === 0} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function LiveNewsItemView({ item, isNew }: { item: CardView; isNew: boolean }) {
  const breaking = item.timestamp === 'just now' || /^[1-3]h ago$/.test(item.timestamp);
  const titleStyle = { color: INK, fontSize: 'clamp(0.9375rem, 1.1vw, 1.0625rem)', fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.012em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance' as const };
  return (
    <>
      <div className="flex items-center flex-wrap gap-2 mb-2">
        {breaking ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 7px', background: '#a8141a', color: '#fff', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', borderRadius: 2 }}>
            <motion.span aria-hidden animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 5, height: 5, background: '#fff', borderRadius: 999, display: 'inline-block' }} />
            BREAKING
          </span>
        ) : (
          <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase' }}>{item.kicker}</span>
        )}
        <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: isNew ? '#a8141a' : MUTED, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>· {item.timestamp}</span>
      </div>
      {item.href ? (
        <Link href={item.href} className="hover:opacity-75 transition-opacity block" style={titleStyle}>{item.title}</Link>
      ) : (
        <span className="block" style={titleStyle}>{item.title}</span>
      )}
      {item.deck && <p className="mt-1.5" style={{ color: BODY, fontSize: 13, lineHeight: 1.45 }}>{item.deck}</p>}
    </>
  );
}

function MostReadEntry({ item, rank }: { item: CardView; rank: number }) {
  const titleStyle = { color: INK, fontSize: 'clamp(1.0625rem, 1.2vw, 1.1875rem)', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance' as const };
  return (
    <li className="flex gap-4 items-baseline" style={{ borderBottom: `1px solid ${RULE}`, paddingTop: 12, paddingBottom: 12 }}>
      <span className="italic" style={{ color: ACCENT, fontSize: 'clamp(2rem, 2.6vw, 2.625rem)', fontWeight: 400, lineHeight: 1, fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1", minWidth: 36, flexShrink: 0 }}>{rank}</span>
      <div className="flex-1 min-w-0">
        {item.kicker && <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 4 }}>{item.kicker}</p>}
        {item.href ? (
          <Link href={item.href} className="hover:opacity-75 transition-opacity block" style={titleStyle}>{item.title}</Link>
        ) : (
          <span className="block" style={titleStyle}>{item.title}</span>
        )}
      </div>
    </li>
  );
}

/* ═══════════ PRIMITIVES ═══════════ */
function Kicker({ text, small }: { text: string; small?: boolean }) {
  return <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: small ? 10 : 11, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase' }}>{text}</span>;
}

function Byline({ story, small }: { story: CardView; small?: boolean }) {
  const parts = [story.author, story.timestamp, story.readTime].filter(Boolean);
  // Coverage honesty: mark single-outlet stories on the card face too, so the caveat is visible
  // before the reader clicks in — never let a single-source filler look like corroborated news.
  const singleSource = story.independentSources <= 1;
  return (
    <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: small ? 10.5 : 11.5, fontWeight: 600, letterSpacing: '0.04em', marginTop: 8 }}>
      {parts.map((p, i) => (
        <span key={i}>
          {i === 0 ? <span style={{ color: INK, fontWeight: 700 }}>By {p}</span> : <><span style={{ margin: '0 8px', opacity: 0.5 }}>·</span><span style={{ textTransform: 'uppercase', letterSpacing: '0.10em' }}>{p}</span></>}
        </span>
      ))}
      {singleSource && <><span style={{ margin: '0 8px', opacity: 0.5 }}>·</span><span title="Reported by a single outlet — not yet independently corroborated" style={{ textTransform: 'uppercase', letterSpacing: '0.10em', opacity: 0.85 }}>Single source</span></>}
    </p>
  );
}

function SidebarHead({ title, small }: { title: string; small?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 style={{ color: INK, fontSize: small ? 'clamp(1.1875rem, 1.45vw, 1.375rem)' : 'clamp(1.5rem, 1.9vw, 1.75rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.018em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", borderBottom: `2px solid ${INK}`, paddingBottom: 8, flex: 1 }}>{title}</h2>
    </div>
  );
}

function BandTitle({ text }: { text: string }) {
  return <h2 className="mb-8" style={{ color: INK, fontSize: 'clamp(1.875rem, 2.6vw, 2.5rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", borderBottom: `2px solid ${INK}`, paddingBottom: 12 }}>{text}</h2>;
}

function Rule() {
  return <div className="my-6" style={{ borderTop: `1px solid ${RULE}` }} />;
}

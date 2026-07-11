'use client';

import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import {
  STORIES,
  DAILY_BRIEFING,
  TRENDING_TOPICS,
  REGIONS,
  dominantOf,
  type AllSidesStory,
  type Bias,
} from './all-sides-data';

/* ═════════════════════════════════════════════════════════════════
   ALL SIDES — Ground-News-style aggregation, light theme.
   White canvas, hair-thin borders, no decorative colour. The only
   colour on the page comes from the political-bias data itself.
═════════════════════════════════════════════════════════════════ */

/* ── COLOUR TOKENS ──────────────────────────────────────────── */
const BG          = '#ffffff';
const CARD        = '#ffffff';
const SUBTLE_BG   = '#f5f5f3';
const BORDER      = '#e3e3e0';
const BORDER_LITE = '#ececea';
const INK         = '#0e0e0c';
const SUB         = '#3a3a36';
const MUTED       = '#6b6b66';
const FAINT       = '#9d9d97';

/* Political bias colours — these are the ONLY decorative colours used */
const C_LEFT   = '#1d4ed8';   /* deep blue */
const C_CENTER = '#7b7b76';   /* slate grey */
const C_RIGHT  = '#c8232c';   /* deep red */
const BLINDSPOT = '#b45309';  /* burnt amber */

const colorFor = (b: Bias) => b === 'left' ? C_LEFT : b === 'right' ? C_RIGHT : C_CENTER;
const labelFor = (b: Bias) => b === 'left' ? 'Left' : b === 'right' ? 'Right' : 'Center';

const DATE = 'Saturday, May 23, 2026';

/* ── Slice the 30 stories into the page's bands ──────────────── */
const heroStory   = STORIES[0];
const topGrid     = STORIES.slice(1, 10);
const blindspots  = STORIES.filter((s) => s.isBlindspot);
const latestPicks = STORIES.slice(10, 22).filter((s) => !s.isBlindspot).slice(0, 8);
const moreStories = STORIES.slice(22, 30).filter((s) => !s.isBlindspot);

export function AllSidesPage() {
  return (
    <div style={{
      background: BG, color: INK, minHeight: '100dvh',
      fontFamily: 'var(--font-jakarta), system-ui, -apple-system, sans-serif',
    }}>
      <TopNav />
      <TrendingStrip />
      <RegionPills />

      {/* ─────────────── TOP STORIES — date heading ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 pt-10 pb-6">
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 style={{
              fontSize: 'clamp(1.625rem, 2.2vw, 2rem)', fontWeight: 700, letterSpacing: '-0.02em', color: INK,
            }}>Top news stories</h1>
            <p style={{
              fontSize: 12.5, fontWeight: 600, letterSpacing: '0.04em', color: MUTED, textTransform: 'uppercase',
            }}>{DATE} · {STORIES.length} stories tracked</p>
          </div>
          <div className="mt-3" style={{ height: 1, background: BORDER }} />
        </div>
      </section>

      {/* ─────────────── HERO + DAILY BRIEFING ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 pb-10">
        <div className="mx-auto grid gap-6 lg:[grid-template-columns:1.55fr_1fr]" style={{ maxWidth: 1480 }}>
          <HeroCard story={heroStory} />
          <DailyBriefingCard />
        </div>
      </section>

      {/* ─────────────── TOP STORIES GRID ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 pb-12">
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <BandTitle title="Latest news stories" linkText="See more" />
          <div className="grid gap-5 sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr]">
            {topGrid.map((s) => <StoryCard key={s.id} story={s} />)}
          </div>
        </div>
      </section>

      {/* ─────────────── BLINDSPOT BAND ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 py-12" style={{
        background: SUBTLE_BG, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
      }}>
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
            <div className="flex items-baseline gap-3">
              <span style={{
                padding: '4px 10px', background: BLINDSPOT, color: '#fff',
                fontSize: 10.5, fontWeight: 800, letterSpacing: '0.20em',
                textTransform: 'uppercase', borderRadius: 2,
              }}>Blindspot</span>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 700, letterSpacing: '-0.018em', color: INK,
              }}>Stories one side missed</h2>
            </div>
            <Link href="#" style={{
              color: BLINDSPOT, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>View Blindspot feed →</Link>
          </div>
          <p style={{ color: SUB, fontSize: 14, lineHeight: 1.5, maxWidth: 820, marginBottom: 24 }}>
            Stories disproportionately covered by one side of the political spectrum.
            The other side, intentionally or not, isn&rsquo;t reading them.
          </p>
          <div className="grid gap-5 sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr]">
            {blindspots.map((s) => <BlindspotCard key={s.id} story={s} />)}
          </div>
        </div>
      </section>

      {/* ─────────────── LATEST — 4-col compact ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 py-12">
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <BandTitle title="More from around the world" linkText="See all" />
          <div className="grid gap-5 sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr_1fr]">
            {latestPicks.map((s) => <CompactStoryCard key={s.id} story={s} />)}
          </div>
        </div>
      </section>

      {/* ─────────────── 2-COL WIDE ROW ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 py-12" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <BandTitle title="Following the moment" />
          <div className="grid gap-5 lg:[grid-template-columns:1fr_1fr]">
            {moreStories.map((s) => <WideStoryCard key={s.id} story={s} />)}
          </div>
        </div>
      </section>

      {/* ─────────────── INTEREST TOPICS GRID ─────────────── */}
      <section className="px-5 md:px-10 lg:px-14 py-12" style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="mx-auto" style={{ maxWidth: 1480 }}>
          <BandTitle title="Browse by interest" />
          <div className="grid gap-3 sm:[grid-template-columns:repeat(3,1fr)] md:[grid-template-columns:repeat(4,1fr)] lg:[grid-template-columns:repeat(5,1fr)]">
            {TRENDING_TOPICS.map((t) => (
              <Link key={t.id} href="#" className="group flex items-center gap-3 hover:bg-[color:var(--hover)] transition-colors"
                style={{
                  padding: '14px 16px', background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
                  ['--hover' as string]: SUBTLE_BG,
                }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>{t.emoji}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate" style={{ color: INK, fontSize: 13.5, fontWeight: 700 }}>{t.label}</span>
                  <span style={{ color: MUTED, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em' }}>
                    {t.count} stories trending
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FOOTER ─────────────── */}
      <footer className="px-5 md:px-10 lg:px-14 py-10" style={{ borderTop: `1px solid ${BORDER}`, background: SUBTLE_BG }}>
        <div className="mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4" style={{ maxWidth: 1480 }}>
          <div className="flex items-center gap-3">
            <Wordmark size="sm" href="/today" />
            <span style={{
              padding: '3px 9px', border: `1px solid ${INK}`, color: INK,
              fontSize: 10, fontWeight: 800, letterSpacing: '0.20em',
              textTransform: 'uppercase', borderRadius: 2,
            }}>All Sides</span>
          </div>
          <p style={{ color: MUTED, fontSize: 12 }}>
            Bias ratings aggregated from 14 independent media-bias monitors. Source counts updated every 6 minutes.
          </p>
          <Link href="/today" style={{
            color: INK, fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
            borderBottom: `1px solid ${INK}`, paddingBottom: 1,
          }}>← Back to today&rsquo;s edition</Link>
        </div>
      </footer>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   TOP NAV
═════════════════════════════════════════════════════════════════ */
function TopNav() {
  return (
    <header className="px-5 md:px-10 lg:px-14 py-3 flex items-center justify-between gap-6" style={{
      borderBottom: `1px solid ${BORDER}`, background: BG, position: 'sticky', top: 0, zIndex: 30,
    }}>
      <div className="flex items-center gap-7">
        <Link href="/today" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Wordmark size="sm" href={null} />
          <span style={{
            padding: '3px 8px', border: `1px solid ${INK}`, color: INK,
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', borderRadius: 2,
          }}>All Sides</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5" style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em' }}>
          <Link href="#" style={{ color: INK, borderBottom: `2px solid ${INK}`, paddingBottom: 4 }}>News</Link>
          <Link href="#" style={{ color: MUTED }}>For You</Link>
          <Link href="#" style={{ color: MUTED }}>Search</Link>
          <Link href="#" className="inline-flex items-center gap-1.5" style={{ color: BLINDSPOT }}>
            <span style={{ width: 7, height: 7, background: BLINDSPOT, borderRadius: 999, display: 'inline-block' }} />
            Blindspot
          </Link>
          <Link href="#" style={{ color: MUTED }}>Local</Link>
        </nav>
      </div>
      <div className="flex items-center gap-2">
        <button aria-label="Search" className="hover:opacity-75" style={{
          padding: 8, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, color: INK,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="6" cy="6" r="4.5" />
            <line x1="9.5" y1="9.5" x2="13" y2="13" />
          </svg>
        </button>
        <Link href="#" style={{
          padding: '7px 14px', background: INK, color: '#fff',
          fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', borderRadius: 999,
        }}>Get started</Link>
      </div>
    </header>
  );
}

function TrendingStrip() {
  return (
    <div className="px-5 md:px-10 lg:px-14 py-3 flex items-center gap-2 overflow-x-auto" style={{
      borderBottom: `1px solid ${BORDER_LITE}`, background: BG,
    }}>
      <span style={{
        flexShrink: 0, color: MUTED, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.20em', textTransform: 'uppercase', marginRight: 6,
      }}>↗ Trending</span>
      {TRENDING_TOPICS.slice(0, 8).map((t) => (
        <Link key={t.id} href="#" className="flex-shrink-0 hover:bg-[color:var(--hover)] transition-colors inline-flex items-center gap-1.5" style={{
          padding: '5px 10px 5px 9px', background: CARD, border: `1px solid ${BORDER}`,
          borderRadius: 999, color: INK, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
          ['--hover' as string]: SUBTLE_BG,
        }}>
          <span style={{ fontSize: 12 }}>{t.emoji}</span>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

function RegionPills() {
  return (
    <div className="px-5 md:px-10 lg:px-14 py-3 flex items-center gap-2 overflow-x-auto" style={{
      borderBottom: `1px solid ${BORDER_LITE}`, background: SUBTLE_BG,
    }}>
      <span style={{
        flexShrink: 0, color: MUTED, fontSize: 11, fontWeight: 800,
        letterSpacing: '0.20em', textTransform: 'uppercase', marginRight: 6,
      }}>Region</span>
      {REGIONS.map((r, i) => (
        <Link key={r.id} href="#" className="flex-shrink-0 hover:opacity-90 transition-opacity" style={{
          padding: '4px 11px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          background: i === 0 ? INK : 'transparent',
          color: i === 0 ? '#fff' : MUTED,
          border: i === 0 ? 'none' : `1px solid ${BORDER}`,
          whiteSpace: 'nowrap',
        }}>{r.label}</Link>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   BIAS BAR
═════════════════════════════════════════════════════════════════ */
function BiasBar({ bias, height = 6, showLabels = true }: { bias: AllSidesStory['bias']; height?: number; showLabels?: boolean }) {
  return (
    <div className="w-full">
      {showLabels && (
        <div className="flex items-center justify-between mb-1.5" style={{
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em',
        }}>
          <span style={{ color: C_LEFT }}>L {bias.left}%</span>
          <span style={{ color: C_CENTER }}>C {bias.center}%</span>
          <span style={{ color: C_RIGHT }}>R {bias.right}%</span>
        </div>
      )}
      <div className="flex w-full overflow-hidden" style={{ height, borderRadius: 999, background: BORDER_LITE }}>
        <div style={{ width: `${bias.left}%`,   background: C_LEFT   }} />
        <div style={{ width: `${bias.center}%`, background: C_CENTER }} />
        <div style={{ width: `${bias.right}%`,  background: C_RIGHT  }} />
      </div>
    </div>
  );
}

function SourceChip({ story }: { story: AllSidesStory }) {
  const dom = dominantOf(story.bias);
  const pct = story.bias[dom];
  return (
    <div className="flex items-center gap-1.5" style={{ fontSize: 11.5, fontWeight: 700 }}>
      <span style={{ color: colorFor(dom), letterSpacing: '0.02em' }}>{pct}% {labelFor(dom)} cov.</span>
      <span style={{ color: FAINT }}>·</span>
      <span style={{ color: SUB }}>{story.totalSources} sources</span>
    </div>
  );
}

function MetaLine({ story }: { story: AllSidesStory }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" style={{
      fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase',
    }}>
      <span style={{
        padding: '2px 7px', background: INK, color: '#fff',
        borderRadius: 2, letterSpacing: '0.20em',
      }}>{story.category}</span>
      <span style={{ color: MUTED, letterSpacing: '0.08em', fontWeight: 600 }}>{story.location}</span>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   CARDS
═════════════════════════════════════════════════════════════════ */
function HeroCard({ story }: { story: AllSidesStory }) {
  return (
    <Link href="#" className="group block overflow-hidden hover:opacity-95 transition-opacity" style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
    }}>
      <div className="relative overflow-hidden">
        <img src={story.image} alt="" className="block w-full transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: '16/9', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <span className="absolute bottom-2 right-2 inline-flex items-center" style={{
          padding: '3px 8px', background: 'rgba(255,255,255,0.92)', color: INK,
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', borderRadius: 2,
        }}>
          {story.credit}
        </span>
      </div>
      <div className="p-6">
        <MetaLine story={story} />
        <h2 className="mt-3 mb-3" style={{
          color: INK, fontSize: 'clamp(1.375rem, 2.3vw, 1.875rem)', fontWeight: 700, lineHeight: 1.16,
          letterSpacing: '-0.018em',
        }}>{story.title}</h2>
        <p style={{ color: SUB, fontSize: 14.5, lineHeight: 1.55, marginBottom: 16 }}>{story.summary}</p>
        <BiasBar bias={story.bias} height={8} />
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <SourceChip story={story} />
          <div className="flex items-center gap-3" style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>
            {story.factuality && <span><strong style={{ color: SUB }}>Factuality</strong> · {story.factuality}</span>}
            {story.ownership  && <span><strong style={{ color: SUB }}>Ownership</strong> · {story.ownership}</span>}
            <span>{story.timestamp}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function DailyBriefingCard() {
  const top = STORIES.find((s) => s.id === DAILY_BRIEFING.topStoryId)!;
  return (
    <Link href="#" className="group flex flex-col overflow-hidden hover:opacity-95 transition-opacity" style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
    }}>
      <div className="relative overflow-hidden">
        <img src={top.image} alt="" className="block w-full transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: '21/9', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <div className="absolute top-3 left-3">
          <span style={{
            padding: '4px 11px', background: INK, color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: '0.26em',
            textTransform: 'uppercase', borderRadius: 2,
          }}>Daily Briefing</span>
        </div>
      </div>
      <div className="px-5 py-4 flex-1 flex flex-col">
        <p style={{ color: INK, fontSize: 'clamp(1rem, 1.3vw, 1.1875rem)', fontWeight: 700, lineHeight: 1.25, marginBottom: 12 }}>
          {DAILY_BRIEFING.title}
        </p>
        <div className="flex items-center gap-3 mb-3" style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: MUTED,
        }}>
          <span style={{ color: INK }}>● {DAILY_BRIEFING.storyCount} stories</span>
          <span style={{ color: FAINT }}>·</span>
          <span>{DAILY_BRIEFING.articleCount} articles</span>
          <span style={{ color: FAINT }}>·</span>
          <span>{DAILY_BRIEFING.readTime}</span>
        </div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {DAILY_BRIEFING.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 py-1.5" style={{ borderTop: i === 0 ? 'none' : `1px solid ${BORDER_LITE}` }}>
              <span style={{ color: FAINT, fontSize: 10.5, marginTop: 2 }}>↳</span>
              <span style={{ color: INK, fontSize: 13.5, fontWeight: 500, lineHeight: 1.35 }}>{b}</span>
            </li>
          ))}
        </ul>
        <span className="mt-3 inline-flex items-center gap-1.5" style={{
          color: INK, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          Read the briefing →
        </span>
      </div>
    </Link>
  );
}

function StoryCard({ story }: { story: AllSidesStory }) {
  return (
    <Link href="#" className="group flex flex-col overflow-hidden hover:opacity-95 transition-opacity" style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
    }}>
      <div className="relative overflow-hidden">
        <img src={story.image} alt="" className="block w-full transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: '16/10', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <MetaLine story={story} />
        <h3 className="mt-2.5 mb-2" style={{
          color: INK, fontSize: 'clamp(1rem, 1.15vw, 1.125rem)', fontWeight: 700, lineHeight: 1.22,
          letterSpacing: '-0.014em',
        }}>{story.title}</h3>
        <p className="mb-3 flex-1" style={{ color: SUB, fontSize: 13, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{story.summary}</p>
        <BiasBar bias={story.bias} height={5} />
        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <SourceChip story={story} />
          <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>{story.timestamp}</span>
        </div>
      </div>
    </Link>
  );
}

function BlindspotCard({ story }: { story: AllSidesStory }) {
  const missingSide = story.blindspotSide!;
  return (
    <Link href="#" className="group flex flex-col overflow-hidden hover:opacity-95 transition-opacity" style={{
      background: CARD, border: `1px solid ${BLINDSPOT}`, borderRadius: 8,
    }}>
      <div className="relative overflow-hidden">
        <img src={story.image} alt="" className="block w-full transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: '16/10', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1.5" style={{
          padding: '3px 9px', background: BLINDSPOT, color: '#fff',
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', borderRadius: 2,
        }}>
          <span style={{ width: 5, height: 5, background: '#fff', borderRadius: 999, display: 'inline-block' }} />
          Blindspot
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <p style={{
          fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: BLINDSPOT, marginBottom: 8,
        }}>
          Under-reported by the {labelFor(missingSide).toLowerCase()}
        </p>
        <h3 className="mb-2" style={{
          color: INK, fontSize: 'clamp(1rem, 1.18vw, 1.1875rem)', fontWeight: 700, lineHeight: 1.22,
          letterSpacing: '-0.014em',
        }}>{story.title}</h3>
        <p className="mb-3 flex-1" style={{ color: SUB, fontSize: 13, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{story.summary}</p>
        <BiasBar bias={story.bias} height={5} />
        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <SourceChip story={story} />
          <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>{story.timestamp}</span>
        </div>
      </div>
    </Link>
  );
}

function CompactStoryCard({ story }: { story: AllSidesStory }) {
  return (
    <Link href="#" className="group flex flex-col overflow-hidden hover:opacity-95 transition-opacity" style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8,
    }}>
      <div className="relative overflow-hidden">
        <img src={story.image} alt="" className="block w-full transition-transform duration-700 group-hover:scale-105"
          style={{ aspectRatio: '4/3', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="p-3.5 flex-1 flex flex-col">
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.20em', textTransform: 'uppercase', color: INK,
        }}>{story.category}</span>
        <h4 className="mt-2 mb-2" style={{
          color: INK, fontSize: 13.5, fontWeight: 700, lineHeight: 1.22, letterSpacing: '-0.01em',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{story.title}</h4>
        <BiasBar bias={story.bias} height={4} showLabels={false} />
        <div className="mt-2 flex items-center justify-between gap-1" style={{ fontSize: 10.5, fontWeight: 700 }}>
          <span style={{ color: colorFor(dominantOf(story.bias)) }}>
            {story.bias[dominantOf(story.bias)]}% {labelFor(dominantOf(story.bias))}
          </span>
          <span style={{ color: MUTED }}>{story.totalSources} src</span>
        </div>
      </div>
    </Link>
  );
}

function WideStoryCard({ story }: { story: AllSidesStory }) {
  return (
    <Link href="#" className="group grid items-stretch overflow-hidden hover:opacity-95 transition-opacity" style={{
      gridTemplateColumns: '1fr 1.6fr',
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, minHeight: 180,
    }}>
      <div className="relative overflow-hidden">
        <img src={story.image} alt="" className="block w-full h-full transition-transform duration-700 group-hover:scale-105"
          style={{ objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      </div>
      <div className="p-5 flex flex-col">
        <MetaLine story={story} />
        <h3 className="mt-2.5 mb-2" style={{
          color: INK, fontSize: 'clamp(1.0625rem, 1.25vw, 1.25rem)', fontWeight: 700, lineHeight: 1.22,
          letterSpacing: '-0.014em',
        }}>{story.title}</h3>
        <p className="mb-3 flex-1" style={{ color: SUB, fontSize: 13.5, lineHeight: 1.5,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{story.summary}</p>
        <BiasBar bias={story.bias} height={5} />
        <div className="mt-2.5 flex items-center justify-between gap-2 flex-wrap">
          <SourceChip story={story} />
          <span style={{ color: MUTED, fontSize: 11, fontWeight: 600 }}>{story.timestamp}</span>
        </div>
      </div>
    </Link>
  );
}

function BandTitle({ title, linkText }: { title: string; linkText?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 flex-wrap mb-6 pb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
      <h2 style={{
        fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 700, letterSpacing: '-0.018em', color: INK,
      }}>{title}</h2>
      {linkText && (
        <Link href="#" style={{
          color: INK, fontSize: 12, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
          borderBottom: `1px solid ${INK}`, paddingBottom: 1,
        }}>{linkText} →</Link>
      )}
    </div>
  );
}

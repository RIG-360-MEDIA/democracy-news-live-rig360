'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import { LONG_VIEW, type LongViewEntry } from './long-view-data';

/* ═════════════════════════════════════════════════════════════════
   THE LONG VIEW — rendered as a printed magazine you can flip
   through. Cover · contents · 10 article pages · back cover.
   3-D page-flip transitions, keyboard arrows, click-to-turn.
═════════════════════════════════════════════════════════════════ */

const PAPER  = '#f7f1e3';        /* aged-paper cream */
const PAGE   = '#fbf6e8';        /* slightly brighter page interior */
const INK    = '#0e0e0a';
const SUB    = '#2a2a26';
const MUTED  = '#6a6a64';
const FAINT  = '#9a9a8e';
const RULE   = '#d8cfb3';
const ACCENT = '#a8141a';        /* magazine red accent */
const AMBER  = '#6a4c19';        /* The Long View's mode color */
const DESK   = '#1a1612';        /* desk under the magazine */

const SPRING = [0.16, 1, 0.3, 1] as const;
const img = (tags: string) => `https://loremflickr.com/1400/900/${encodeURIComponent(tags)}?lock=1`;

/* ── Page set ───────────────────────────────────────────────── */
type PageKind = 'cover' | 'contents' | 'article' | 'back';
interface PageDef { kind: PageKind; entry?: LongViewEntry; folio: string }

const PAGES: PageDef[] = [
  { kind: 'cover',    folio: 'COVER' },
  { kind: 'contents', folio: 'CONTENTS' },
  ...LONG_VIEW.map((entry, i) => ({
    kind: 'article' as const, entry, folio: `${i + 1} / ${LONG_VIEW.length}`,
  })),
  { kind: 'back',     folio: 'BACK' },
];

/* ── Flip transition variants — resolved per-direction via `custom` ── */
const flipVariants: Variants = {
  enter: (d: 1 | -1) => ({
    rotateY: d === 1 ? 78 : -78,
    opacity: 0,
    transformOrigin: d === 1 ? '0% 50%' : '100% 50%',
  }),
  center: {
    rotateY: 0, opacity: 1, transformOrigin: '50% 50%',
  },
  exit: (d: 1 | -1) => ({
    rotateY: d === 1 ? -78 : 78,
    opacity: 0,
    transformOrigin: d === 1 ? '100% 50%' : '0% 50%',
  }),
};

export function LongViewPage() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  const next = useCallback(() => {
    setDir(1);
    setIdx((i) => Math.min(i + 1, PAGES.length - 1));
  }, []);
  const prev = useCallback(() => {
    setDir(-1);
    setIdx((i) => Math.max(i - 1, 0));
  }, []);
  const jump = useCallback((to: number) => {
    setDir(to > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(to, PAGES.length - 1)));
  }, [idx]);

  /* Keyboard navigation */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev]);

  const page = PAGES[idx];

  return (
    <div style={{
      background: DESK, minHeight: '100dvh', position: 'relative',
      fontFamily: 'var(--font-fraunces), Georgia, serif',
      padding: '24px 16px 48px',
      backgroundImage: `radial-gradient(ellipse 80% 60% at 50% 40%, #2a2017 0%, #120e08 100%)`,
    }}>
      {/* Top desk bar */}
      <div className="mx-auto flex items-center justify-between mb-5" style={{ maxWidth: 1180 }}>
        <Link href="/today" className="hover:opacity-80 transition-opacity inline-flex items-center gap-2" style={{
          fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic',
          color: '#d8c89c', fontSize: 14,
          fontVariationSettings: "'opsz' 24, 'SOFT' 100",
        }}>
          &larr; Back to today
        </Link>
        <Wordmark size="sm" href={null} />
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: '#d8c89c',
          fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, opacity: 0.8,
        }}>
          Aftermath &middot; Vol. IX &middot; Issue 23
        </span>
      </div>

      {/* Magazine */}
      <div className="mx-auto relative" style={{
        maxWidth: 1180, perspective: '2400px', perspectiveOrigin: '50% 40%',
      }}>
        <div className="relative mx-auto" style={{
          width: '100%', aspectRatio: '16/11', maxHeight: '78dvh',
          transformStyle: 'preserve-3d',
        }}>
          {/* Persistent paper-stack shadow underneath */}
          <PaperStackShadow />

          <AnimatePresence custom={dir} mode="wait">
            <motion.div
              key={idx}
              custom={dir}
              variants={flipVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.85, ease: SPRING }}
              className="absolute inset-0"
              style={{ transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
            >
              <PageShell folio={page.folio} pageNo={idx} total={PAGES.length}>
                {page.kind === 'cover'    && <CoverPage />}
                {page.kind === 'contents' && <ContentsPage onJump={(target) => jump(target)} />}
                {page.kind === 'article'  && <ArticleSpread entry={page.entry!} pageIndex={idx - 1} />}
                {page.kind === 'back'     && <BackCover onJump={jump} />}
              </PageShell>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between gap-4 flex-wrap" style={{ maxWidth: 1180, margin: '24px auto 0' }}>
          <NavButton onClick={prev} disabled={idx === 0} direction="prev" label="Previous page" />
          <div className="flex items-center gap-3 text-center">
            <span className="font-display italic" style={{
              color: '#e8d8b0', fontSize: 17, fontWeight: 500,
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            }}>
              {page.kind === 'cover' ? 'Cover'
                : page.kind === 'contents' ? 'Contents'
                : page.kind === 'back' ? 'Colophon'
                : `Page ${idx - 1} of ${LONG_VIEW.length}`}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono), monospace', color: '#d8c89c',
              fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.7,
            }}>
              ← →  to turn
            </span>
          </div>
          <NavButton onClick={next} disabled={idx === PAGES.length - 1} direction="next" label="Next page" />
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAGE SHELL — paper, edge shadows, folio, spine crease
═════════════════════════════════════════════════════════════════ */
function PageShell({ children, folio, pageNo, total }: {
  children: React.ReactNode; folio: string; pageNo: number; total: number;
}) {
  return (
    <div className="relative w-full h-full overflow-hidden" style={{
      background: PAGE, borderRadius: 4,
      boxShadow: `
        0 36px 80px -20px rgba(0,0,0,0.65),
        0 18px 36px -12px rgba(0,0,0,0.40),
        inset 0 0 0 1px rgba(20,18,14,0.10),
        inset 8px 0 18px -8px rgba(20,18,14,0.20),
        inset -8px 0 18px -8px rgba(20,18,14,0.20)
      `,
    }}>
      {/* Paper grain */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.05, mixBlendMode: 'multiply',
      }} />

      {/* Vertical spine crease in centre — gives the two-page-spread feeling */}
      <div aria-hidden className="absolute pointer-events-none" style={{
        left: '50%', top: 0, bottom: 0, width: 40, transform: 'translateX(-50%)',
        background: 'linear-gradient(90deg, transparent, rgba(20,18,14,0.10) 45%, rgba(20,18,14,0.18) 50%, rgba(20,18,14,0.10) 55%, transparent)',
      }} />

      {/* Page contents */}
      <div className="relative w-full h-full">
        {children}
      </div>

      {/* Folio */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-8" style={{
        fontFamily: 'var(--font-mono), monospace', color: MUTED,
        fontSize: 10.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase',
      }}>
        <span>Rig Wire &middot; Aftermath</span>
        <span style={{ color: AMBER }}>{folio}</span>
        <span>{pageNo + 1} / {total}</span>
      </div>
    </div>
  );
}

function PaperStackShadow() {
  return (
    <>
      {[6, 4, 2].map((off) => (
        <div key={off} aria-hidden className="absolute" style={{
          inset: 0, transform: `translateY(${off}px) translateX(${off * 0.5}px)`,
          background: '#e6dcb8', borderRadius: 4, opacity: 1 - off * 0.10, zIndex: -1,
          boxShadow: '0 4px 8px rgba(0,0,0,0.20)',
        }} />
      ))}
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════
   COVER
═════════════════════════════════════════════════════════════════ */
function CoverPage() {
  const featured = LONG_VIEW[0];
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Hero photo bleeds to all edges */}
      <img src={img('newsroom,abstract,paper')} alt="" className="absolute inset-0 w-full h-full object-cover"
        style={{ filter: 'saturate(0.85) contrast(0.95)' }}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
      {/* Cover gradient overlay */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(180deg, rgba(247,241,227,0.10) 0%, rgba(20,18,14,0.55) 60%, rgba(20,18,14,0.85) 100%)',
      }} />
      {/* Cover content */}
      <div className="relative h-full flex flex-col justify-between p-10 md:p-14" style={{ color: '#fbf6e8' }}>
        <div className="flex items-baseline justify-between">
          <span style={{
            fontFamily: 'var(--font-mono), monospace', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.32em', textTransform: 'uppercase', color: '#f3e388',
          }}>
            Vol. IX &middot; Issue 23 &middot; May 2026
          </span>
          <span style={{
            fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#fbf6e8aa',
          }}>
            $9.50 / £7.50 / €8.50
          </span>
        </div>

        <div>
          <p className="font-display italic mb-2" style={{
            color: '#f3e388', fontSize: 'clamp(1.125rem, 1.4vw, 1.4rem)',
            fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
          }}>
            A Rig Wire publication
          </p>
          <h1 className="font-display" style={{
            color: '#fbf6e8', fontSize: 'clamp(4rem, 11vw, 9rem)', fontWeight: 600, lineHeight: 0.88,
            letterSpacing: '-0.038em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 0",
            marginBottom: 14,
          }}>
            After<br /><em style={{
              fontWeight: 500, fontStyle: 'italic',
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            }}>math</em>
          </h1>
          <span className="block" style={{
            width: 120, height: 2, background: '#f3e388', marginBottom: 22,
          }} />
          <p className="font-display italic" style={{
            color: '#fbf6e8', fontSize: 'clamp(1.125rem, 1.55vw, 1.5rem)', lineHeight: 1.4, maxWidth: 600,
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}>
            Ten retrospectives. What we got right. What we missed. What still hasn&rsquo;t been said out loud.
          </p>
        </div>

        <div className="flex items-baseline justify-between gap-6 flex-wrap">
          <p style={{
            fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 800,
            letterSpacing: '0.22em', textTransform: 'uppercase', color: '#fbf6e8',
          }}>
            Inside &middot; {featured.title}
          </p>
          <p className="font-display italic" style={{
            color: '#f3e388', fontSize: 14,
            fontVariationSettings: "'opsz' 14, 'SOFT' 100",
          }}>
            turn the page &rarr;
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   CONTENTS
═════════════════════════════════════════════════════════════════ */
function ContentsPage({ onJump }: { onJump: (idx: number) => void }) {
  return (
    <div className="absolute inset-0 grid md:[grid-template-columns:1fr_1.4fr] gap-8 p-10 md:p-14">
      {/* Left — title block */}
      <div className="flex flex-col justify-between">
        <div>
          <p style={{
            fontFamily: 'var(--font-mono), monospace', color: AMBER,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
            marginBottom: 14,
          }}>In this issue</p>
          <h2 className="font-display italic" style={{
            color: INK, fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: 500, lineHeight: 0.95,
            letterSpacing: '-0.026em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            marginBottom: 18,
          }}>
            Contents
          </h2>
          <p className="font-display italic" style={{
            color: SUB, fontSize: 17, lineHeight: 1.55, maxWidth: 320,
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}>
            Ten pieces of retrospection — chosen for distance, weighted for honesty. The pieces aren&rsquo;t breaking. They&rsquo;ve been broken open by time.
          </p>
        </div>
        <div>
          <span aria-hidden className="block mb-3" style={{
            width: 64, height: 1.5, background: INK, opacity: 0.5,
          }} />
          <p className="font-display italic" style={{
            color: AMBER, fontSize: 14,
            fontVariationSettings: "'opsz' 14, 'SOFT' 100, 'WONK' 1",
          }}>
            Editor&rsquo;s note &middot; pg. 12
          </p>
        </div>
      </div>

      {/* Right — entries list */}
      <ol className="space-y-1 overflow-y-auto" style={{ counterReset: 'entries' }}>
        {LONG_VIEW.map((e, i) => (
          <li key={e.id}>
            <button onClick={() => onJump(i + 2)} className="w-full text-left hover:bg-[color:var(--hover)] transition-colors" style={{
              padding: '10px 12px', borderRadius: 3,
              ['--hover' as string]: '#efe6c8',
            }}>
              <div className="flex items-baseline gap-3">
                <span className="font-display italic flex-shrink-0" style={{
                  color: AMBER, fontSize: 22, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.022em',
                  fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
                  minWidth: 30,
                }}>
                  {e.number}
                </span>
                <div className="flex-1 min-w-0">
                  <p style={{
                    fontFamily: 'var(--font-mono), monospace', color: ACCENT,
                    fontSize: 9.5, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
                    marginBottom: 3,
                  }}>{e.kicker}</p>
                  <p className="font-display" style={{
                    color: INK, fontSize: 17, fontWeight: 500, lineHeight: 1.22, letterSpacing: '-0.014em',
                    fontVariationSettings: "'opsz' 24, 'SOFT' 50",
                  }}>
                    {e.title}
                  </p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-2 self-start">
                  <span aria-hidden style={{
                    flex: 1, width: 30, borderBottom: `1px dotted ${MUTED}`, marginBottom: 6,
                  }} />
                  <span className="font-display italic" style={{
                    color: INK, fontSize: 17, fontWeight: 500,
                    fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
                  }}>
                    {String(e.pageNo).padStart(2, '0')}
                  </span>
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   ARTICLE SPREAD — image-left, text-right (or alternating)
═════════════════════════════════════════════════════════════════ */
function ArticleSpread({ entry, pageIndex }: { entry: LongViewEntry; pageIndex: number }) {
  const reverse = pageIndex % 2 === 1;
  const imageQ = entry.kicker.split(' ')[0].toLowerCase();
  return (
    <div className={`absolute inset-0 grid md:[grid-template-columns:1fr_1fr] ${reverse ? 'md:[grid-template-areas:"text_image"]' : ''}`}>
      {/* IMAGE side */}
      <div className="relative overflow-hidden hidden md:block" style={{ gridArea: reverse ? 'image' : undefined }}>
        <img src={img(`${imageQ},retrospective,archive`)} alt="" className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: 'saturate(0.92)' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        {/* image caption */}
        <div className="absolute bottom-4 left-4 right-4 p-3" style={{
          background: 'rgba(20,18,14,0.78)', backdropFilter: 'blur(4px)', color: '#fbf6e8', borderRadius: 2,
        }}>
          <span style={{
            fontFamily: 'var(--font-mono), monospace', fontSize: 9, fontWeight: 800,
            letterSpacing: '0.24em', textTransform: 'uppercase', color: '#f3e388',
          }}>Figure I &middot; archive</span>
          <p className="italic mt-1" style={{
            fontSize: 12, lineHeight: 1.45,
            fontFamily: 'var(--font-fraunces), serif',
            fontVariationSettings: "'opsz' 14, 'SOFT' 100",
          }}>
            Photograph illustrating the long view. {entry.kicker.toLowerCase()}.
          </p>
        </div>
      </div>

      {/* TEXT side */}
      <div className="relative flex flex-col p-8 md:p-12 overflow-hidden" style={{ gridArea: reverse ? 'text' : undefined }}>
        {/* Large numeral watermark */}
        <span aria-hidden className="font-display italic absolute pointer-events-none" style={{
          top: -12, right: -8, color: AMBER, opacity: 0.10,
          fontSize: 'clamp(180px, 22vw, 320px)', lineHeight: 0.85, fontWeight: 500,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>
          {entry.number}
        </span>

        <p style={{
          fontFamily: 'var(--font-mono), monospace', color: ACCENT,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
          marginBottom: 18, position: 'relative',
        }}>
          {entry.kicker}
        </p>

        <h1 className="font-display" style={{
          color: INK, fontSize: 'clamp(2rem, 3.6vw, 3.25rem)', fontWeight: 500, lineHeight: 1.02,
          letterSpacing: '-0.026em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
          fontStyle: 'italic', marginBottom: 18, textWrap: 'balance', position: 'relative',
        }}>
          {entry.title}
        </h1>

        {/* Painted rule */}
        <span aria-hidden className="block" style={{
          width: 50, height: 2, background: `linear-gradient(90deg, ${AMBER}, transparent)`, marginBottom: 18, position: 'relative',
        }} />

        {/* Standfirst */}
        <p style={{
          color: SUB, fontSize: 'clamp(1.0625rem, 1.18vw, 1.1875rem)', lineHeight: 1.55,
          letterSpacing: '-0.005em', marginBottom: 22, position: 'relative',
          fontVariationSettings: "'opsz' 14, 'SOFT' 100", fontStyle: 'italic',
        }}>
          {entry.intro}
        </p>

        {/* Pull quote */}
        {entry.highlight && (
          <blockquote className="relative" style={{
            borderTop: `2px solid ${ACCENT}`, borderBottom: `2px solid ${ACCENT}`,
            padding: '14px 0', marginBottom: 22, marginRight: 18,
          }}>
            <p className="font-display italic" style={{
              color: INK, fontSize: 'clamp(1.25rem, 1.6vw, 1.5rem)', lineHeight: 1.32,
              letterSpacing: '-0.014em',
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
              textWrap: 'balance', textAlign: 'center',
            }}>
              &ldquo;{entry.highlight}.&rdquo;
            </p>
          </blockquote>
        )}

        {/* Body */}
        <p style={{
          color: SUB, fontSize: 15, lineHeight: 1.65,
          letterSpacing: '-0.002em', marginBottom: 20, position: 'relative',
          maxWidth: 540,
        }}>
          {entry.body}
        </p>

        {/* Byline + read full */}
        <div className="mt-auto pt-4 flex items-baseline justify-between gap-3 flex-wrap" style={{
          borderTop: `1px solid ${RULE}`, position: 'relative',
        }}>
          <p style={{
            fontFamily: 'var(--font-mono), monospace', color: MUTED,
            fontSize: 10.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            — {entry.byline} &middot; {entry.date} &middot; {entry.readTime}
          </p>
          <Link href="#" className="hover:opacity-75 transition-opacity" style={{
            fontFamily: 'var(--font-mono), monospace', color: AMBER,
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.20em', textTransform: 'uppercase',
            borderBottom: `1px solid ${AMBER}`, paddingBottom: 1,
          }}>
            Read the full piece &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   BACK COVER
═════════════════════════════════════════════════════════════════ */
function BackCover({ onJump }: { onJump: (idx: number) => void }) {
  return (
    <div className="absolute inset-0 flex flex-col p-10 md:p-14" style={{ background: PAGE }}>
      <p style={{
        fontFamily: 'var(--font-mono), monospace', color: AMBER,
        fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
        marginBottom: 20,
      }}>Colophon</p>
      <h2 className="font-display italic" style={{
        color: INK, fontSize: 'clamp(2.5rem, 4.5vw, 3.75rem)', fontWeight: 500, lineHeight: 1,
        letterSpacing: '-0.024em',
        fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        marginBottom: 28, textWrap: 'balance',
      }}>
        Made slowly, in print and on screen, in May 2026.
      </h2>

      <div className="grid md:[grid-template-columns:1fr_1fr] gap-10 mb-10">
        <div>
          <p style={{
            fontFamily: 'var(--font-mono), monospace', color: MUTED,
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>Editors</p>
          <p style={{ color: INK, fontSize: 15, lineHeight: 1.65 }}>
            Maya Krishnan &middot; Klaus Mueller &middot; Sara Liu &middot; Jordan Klein &middot; Lin Wei &middot; Marcus Chen &middot; Pablo Mendoza &middot; Maryam Hosseini &middot; Anjali Kapoor
          </p>
        </div>
        <div>
          <p style={{
            fontFamily: 'var(--font-mono), monospace', color: MUTED,
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase',
            marginBottom: 8,
          }}>Typeset in</p>
          <p style={{ color: INK, fontSize: 15, lineHeight: 1.65 }}>
            Fraunces for editorial display and body. Plus Jakarta Sans for navigation. JetBrains Mono for utility marks.
            Printed on warm cream paper, 100 gsm equivalent.
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-4 flex-wrap">
        <button onClick={() => onJump(0)} className="hover:opacity-75 transition-opacity inline-flex items-center gap-2" style={{
          fontFamily: 'var(--font-mono), monospace', color: AMBER,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          &larr; Back to the cover
        </button>
        <span className="font-display italic" style={{
          color: AMBER, fontSize: 19,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>
          Next issue: 6 June, 2026.
        </span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   NAV BUTTON
═════════════════════════════════════════════════════════════════ */
function NavButton({ onClick, disabled, direction, label }: {
  onClick: () => void; disabled: boolean; direction: 'prev' | 'next'; label: string;
}) {
  return (
    <button
      onClick={onClick} disabled={disabled} aria-label={label}
      className="hover:opacity-90 transition-opacity disabled:opacity-25 disabled:cursor-not-allowed inline-flex items-center gap-2"
      style={{
        padding: '10px 20px', borderRadius: 999,
        background: disabled ? '#3a342a' : '#efe6c8', color: disabled ? '#7a7565' : '#1a1612',
        fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 800,
        letterSpacing: '0.22em', textTransform: 'uppercase',
        boxShadow: disabled ? 'none' : '0 6px 14px -4px rgba(0,0,0,0.50)',
      }}
    >
      {direction === 'prev' ? <><span style={{ fontSize: 14 }}>&larr;</span> Turn back</> : <>Turn page <span style={{ fontSize: 14 }}>&rarr;</span></>}
    </button>
  );
}

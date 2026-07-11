'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import { MINUTE_STORIES } from './stories';
import { MinuteCard } from './minute-card';
import { ThumbnailRail } from './thumbnail-rail';
import { CelebrationScreen } from './celebration-screen';

const SPRING = [0.16, 1, 0.3, 1] as const;
const TOTAL  = MINUTE_STORIES.length;
/* If a reader had read the source articles, ~4 min each. Each Minute = 30s.
   Time saved per story ≈ 240s − 30s = 210s. */
const TIME_SAVED_PER = 210;
const UNIQUE_CATEGORIES = new Set(MINUTE_STORIES.map((s) => s.category)).size;

/* ═════════════════════════════════════════════════════════════════
   MinutePage — orchestrator. Holds the current index, direction,
   keyboard wiring, layout shell, transition choreography.
═════════════════════════════════════════════════════════════════ */
export function MinutePage() {
  const [index,     setIndex]     = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  /* Burst counter — increments on every advance to retrigger the
     particle effect even when the index stays put. */
  const [burst,     setBurst]     = useState(0);

  const isEnd = index >= TOTAL;
  const story = !isEnd ? MINUTE_STORIES[index] : MINUTE_STORIES[TOTAL - 1];
  const accent = story.categoryColor;

  /* ── Navigation actions ── */
  const goNext = useCallback(() => {
    setDirection(1);
    setBurst((b) => b + 1);
    setIndex((i) => Math.min(i + 1, TOTAL));
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const jumpTo = useCallback((target: number) => {
    setDirection(target > index ? 1 : -1);
    setBurst((b) => b + 1);
    setIndex(target);
  }, [index]);

  const restart = useCallback(() => {
    setDirection(-1);
    setIndex(0);
  }, []);

  /* ── Keyboard navigation ── */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      /* Don't fight with form fields. */
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        goPrev();
      } else if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const n = parseInt(e.key, 10) - 1;
        if (n < TOTAL) jumpTo(n);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, jumpTo]);

  /* ── YT-Shorts style scroll/swipe navigation ──
     Wheel down / trackpad swipe-up = next story (deltaY > 0)
     Wheel up   / trackpad swipe-dn = previous story (deltaY < 0)

     The hard problem is trackpad inertia: one physical gesture sends
     dozens of wheel events over up to ~1.5s.  A fixed-duration lock
     lets the tail-end of inertia trigger an extra advance.

     Solution: end-of-gesture detection.  Once we fire an advance we
     enter the "locked" state.  Every wheel event during lock REFRESHES
     a 320ms quiet-timer.  The lock only releases after wheel events
     stop arriving for 320ms — i.e. the trackpad inertia has fully
     died.  Hard cap of 1800ms prevents permanent lockup. */
  const lockRef       = useRef(false);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hardCapTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartY   = useRef<number | null>(null);
  const accumDelta    = useRef(0);

  const releaseLock = useCallback(() => {
    lockRef.current = false;
    accumDelta.current = 0;
    if (quietTimerRef.current) { clearTimeout(quietTimerRef.current); quietTimerRef.current = null; }
    if (hardCapTimer.current)  { clearTimeout(hardCapTimer.current);  hardCapTimer.current  = null; }
  }, []);

  const armLock = useCallback(() => {
    lockRef.current = true;
    /* Hard cap so we don't lock forever if events keep streaming. */
    if (hardCapTimer.current) clearTimeout(hardCapTimer.current);
    hardCapTimer.current = setTimeout(releaseLock, 1800);
    /* Quiet timer: released only when wheel stops for 320ms. */
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    quietTimerRef.current = setTimeout(releaseLock, 320);
  }, [releaseLock]);

  const refreshQuietTimer = useCallback(() => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    quietTimerRef.current = setTimeout(releaseLock, 320);
  }, [releaseLock]);

  useEffect(() => {
    function onWheel(e: WheelEvent) {
      /* Allow native scroll inside the thumbnail rail. */
      const target = e.target as HTMLElement | null;
      if (target?.closest('.minute-rail-scroll')) return;

      /* Otherwise this surface owns the wheel. */
      e.preventDefault();

      /* If already locked, just keep extending the quiet-timer so the
         tail of trackpad inertia doesn't trigger another advance. */
      if (lockRef.current) {
        refreshQuietTimer();
        return;
      }

      /* Accumulate small trackpad deltas; trigger past committed threshold. */
      accumDelta.current += e.deltaY;
      const THRESHOLD = 60;
      if (Math.abs(accumDelta.current) < THRESHOLD) return;

      if (accumDelta.current > 0) goNext();
      else                        goPrev();
      armLock();
    }

    function onTouchStart(e: TouchEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('.minute-rail-scroll')) return;
      touchStartY.current = e.touches[0]?.clientY ?? null;
    }
    function onTouchEnd(e: TouchEvent) {
      if (touchStartY.current === null || lockRef.current) return;
      const endY = e.changedTouches[0]?.clientY;
      if (endY === undefined) return;
      const dy = endY - touchStartY.current;
      touchStartY.current = null;
      const SWIPE_MIN = 50;
      if (Math.abs(dy) < SWIPE_MIN) return;
      if (dy < 0) goNext();   /* swiped up   = next */
      else        goPrev();   /* swiped down = prev */
      armLock();
    }
    function onTouchCancel() { touchStartY.current = null; }

    const wheelOpts = { passive: false } as AddEventListenerOptions;
    window.addEventListener('wheel',       onWheel,       wheelOpts);
    window.addEventListener('touchstart',  onTouchStart,  { passive: true });
    window.addEventListener('touchend',    onTouchEnd,    { passive: true });
    window.addEventListener('touchcancel', onTouchCancel, { passive: true });
    return () => {
      window.removeEventListener('wheel',       onWheel,       wheelOpts);
      window.removeEventListener('touchstart',  onTouchStart);
      window.removeEventListener('touchend',    onTouchEnd);
      window.removeEventListener('touchcancel', onTouchCancel);
      if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
      if (hardCapTimer.current)  clearTimeout(hardCapTimer.current);
    };
  }, [goNext, goPrev, armLock, refreshQuietTimer]);

  /* ── Date string for the header ── */
  const dateStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', {
      weekday: 'short', day: 'numeric', month: 'short',
    }).toUpperCase().replace(/,/g, ' ·');
  }, []);

  /* ── Progress %, time saved (animated)── */
  const progressPct = isEnd ? 100 : ((index + 1) / TOTAL) * 100;
  const timeSaved   = Math.min(index, TOTAL) * TIME_SAVED_PER;

  return (
    <div
      className="relative h-dvh flex flex-col overflow-hidden"
      style={{
        background: '#1a1815',
        fontFamily: 'var(--font-jakarta), sans-serif',
      }}
    >
      {/* ── BLURRED PHOTO BACKDROP ──────────────────────────
         The current story's image, heavily blurred and slightly
         oversaturated. Cross-fades over 900ms when you advance,
         so the whole ambient field becomes the article's mood. */}
      <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
        <AnimatePresence>
          <motion.img
            key={story.id}
            src={story.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter:    'blur(80px) saturate(1.30) brightness(0.78)',
              transform: 'scale(1.25)', /* overscale to hide blur edges */
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: SPRING }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </AnimatePresence>

        {/* Soft cream warming — keeps the Rig Wire editorial feel,
            stops the bg from feeling totally photographic. */}
        <div
          className="absolute inset-0"
          style={{
            background:   'rgba(251,248,241,0.18)',
            mixBlendMode: 'soft-light',
          }}
        />

        {/* Corner vignette for centre focus */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 35%, rgba(0,0,0,0.40) 100%)',
          }}
        />
      </div>

      {/* Very faint paper grain still on top for texture */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity:      0.035,
          mixBlendMode: 'overlay',
        }}
      />

      {/* ─────────── HEADER — collapsed to a thin Reels-style strip.
            Was 110px of section-masthead chrome; now ~44px total, just enough
            to carry the section tag + date + close. ─────────── */}
      <header
        className="relative z-10 px-5 md:px-8 lg:px-10 pt-2.5 pb-2"
        style={{
          background:     'rgba(15,14,12,0.42)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom:   '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center justify-between gap-6">
          {/* Left: shrunken wordmark — light on dark glass */}
          <Link href="/today" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span
              className="whitespace-nowrap"
              style={{
                fontFamily:    'var(--font-bricolage), system-ui, sans-serif',
                fontSize:      16,
                fontWeight:    800,
                letterSpacing: '-0.035em',
                lineHeight:    1,
                fontVariationSettings: "'wdth' 100, 'opsz' 96",
              }}
            >
              <span style={{ color: '#fafafa' }}>Rig</span>
              <span style={{ color: '#e84a4a' }}>Wire</span>
            </span>
          </Link>

          {/* Centre: ultra-minimal section + date on a single line.
              Reels-strip approach — no hairline rules, no two-line stack,
              just enough to know what mode and date you're in. */}
          <div className="flex items-baseline gap-3 leading-none">
            <span
              style={{
                color:         '#fafafa',
                fontFamily:    'var(--font-fraunces), Georgia, serif',
                fontSize:      12.5,
                fontWeight:    700,
                lineHeight:    1,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                paddingLeft:   '0.28em',
              }}
            >
              Flash
            </span>
            <span aria-hidden style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.30)' }} />
            <span
              className="font-display italic"
              style={{
                color:         'rgba(250,250,250,0.65)',
                fontSize:      12.5,
                fontWeight:    400,
                letterSpacing: '0.01em',
                fontVariationSettings: "'opsz' 14, 'SOFT' 100",
              }}
            >
              {dateStr.replace(/ ·/g, ',').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </span>
            <span aria-hidden style={{ width: 18, height: 1, background: 'rgba(255,255,255,0.30)' }} />
            <span
              className="font-display italic tabular-nums"
              style={{
                color:         '#fafafa',
                fontSize:      13,
                fontWeight:    500,
                letterSpacing: '0.02em',
                fontVariationSettings: "'opsz' 24, 'SOFT' 100, 'WONK' 1",
              }}
            >
              {String(Math.min(index + 1, TOTAL)).padStart(2, '0')}
              <span style={{ opacity: 0.4, margin: '0 3px' }}>/</span>
              <span style={{ opacity: 0.55 }}>{String(TOTAL).padStart(2, '0')}</span>
            </span>
          </div>

          {/* Right: plain text-link close, light on dark glass */}
          <Link
            href="/today"
            aria-label="Close — back to today"
            className="hover:opacity-100 transition-opacity inline-flex items-baseline gap-1.5"
            style={{
              fontFamily:    'var(--font-fraunces), Georgia, serif',
              fontStyle:     'italic',
              color:         'rgba(250,250,250,0.70)',
              fontSize:      13,
              fontVariationSettings: "'opsz' 14, 'SOFT' 100",
            }}
          >
            Close <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
          </Link>
        </div>

      </header>

      {/* ─────────── VIEWPORT-TOP PROGRESS STRIP ───────────
          Stories / Reels / Inshorts pattern: a thin 2px line at the very
          top of the screen fills as you advance. Counter lives inline in
          the header masthead above, so this is pure visual flow. */}
      <div className="fixed top-0 left-0 right-0 z-40" style={{ height: 2, background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full"
          animate={{ width: `${progressPct}%`, background: accent }}
          transition={{ duration: 0.7, ease: SPRING }}
          style={{ boxShadow: `0 0 8px ${accent}88` }}
        />
      </div>

      {/* ─────────── MAIN STAGE ─────────── */}
      <main className="relative z-10 flex-1 px-3 md:px-6 pt-2 pb-3 flex items-stretch min-h-0">
        <section className="flex-1 min-w-0 flex items-center justify-center">
          {/* Card / Celebration swap */}
          <div
            className="relative w-full flex justify-center"
            style={{ perspective: '1400px' }}
          >
            <AnimatePresence mode="wait" custom={direction}>
              {!isEnd ? (
                <MinuteCard
                  key={story.id}
                  story={story}
                  index={index}
                  total={TOTAL}
                  direction={direction}
                />
              ) : (
                <CelebrationScreen
                  key="celebration"
                  storiesCount={TOTAL}
                  categoriesCount={UNIQUE_CATEGORIES}
                  timeSavedSeconds={timeSaved}
                  onRestart={restart}
                />
              )}
            </AnimatePresence>

            {/* Burst overlay — small spark on each advance */}
            <BurstParticles key={`burst-${burst}`} color={accent} />
          </div>
        </section>
      </main>

      {/* ─────────── BOTTOM SWIPE AFFORDANCE ───────────
          Reels/Shorts/Inshorts gestural hint — pulsing chevron telling
          the user the gesture is vertical-up = next. Only visible while
          not at the celebration screen. */}
      {!isEnd && (
        <div aria-hidden className="fixed bottom-4 left-1/2 z-30 pointer-events-none" style={{ transform: 'translateX(-50%)' }}>
          <motion.div
            animate={{ y: [0, -6, 0], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-1"
          >
            <span
              style={{
                fontFamily:    'var(--font-mono), monospace',
                color:         'rgba(255,255,255,0.85)',
                fontSize:      9.5,
                fontWeight:    700,
                letterSpacing: '0.26em',
                textTransform: 'uppercase',
                textShadow:    '0 1px 8px rgba(0,0,0,0.55)',
              }}
            >
              Swipe up
            </span>
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 4px rgba(0,0,0,0.5))' }}>
              <path d="M2 8 L9 2 L16 8" />
            </svg>
          </motion.div>
        </div>
      )}
    </div>
  );
}


/* ═════════════════════════════════════════════════════════════════
   BurstParticles — tiny spark burst on each advance.
   12 mode-coloured particles fly outward from card centre.
═════════════════════════════════════════════════════════════════ */
function BurstParticles({ color }: { color: string }) {
  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      id:    i,
      angle: (i / 12) * Math.PI * 2,
      dist:  60 + Math.random() * 40,
      size:  3 + Math.random() * 3,
    }))
  ).current;
  return (
    <div aria-hidden className="absolute left-1/2 top-1/2 pointer-events-none" style={{ zIndex: 50 }}>
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * p.dist;
        const dy = Math.sin(p.angle) * p.dist;
        return (
          <motion.span
            key={p.id}
            className="absolute rounded-full"
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: dx, y: dy, scale: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            style={{
              width: p.size, height: p.size, background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
}

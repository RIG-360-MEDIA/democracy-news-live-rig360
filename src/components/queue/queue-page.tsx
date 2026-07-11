'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import {
  QUEUE,
  WAVEFORM_BARS,
  CATEGORY_COLORS,
  type QueueItem,
  type QueueCategory,
} from './queue-data';

/* ═════════════════════════════════════════════════════════════════
   THE QUEUE — editorial audio queue. Cream paper canvas, lavender
   accent, NYT-Audio-style now-playing panel + Spotify-style queue.
═════════════════════════════════════════════════════════════════ */

const CREAM   = '#f8f3e6';   /* warmer cream, Noema-feel */
const PAPER   = '#efe8d4';
const INK     = '#15130f';
const SUB     = '#3a3633';
const MUTED   = '#7a756e';
const FAINT   = '#a8a39c';
const RULE    = '#e0d8c5';   /* warmer rule */
const ACCENT  = '#4d3a85';
const ACCENT2 = '#7c6cb8';
const SPRING = [0.16, 1, 0.3, 1] as const;

/* ── Painted-cover palette per category — three colour stops that
   layer into a soft, abstract magazine-cover-feel artwork. */
type CategoryArt = { base: string; blob1: string; blob2: string; blob3: string; line: string };
const CATEGORY_ART: Record<QueueCategory, CategoryArt> = {
  'DAILY BRIEFING':  { base: '#1d1817', blob1: '#ff8a4a', blob2: '#ffcc70', blob3: '#c4582e', line: 'rgba(255,236,200,0.22)' },
  'LONG READ':       { base: '#241653', blob1: '#a98cd6', blob2: '#4d3a85', blob3: '#7546b8', line: 'rgba(255,255,255,0.22)' },
  'NEWS BRIEF':      { base: '#0e2840', blob1: '#5fa3d8', blob2: '#2a5d8a', blob3: '#7ec2e8', line: 'rgba(220,240,255,0.22)' },
  'INTERVIEW':       { base: '#3a1f0c', blob1: '#e09858', blob2: '#a86a2e', blob3: '#ddb87a', line: 'rgba(255,224,180,0.22)' },
  'MARKETS':         { base: '#0f3024', blob1: '#5dbf94', blob2: '#1f5d4a', blob3: '#9ce0bc', line: 'rgba(220,255,240,0.20)' },
  'WORLD':           { base: '#152340', blob1: '#5478b8', blob2: '#2a4a78', blob3: '#8eaedb', line: 'rgba(220,235,255,0.22)' },
  'OPINION':         { base: '#3a1230', blob1: '#c25aa0', blob2: '#7a2e5a', blob3: '#e69bcb', line: 'rgba(255,220,240,0.22)' },
  'CULTURE':         { base: '#3a2210', blob1: '#d99860', blob2: '#8a5a2a', blob3: '#f0bf85', line: 'rgba(255,230,200,0.22)' },
  'INVESTIGATION':   { base: '#3a0a0a', blob1: '#c45050', blob2: '#7a1a1a', blob3: '#e88a8a', line: 'rgba(255,210,210,0.22)' },
};

export function QueuePage() {
  /* ── Playback state ───────────────────────────────────────── */
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [progressSec,  setProgressSec]  = useState(0);
  const [speed,        setSpeed]        = useState<1 | 1.25 | 1.5 | 2>(1);
  const [recentlyOpen, setRecentlyOpen] = useState(false);
  const [played,       setPlayed]       = useState<Set<string>>(new Set());

  const current = QUEUE[currentIndex];

  /* ── Browser speech-synthesis engine ──────────────────────
     The first item ships with a transcript and is fully read aloud
     by the browser's Web Speech API. Items without transcripts fall
     back to a simulated timer so the queue still flows. */
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /* Helper: kick off speech for an item. */
  const startSpeechFor = useCallback((item: QueueItem, rate: number) => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth || !item.transcript) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(item.transcript);
    u.rate = rate;
    u.pitch = 1;
    u.volume = 1;
    /* Prefer a calm English voice if one is available */
    const voices = synth.getVoices();
    const preferred = voices.find((v) =>
      /en-GB|en-US/i.test(v.lang) && /(Samantha|Daniel|Karen|Google|Microsoft)/i.test(v.name)
    ) || voices.find((v) => /en/i.test(v.lang));
    if (preferred) u.voice = preferred;
    const total = item.transcript.length;
    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (typeof e.charIndex !== 'number') return;
      const pct = e.charIndex / total;
      setProgressSec(Math.min(pct * item.durationSec, item.durationSec));
    };
    u.onend = () => {
      setProgressSec(0);
      setPlayed((s) => new Set(s).add(item.id));
      setCurrentIndex((i) => Math.min(i + 1, QUEUE.length - 1));
    };
    u.onerror = () => { setIsPlaying(false); };
    utteranceRef.current = u;
    synth.speak(u);
  }, []);

  /* Timer fallback when no transcript is present */
  useEffect(() => {
    if (!isPlaying || current.transcript) return;
    const interval = setInterval(() => {
      setProgressSec((p) => {
        const next = p + speed;
        if (next >= current.durationSec) {
          setPlayed((s) => new Set(s).add(current.id));
          setCurrentIndex((i) => Math.min(i + 1, QUEUE.length - 1));
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, currentIndex, speed, current.transcript, current.durationSec, current.id]);

  /* On track change while playing: cancel + start speech for new item */
  useEffect(() => {
    setProgressSec(0);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (isPlaying && current.transcript) {
      startSpeechFor(current, speed);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [currentIndex]);

  /* On speed change while playing speech, restart at the new rate */
  useEffect(() => {
    if (isPlaying && current.transcript) {
      startSpeechFor(current, speed);
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [speed]);

  /* Cleanup on unmount */
  useEffect(() => () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const togglePlay = useCallback(() => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!isPlaying) {
      /* RESUME / START */
      if (synth?.paused && utteranceRef.current) {
        synth.resume();
      } else if (current.transcript) {
        startSpeechFor(current, speed);
      }
      setIsPlaying(true);
    } else {
      /* PAUSE */
      if (synth?.speaking) synth.pause();
      setIsPlaying(false);
    }
  }, [isPlaying, current, speed, startSpeechFor]);

  const skipFwd = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    setPlayed((s) => new Set(s).add(current.id));
    setCurrentIndex((i) => Math.min(i + 1, QUEUE.length - 1));
  }, [current.id]);

  const skipBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (progressSec > 3) setProgressSec(0);
    else setCurrentIndex((i) => Math.max(i - 1, 0));
  }, [progressSec]);

  const jumpTo = useCallback((idx: number) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
    if (idx === currentIndex) { togglePlay(); return; }
    if (idx > currentIndex) {
      setPlayed((s) => {
        const next = new Set(s);
        for (let k = currentIndex; k < idx; k++) next.add(QUEUE[k].id);
        return next;
      });
    }
    setCurrentIndex(idx);
    setIsPlaying(true);
  }, [currentIndex, togglePlay]);

  /* Derived state */
  const progressPct = (progressSec / current.durationSec) * 100;
  const upcoming = QUEUE.slice(currentIndex + 1);
  const recent   = QUEUE.slice(0, currentIndex).reverse();
  const totalRemainingSec = useMemo(() => {
    return QUEUE.slice(currentIndex).reduce((sum, it, i) => {
      return sum + (i === 0 ? (it.durationSec - progressSec) : it.durationSec);
    }, 0);
  }, [currentIndex, progressSec]);

  return (
    <div style={{
      background: CREAM, color: INK, minHeight: '100dvh',
      fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
    }}>
      <PaperGrain />

      {/* ─────────────── HEADER ─────────────── */}
      <TopBar
        totalCount={QUEUE.length}
        currentIndex={currentIndex}
        playedCount={played.size}
        totalRemainingSec={totalRemainingSec}
      />

      {/* ─────────────── STATS STRIP ─────────────── */}
      <ListeningStats
        played={played.size}
        total={QUEUE.length}
        timeListenedSec={progressSec + QUEUE.slice(0, currentIndex).reduce((s, x) => s + x.durationSec, 0)}
        categoriesHeard={new Set(QUEUE.slice(0, currentIndex + 1).map((q) => q.category)).size}
        remainingSec={totalRemainingSec}
        currentCategory={current.category}
      />

      {/* ─────────────── MAIN GRID ─────────────── */}
      <main className="relative z-10 px-5 md:px-10 lg:px-14 py-8 lg:py-10">
        <div className="mx-auto grid gap-8 lg:gap-10 lg:[grid-template-columns:1.1fr_1fr]" style={{ maxWidth: 1480 }}>
          <NowPlayingPanel
            item={current}
            isPlaying={isPlaying}
            progressSec={progressSec}
            progressPct={progressPct}
            speed={speed}
            onPlay={togglePlay}
            onSkipFwd={skipFwd}
            onSkipBack={skipBack}
            onSeek={(pct) => setProgressSec(Math.floor((pct / 100) * current.durationSec))}
            onSpeed={() => {
              const cycle: (1 | 1.25 | 1.5 | 2)[] = [1, 1.25, 1.5, 2];
              setSpeed(cycle[(cycle.indexOf(speed) + 1) % cycle.length]);
            }}
          />

          <section>
            {/* Up Next */}
            <SectionHead title="Up next" countText={`${upcoming.length} items · ${fmtBig(totalRemainingSec - (current.durationSec - progressSec))} remaining`} />
            <ul className="mt-3">
              {upcoming.map((it, i) => (
                <QueueRow
                  key={it.id}
                  item={it}
                  position={currentIndex + 1 + i + 1}
                  onClick={() => jumpTo(currentIndex + 1 + i)}
                />
              ))}
            </ul>

            {/* Recently played */}
            <Fleuron />
            <button
              onClick={() => setRecentlyOpen((o) => !o)}
              className="mt-3 w-full flex items-baseline justify-between gap-3 hover:opacity-75 transition-opacity text-left"
              style={{ paddingBottom: 6 }}
            >
              <span className="font-display italic" style={{
                color: INK, fontSize: 'clamp(1.25rem, 1.65vw, 1.5rem)', fontWeight: 500,
                letterSpacing: '-0.018em',
                fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
              }}>Recently played</span>
              <span style={{
                fontFamily: 'var(--font-mono), monospace', color: MUTED,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase',
              }}>
                {recent.length} items {recentlyOpen ? '▴' : '▾'}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {recentlyOpen && (
                <motion.ul
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: SPRING }}
                  className="overflow-hidden"
                >
                  {recent.length === 0 && (
                    <li className="py-4" style={{ color: MUTED, fontSize: 13.5 }}>
                      Nothing played yet. Press play to start the queue.
                    </li>
                  )}
                  {recent.map((it, i) => (
                    <QueueRow
                      key={it.id}
                      item={it}
                      position={currentIndex - i}
                      played
                      onClick={() => jumpTo(currentIndex - i - 1)}
                    />
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* ─────────────── PERSISTENT MINI PLAYER (footer) ─────────────── */}
      <MiniPlayer
        item={current}
        isPlaying={isPlaying}
        progressPct={progressPct}
        onPlay={togglePlay}
        onSkipFwd={skipFwd}
        onSkipBack={skipBack}
      />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAINTED COVER — layered painterly artwork per category.
   Magazine-cover feel: deep base, two-three coloured radial blobs,
   a swept SVG curve, fractal-noise texture, italic Fraunces glyph.
═════════════════════════════════════════════════════════════════ */
function PaintedCover({ item, size, rotating, simple }: {
  item: QueueItem; size: number; rotating?: boolean; simple?: boolean;
}) {
  const art = CATEGORY_ART[item.category];
  const radius = Math.max(6, size * 0.07);
  const fontSize = Math.round(size * (simple ? 0.34 : 0.32));
  const isMini = simple;
  return (
    <motion.div
      animate={rotating ? { rotate: 360 } : { rotate: 0 }}
      transition={rotating ? { duration: 32, ease: 'linear', repeat: Infinity } : { duration: 0.4 }}
      className="relative overflow-hidden"
      style={{
        width: size, height: size, borderRadius: radius,
        background: art.base,
        boxShadow: !isMini
          ? `0 32px 60px -18px ${art.blob2}aa, 0 14px 28px -10px rgba(20,18,14,0.22), inset 0 0 0 1px rgba(255,255,255,0.06)`
          : `0 4px 10px -2px rgba(20,18,14,0.18)`,
      }}
    >
      {/* Painterly blob layers */}
      <div className="absolute inset-0" style={{
        background:
          `radial-gradient(ellipse 70% 55% at 28% 22%, ${art.blob1} 0%, transparent 58%),
           radial-gradient(ellipse 60% 50% at 78% 70%, ${art.blob2} 0%, transparent 60%),
           radial-gradient(ellipse 50% 45% at 45% 55%, ${art.blob3}cc 0%, transparent 65%)`,
      }} />
      {/* Swept curve arc */}
      {!isMini && (
        <svg aria-hidden width={size} height={size} className="absolute inset-0" style={{ opacity: 0.7 }}>
          <defs>
            <linearGradient id={`grad-${item.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"  stopColor={art.line} />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d={`M ${size * 0.05} ${size * 0.85} Q ${size * 0.45} ${size * 0.15}, ${size * 0.95} ${size * 0.55}`}
            stroke={`url(#grad-${item.id})`} strokeWidth={size * 0.008} fill="none" strokeLinecap="round"
          />
          <circle cx={size * 0.18} cy={size * 0.78} r={size * 0.42} fill="none" stroke={art.line} strokeWidth={size * 0.004} />
          <circle cx={size * 0.82} cy={size * 0.28} r={size * 0.18} fill="none" stroke={art.line} strokeWidth={size * 0.004} />
        </svg>
      )}
      {/* Grain */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        opacity: 0.14, mixBlendMode: 'soft-light',
      }} />
      {/* Category top-left */}
      {!isMini && (
        <span style={{
          position: 'absolute', top: size * 0.06, left: size * 0.07,
          fontFamily: 'var(--font-mono), monospace', color: '#fff',
          fontSize: Math.max(9, size * 0.045), fontWeight: 800,
          letterSpacing: '0.26em', opacity: 0.92,
        }}>
          {item.category}
        </span>
      )}
      {/* Italic Fraunces glyph centred-bottom */}
      <span className="font-display italic absolute" style={{
        left: isMini ? '50%' : size * 0.08,
        bottom: isMini ? '50%' : size * 0.05,
        transform: isMini ? 'translate(-50%, 50%)' : 'none',
        color: '#fff',
        fontSize, fontWeight: 500, lineHeight: 0.85, letterSpacing: '-0.03em',
        fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        textShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}>
        {item.coverLabel}
      </span>
      {/* Subtle vignette */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 110% 110% at 50% 50%, transparent 50%, rgba(0,0,0,0.30) 100%)',
      }} />
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   LISTENING STATS — four-tile strip above the main grid
═════════════════════════════════════════════════════════════════ */
function ListeningStats({
  played, total, timeListenedSec, categoriesHeard, remainingSec, currentCategory,
}: {
  played: number; total: number; timeListenedSec: number; categoriesHeard: number;
  remainingSec: number; currentCategory: QueueCategory;
}) {
  /* Editorial line — no dashboard tiles. Reads like a magazine footnote.
     Numerals slip into mono so they tick as data; the prose stays italic
     Fraunces so it reads like a sentence, not a metric. */
  const num = (s: string) => (
    <span style={{
      fontFamily: 'var(--font-mono), monospace', fontStyle: 'normal',
      fontWeight: 700, letterSpacing: '0.04em', color: INK, marginInline: '0.15em',
    }}>{s}</span>
  );
  const hours = Math.floor(remainingSec / 3600);
  const mins  = Math.floor((remainingSec % 3600) / 60);
  return (
    <section className="relative z-10 px-5 md:px-10 lg:px-14 pt-8 pb-4">
      <div className="mx-auto flex items-center gap-5 flex-wrap" style={{ maxWidth: 1480 }}>
        {/* Hairline rule on either side, italic line in the middle */}
        <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${RULE})`, minWidth: 24 }} />
        <p className="font-display italic text-center" style={{
          color: SUB, fontSize: 'clamp(0.9375rem, 1.15vw, 1.0625rem)', fontWeight: 400,
          lineHeight: 1.55, letterSpacing: '-0.005em', maxWidth: 820,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        }}>
          You&rsquo;ve been listening for{num(fmtClock(timeListenedSec))}—{num(`${played}`)}
          {played === 1 ? 'story' : 'stories'} banked so far, {num(`${hours}h ${mins}m`)}still to come,
          across{num(`${categoriesHeard}`)}of nine categories tonight.
        </p>
        <span aria-hidden style={{ flex: 1, height: 1, background: `linear-gradient(270deg, transparent, ${RULE})`, minWidth: 24 }} />
      </div>
    </section>
  );
}

/* Mm:ss clock format */
function fmtClock(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
  return `${m}:${String(r).padStart(2,'0')}`;
}

/* ═════════════════════════════════════════════════════════════════
   FLEURON — small painted ornament between sections
═════════════════════════════════════════════════════════════════ */
function Fleuron({ color = ACCENT }: { color?: string }) {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3 my-1" style={{ color }}>
      <span style={{ height: 1, width: 28, background: `linear-gradient(90deg, transparent, ${color})` }} />
      <span className="font-display italic" style={{
        fontSize: 18, fontWeight: 500, lineHeight: 1, opacity: 0.7,
        fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
      }}>&#10086;</span>
      <span style={{ height: 1, width: 28, background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAPER GRAIN — subtle texture overlay
═════════════════════════════════════════════════════════════════ */
function PaperGrain() {
  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      opacity: 0.04, mixBlendMode: 'multiply', zIndex: 1,
    }} />
  );
}

/* ═════════════════════════════════════════════════════════════════
   TOP BAR
═════════════════════════════════════════════════════════════════ */
function TopBar({ totalCount, currentIndex, playedCount, totalRemainingSec }: {
  totalCount: number; currentIndex: number; playedCount: number; totalRemainingSec: number;
}) {
  return (
    <header
      className="relative z-10 px-5 md:px-10 lg:px-14 pt-5 md:pt-6 pb-3 flex items-center justify-between gap-6 flex-wrap"
      style={{
        background: 'rgba(251,248,241,0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${RULE}`,
      }}
    >
      <Link href="/today" className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity">
        <Wordmark size="md" href={null} />
      </Link>

      {/* Centre masthead — italic Fraunces, no badges or pulsing dots */}
      <div className="flex flex-col items-center leading-none">
        <h1 className="font-display italic" style={{
          color: INK, fontSize: 'clamp(1.5rem, 2.1vw, 1.9rem)',
          fontWeight: 500, lineHeight: 1, letterSpacing: '-0.022em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>
          Pocket
        </h1>
        <span className="mt-2" style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif', color: MUTED,
          fontSize: 12.5, fontWeight: 400, letterSpacing: '0.01em', fontStyle: 'italic',
          fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        }}>
          Saturday evening &middot; {fmtBig(totalRemainingSec)} left to listen
        </span>
      </div>

      {/* Right — quiet close link, no counter pill */}
      <Link href="/today" className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity" style={{
        fontFamily: 'var(--font-fraunces), Georgia, serif', fontStyle: 'italic',
        color: SUB, fontSize: 14, fontWeight: 400,
        fontVariationSettings: "'opsz' 24, 'SOFT' 100",
      }}>
        <span>Close</span>
        <span style={{ fontSize: 16, lineHeight: 1 }}>&times;</span>
      </Link>
    </header>
  );
}

/* ═════════════════════════════════════════════════════════════════
   NOW PLAYING PANEL — cover, title, waveform, controls
═════════════════════════════════════════════════════════════════ */
function NowPlayingPanel({
  item, isPlaying, progressSec, progressPct, speed,
  onPlay, onSkipFwd, onSkipBack, onSeek, onSpeed,
}: {
  item: QueueItem; isPlaying: boolean; progressSec: number; progressPct: number; speed: 1|1.25|1.5|2;
  onPlay: () => void; onSkipFwd: () => void; onSkipBack: () => void;
  onSeek: (pct: number) => void; onSpeed: () => void;
}) {
  return (
    <section className="relative">
      {/* Kicker */}
      <p style={{
        fontFamily: 'var(--font-mono), monospace', color: ACCENT,
        fontSize: 10.5, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        Now playing  ·  {item.source}
      </p>

      <div className="grid gap-8 md:[grid-template-columns:auto_1fr] items-center">
        {/* Painted cover — magazine-cover artwork, gentle rotation when playing */}
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.94, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: SPRING }}
        >
          <PaintedCover item={item} size={260} rotating={isPlaying} />
        </motion.div>

        {/* Title block */}
        <div className="min-w-0">
          <span style={{
            fontFamily: 'var(--font-mono), monospace', color: ACCENT,
            fontSize: 10.5, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
            display: 'inline-block', borderBottom: `1px solid ${ACCENT}40`, paddingBottom: 4, marginBottom: 14,
          }}>
            {item.category}
          </span>
          <motion.h2
            key={item.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: SPRING }}
            className="font-display"
            style={{
              color: INK, fontSize: 'clamp(2rem, 3.4vw, 3rem)',
              fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.028em',
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
              textWrap: 'balance', marginBottom: 18, fontStyle: 'italic',
            }}
          >
            {item.title}
          </motion.h2>
          {/* Painted accent rule */}
          <span aria-hidden className="block" style={{
            width: 40, height: 1, background: `linear-gradient(90deg, ${ACCENT}, transparent)`, marginBottom: 14,
          }} />
          <p className="italic font-display" style={{
            color: SUB, fontSize: 'clamp(1rem, 1.25vw, 1.1875rem)', fontWeight: 400,
            lineHeight: 1.45, marginBottom: 8, fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}>
            Read aloud by <span style={{ color: INK, fontWeight: 500 }}>{item.narrator}</span>
          </p>
          <p style={{
            fontFamily: 'var(--font-mono), monospace', color: MUTED,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase',
          }}>
            {item.duration} runtime  ·  {item.source}
          </p>
        </div>
      </div>

      {/* Waveform + progress */}
      <div className="mt-9">
        <Waveform progressPct={progressPct} onSeek={onSeek} />
        <div className="mt-2 flex items-center justify-between" style={{
          fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.06em', color: SUB,
        }}>
          <span>{fmt(progressSec)}</span>
          <span style={{ color: MUTED }}>−{fmt(Math.max(0, item.durationSec - progressSec))}</span>
        </div>
      </div>

      {/* Transport controls */}
      <div className="mt-7 flex items-center justify-center gap-5 md:gap-7 flex-wrap">
        {/* Speed */}
        <button onClick={onSpeed} className="inline-flex items-center justify-center hover:opacity-75 transition-opacity" style={{
          width: 48, height: 48, borderRadius: 999, border: `1px solid ${RULE}`,
          background: 'rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-mono), monospace', fontSize: 11.5, fontWeight: 800,
          color: INK, letterSpacing: '0.04em',
        }}>
          {speed === 1 ? '1x' : `${speed}x`}
        </button>

        {/* Skip back 15 */}
        <button onClick={onSkipBack} aria-label="Skip back" className="inline-flex items-center justify-center hover:opacity-75 transition-opacity" style={{
          width: 52, height: 52, borderRadius: 999, color: INK,
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 14 a9 9 0 1 0 4.5-7.8" />
            <path d="M5 4 v6 h6" />
            <text x="14" y="17" fill="currentColor" stroke="none" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">15</text>
          </svg>
        </button>

        {/* Big play/pause */}
        <motion.button
          onClick={onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
          className="inline-flex items-center justify-center"
          style={{
            width: 76, height: 76, borderRadius: 999,
            background: ACCENT, color: '#fff',
            boxShadow: `0 16px 32px -8px ${ACCENT}88, 0 6px 14px -4px rgba(20,18,14,0.22)`,
          }}
        >
          {isPlaying ? (
            <svg width="22" height="26" viewBox="0 0 22 26"><rect x="2" y="2" width="6" height="22" fill="currentColor" rx="1" /><rect x="14" y="2" width="6" height="22" fill="currentColor" rx="1" /></svg>
          ) : (
            <svg width="22" height="26" viewBox="0 0 22 26"><path d="M3 2 L21 13 L3 24 Z" fill="currentColor" /></svg>
          )}
        </motion.button>

        {/* Skip forward 30 */}
        <button onClick={onSkipFwd} aria-label="Skip forward" className="inline-flex items-center justify-center hover:opacity-75 transition-opacity" style={{
          width: 52, height: 52, borderRadius: 999, color: INK,
        }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 14 a9 9 0 1 1 -4.5-7.8" />
            <path d="M23 4 v6 h-6" />
            <text x="14" y="17" fill="currentColor" stroke="none" fontSize="9" fontWeight="700" textAnchor="middle" fontFamily="ui-monospace, monospace">30</text>
          </svg>
        </button>

        {/* Sleep timer */}
        <button aria-label="Sleep timer" className="inline-flex items-center justify-center hover:opacity-75 transition-opacity" style={{
          width: 48, height: 48, borderRadius: 999, border: `1px solid ${RULE}`,
          background: 'rgba(255,255,255,0.6)', color: INK,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M16 13 A8 8 0 1 1 7 4 a6 6 0 0 0 9 9 z" />
          </svg>
        </button>
      </div>

      {/* Status hint when not playing */}
      {!isPlaying && progressSec === 0 && (
        <p className="mt-5 text-center italic font-display" style={{
          color: MUTED, fontSize: 14, fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        }}>
          Press play. Pocket takes over from here.
        </p>
      )}
    </section>
  );
}

/* ═════════════════════════════════════════════════════════════════
   WAVEFORM — 80 vertical bars; filled lavender up to progress
═════════════════════════════════════════════════════════════════ */
function Waveform({ progressPct, onSeek }: { progressPct: number; onSeek: (pct: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    onSeek(Math.max(0, Math.min(100, pct)));
  }
  return (
    <div ref={trackRef} onClick={handleClick} className="relative flex items-center cursor-pointer" style={{ height: 56, gap: 3 }}>
      {WAVEFORM_BARS.map((amp, i) => {
        const barPct = (i / WAVEFORM_BARS.length) * 100;
        const passed = barPct < progressPct;
        const near   = !passed && Math.abs(barPct - progressPct) < 4;
        const h = Math.max(4, amp * 52);
        return (
          <span
            key={i}
            aria-hidden
            style={{
              flex: 1, height: h, borderRadius: 2,
              background: passed ? ACCENT : near ? ACCENT2 : '#d8cdb4',
              transition: 'background 240ms, transform 240ms',
              transform: near ? 'scaleY(1.08)' : 'scaleY(1)',
            }}
          />
        );
      })}
      {/* Playhead */}
      <span aria-hidden className="absolute top-0 bottom-0 pointer-events-none" style={{
        left: `${progressPct}%`, width: 2, background: ACCENT, transform: 'translateX(-1px)',
        boxShadow: `0 0 8px ${ACCENT}88`,
      }} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   QUEUE ROW — single upcoming or played item
═════════════════════════════════════════════════════════════════ */
function QueueRow({ item, position, played, onClick }: {
  item: QueueItem; position: number; played?: boolean; onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="group w-full flex items-center gap-3 py-3 px-2 -mx-2 hover:bg-[color:var(--hover)] transition-colors text-left"
        style={{
          borderBottom: `1px solid ${RULE}`,
          opacity: played ? 0.55 : 1,
          ['--hover' as string]: PAPER,
        }}
      >
        <span className="font-display flex-shrink-0 text-right" style={{
          width: 26, color: played ? FAINT : MUTED,
          fontSize: 16, fontWeight: 500, lineHeight: 1,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        }}>
          {String(position).padStart(2, '0')}
        </span>
        {/* Painted cover thumbnail */}
        <span className="flex-shrink-0 block">
          <PaintedCover item={item} size={48} simple />
        </span>
        {/* Text */}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 mb-0.5">
            <span style={{
              fontFamily: 'var(--font-mono), monospace', color: CATEGORY_COLORS[item.category],
              fontSize: 9.5, fontWeight: 800, letterSpacing: '0.20em',
            }}>
              {item.category}
            </span>
            <span style={{ color: FAINT, fontSize: 10 }}>·</span>
            <span style={{
              fontFamily: 'var(--font-mono), monospace', color: MUTED,
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em',
            }}>
              {item.narrator}
            </span>
          </span>
          <span className="font-display block truncate" style={{
            color: INK, fontSize: 14.5, fontWeight: 500, lineHeight: 1.22,
            letterSpacing: '-0.012em',
            fontVariationSettings: "'opsz' 24, 'SOFT' 50",
          }}>
            {item.title}
          </span>
        </span>
        {/* Duration */}
        <span className="flex-shrink-0 hidden md:block" style={{
          fontFamily: 'var(--font-mono), monospace', color: MUTED,
          fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em',
        }}>
          {item.duration}
        </span>
        {/* Play hint */}
        <span aria-hidden className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ACCENT, fontSize: 12 }}>▶</span>
      </button>
    </li>
  );
}

/* ═════════════════════════════════════════════════════════════════
   MINI PLAYER — persistent footer
═════════════════════════════════════════════════════════════════ */
function MiniPlayer({ item, isPlaying, progressPct, onPlay, onSkipFwd, onSkipBack }: {
  item: QueueItem; isPlaying: boolean; progressPct: number;
  onPlay: () => void; onSkipFwd: () => void; onSkipBack: () => void;
}) {
  return (
    <div className="sticky bottom-0 z-20 px-5 md:px-10 lg:px-14" style={{
      background: 'rgba(251,248,241,0.92)',
      backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${RULE}`,
    }}>
      {/* Thin progress strip */}
      <div className="relative" style={{ height: 2, background: '#ece6db' }}>
        <div style={{ width: `${progressPct}%`, height: '100%', background: ACCENT, transition: 'width 200ms linear' }} />
      </div>
      <div className="py-3 flex items-center gap-4">
        <span className="flex-shrink-0 block">
          <PaintedCover item={item} size={44} simple />
        </span>
        <div className="flex-1 min-w-0">
          <p className="block truncate font-display" style={{
            color: INK, fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
          }}>{item.title}</p>
          <p className="block truncate" style={{
            fontFamily: 'var(--font-mono), monospace', color: MUTED,
            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
          }}>
            {item.category} · {item.duration}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={onSkipBack} aria-label="Back" className="hover:opacity-70" style={{ padding: 6, color: INK }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4 v12 M16 4 L7 10 L16 16 Z" /></svg>
          </button>
          <button onClick={onPlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="inline-flex items-center justify-center" style={{
            width: 40, height: 40, borderRadius: 999, background: ACCENT, color: '#fff',
            boxShadow: `0 6px 14px -4px ${ACCENT}88`,
          }}>
            {isPlaying
              ? <svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="1" width="3.5" height="12" fill="currentColor" rx="0.5" /><rect x="7.5" y="1" width="3.5" height="12" fill="currentColor" rx="0.5" /></svg>
              : <svg width="12" height="14" viewBox="0 0 12 14"><path d="M2 1 L11 7 L2 13 Z" fill="currentColor" /></svg>}
          </button>
          <button onClick={onSkipFwd} aria-label="Skip" className="hover:opacity-70" style={{ padding: 6, color: INK }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor"><path d="M15 4 v12 M4 4 L13 10 L4 16 Z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PRIMITIVES & HELPERS
═════════════════════════════════════════════════════════════════ */
function SectionHead({ title, countText }: { title: string; countText: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="font-display italic" style={{
          color: INK, fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 500, lineHeight: 1,
          letterSpacing: '-0.022em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>{title}</h3>
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: MUTED,
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>
          {countText}
        </span>
      </div>
      <span aria-hidden className="block" style={{
        height: 1, background: `linear-gradient(90deg, ${INK} 0%, ${INK} 30%, ${RULE} 100%)`,
      }} />
    </div>
  );
}

function fmt(sec: number): string {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function fmtBig(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

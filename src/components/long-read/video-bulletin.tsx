'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { BulletinVideo } from '@/lib/worldwide/video-bulletin';

/* ═════════════════════════════════════════════════════════════════
   VIDEO BULLETIN — the day's anchor videos, first thing on the page.
   One player: the current video autoplays (muted until the reader turns sound on — browser
   rule), moves to the next when it ends, wraps around. Arrows + keyboard + an "Up next"
   scroller pick any video. Under the player: the story headline and a link to the article.
   Pauses when scrolled out of view; no autoplay under prefers-reduced-motion.
═════════════════════════════════════════════════════════════════ */

const BG = '#0c0e12';
const PANEL = '#15181e';
const LINE = 'rgba(255,255,255,0.12)';
const DIM = 'rgba(255,255,255,0.62)';
const RED = '#d6202a';
const SANS = 'var(--font-jakarta), system-ui, sans-serif';
const SERIF = 'var(--font-fraunces), Georgia, serif';
const label = { fontFamily: SANS, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const };

function mmss(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function VideoBulletin({ items }: { items: readonly BulletinVideo[] }) {
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(true);
  const [blocked, setBlocked] = useState(false); // autoplay refused (or reduced motion): show a play button
  const [progress, setProgress] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const strip = useRef<HTMLOListElement>(null);
  const visible = useRef(true);
  const mutedRef = useRef(true);
  mutedRef.current = muted;
  const n = items.length;
  const cur = items[i];

  const go = useCallback((k: number) => { setProgress(0); setI(((k % n) + n) % n); }, [n]);

  const play = useCallback(() => {
    const v = video.current;
    if (!v || !visible.current) return;
    v.muted = mutedRef.current; // React does not reliably set `muted` on a freshly mounted <video>
    v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  }, []);

  // New slide → autoplay it (unless the reader prefers reduced motion).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setBlocked(true); return; }
    play();
    strip.current?.querySelector<HTMLElement>(`[data-k="${i}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [i, play]);

  // Pause off-screen, resume when the band is back in view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (!e.isIntersecting) video.current?.pause();
      else if (!blocked) play();
    }, { threshold: 0.35 });
    io.observe(el);
    // Background tab / hidden window: browsers hold playback; resume when the reader comes back.
    const onVis = () => { if (document.visibilityState === 'visible' && visible.current && !blocked) play(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); };
  }, [play, blocked]);

  if (!cur) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); }
  };
  const href = `/long-read/${cur.storyId}`;

  return (
    <section ref={root} aria-label="Video bulletin" aria-roledescription="carousel" tabIndex={-1} onKeyDown={onKey}
      className="px-5 md:px-10 lg:px-16 pt-5 pb-6" style={{ background: BG, color: '#fff' }}>
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        {/* Band header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <div className="flex items-center gap-3">
            <span style={{ ...label, background: RED, color: '#fff', padding: '4px 9px', borderRadius: 2 }}>▶ Video</span>
            <span className="hidden sm:inline" style={{ ...label, color: '#fff' }}>Today&rsquo;s bulletin</span>
            <span style={{ ...label, color: DIM, letterSpacing: '0.1em' }}>{i + 1} / {n}</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowButton dir="prev" onClick={() => go(i - 1)} />
            <ArrowButton dir="next" onClick={() => go(i + 1)} />
          </div>
        </div>

        <div className="grid gap-6 lg:[grid-template-columns:minmax(0,2.1fr)_minmax(0,1fr)]">
          {/* PLAYER + caption — the player is capped by viewport height so the headline and link sit above the fold */}
          <div style={{ maxWidth: 'min(100%, max(480px, calc((100vh - 470px) * 16 / 9)))', width: '100%' }}>
            <div className="relative" style={{ aspectRatio: '16 / 9', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
              <video key={cur.storyId} ref={video} src={cur.url} poster={cur.poster} muted={muted} playsInline preload="metadata"
                onEnded={() => go(i + 1)} onError={() => window.setTimeout(() => go(i + 1), 4000)}
                onTimeUpdate={(e) => { const v = e.currentTarget; setProgress(v.duration ? v.currentTime / v.duration : 0); }}
                onClick={(e) => { const v = e.currentTarget; if (v.paused) play(); else v.pause(); }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />

              {/* Side arrows on the picture */}
              <OverlayArrow dir="prev" onClick={() => go(i - 1)} />
              <OverlayArrow dir="next" onClick={() => go(i + 1)} />

              {blocked && (
                <button type="button" onClick={play} aria-label="Play video"
                  style={{ position: 'absolute', inset: 0, margin: 'auto', width: 84, height: 84, borderRadius: '50%', border: 'none', background: 'rgba(214,32,42,0.92)', color: '#fff', fontSize: 30, cursor: 'pointer' }}>
                  ▶
                </button>
              )}

              <button type="button" onClick={() => { setMuted((m) => !m); if (video.current) video.current.muted = !muted; }}
                aria-label={muted ? 'Turn sound on' : 'Mute'}
                style={{ position: 'absolute', right: 14, bottom: 16, ...label, fontSize: 10.5, color: '#fff', background: 'rgba(0,0,0,0.62)', border: `1px solid ${LINE}`, borderRadius: 999, padding: '8px 13px', cursor: 'pointer' }}>
                {muted ? '🔇 Tap for sound' : '🔊 Sound on'}
              </button>

              {/* Progress */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 4, background: 'rgba(255,255,255,0.18)' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: RED, transition: 'width 0.25s linear' }} />
              </div>
            </div>

            {/* Caption: the article this video is about */}
            <div aria-live="polite" style={{ paddingTop: 16 }}>
              <div style={{ ...label, color: RED, marginBottom: 8 }}>{cur.kicker}</div>
              <Link href={href} style={{ color: '#fff', textDecoration: 'none' }}>
                <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.35rem, 1.9vw, 2rem)', fontWeight: 600, lineHeight: 1.12, letterSpacing: '-0.015em', margin: 0, textWrap: 'pretty' }}>
                  {cur.title}
                </h2>
              </Link>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ marginTop: 12 }}>
                <Link href={href} style={{ ...label, color: '#fff', borderBottom: `2px solid ${RED}`, paddingBottom: 2, textDecoration: 'none' }}>
                  Read the full story →
                </Link>
                <span style={{ fontFamily: SANS, fontSize: 13, color: DIM }}>Presented by {cur.anchorName}{cur.durationS ? ` · ${mmss(cur.durationS)}` : ''}</span>
              </div>
            </div>
          </div>

          {/* UP NEXT — scroller (vertical list on desktop, horizontal swipe strip on mobile) */}
          <div style={{ minWidth: 0 }}>
            <div style={{ ...label, color: DIM, marginBottom: 10 }}>Up next</div>
            <ol ref={strip} className="flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0"
              style={{ listStyle: 'none', margin: 0, padding: 0, scrollSnapType: 'x mandatory' }}>
              {items.map((v, k) => (
                <li key={v.storyId} data-k={k} style={{ scrollSnapAlign: 'start', flex: '0 0 auto' }} className="w-[78%] sm:w-[46%] lg:w-auto">
                  <button type="button" onClick={() => go(k)} aria-current={k === i ? 'true' : undefined}
                    className="grid w-full text-left [grid-template-columns:132px_1fr] gap-3"
                    style={{ background: k === i ? PANEL : 'transparent', border: `1px solid ${k === i ? 'rgba(214,32,42,0.75)' : LINE}`, borderRadius: 4, padding: 8, cursor: 'pointer', color: '#fff' }}>
                    <span className="relative block" style={{ aspectRatio: '16 / 9', background: '#000', borderRadius: 2, overflow: 'hidden' }}>
                      <img src={v.poster} alt="" className="block w-full h-full" style={{ objectFit: 'cover', opacity: k === i ? 1 : 0.8 }} />
                      <span style={{ position: 'absolute', left: 6, bottom: 6, ...label, fontSize: 9, background: k === i ? RED : 'rgba(0,0,0,0.7)', padding: '2px 6px', borderRadius: 2 }}>
                        {k === i ? 'Playing' : v.durationS ? mmss(v.durationS) : '▶'}
                      </span>
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ ...label, fontSize: 9.5, color: k === i ? RED : DIM, display: 'block', marginBottom: 4 }}>{v.kicker}</span>
                      <span style={{ fontFamily: SERIF, fontSize: 15, lineHeight: 1.25, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.title}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArrowButton({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir === 'prev' ? 'Previous video' : 'Next video'}
      style={{ width: 38, height: 38, borderRadius: '50%', border: `1px solid ${LINE}`, background: 'transparent', color: '#fff', fontSize: 17, cursor: 'pointer' }}>
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

function OverlayArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir === 'prev' ? 'Previous video' : 'Next video'} className="hidden md:block"
      style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [dir === 'prev' ? 'left' : 'right']: 14, width: 46, height: 46, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 24, cursor: 'pointer' }}>
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

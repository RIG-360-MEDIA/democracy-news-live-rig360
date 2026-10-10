'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { BulletinVideo } from '@/lib/worldwide/video-bulletin';

/* ═════════════════════════════════════════════════════════════════
   VIDEO BULLETIN — the day's anchor videos, first thing on the page.
   One story video at a time: it autoplays (muted until the reader turns sound on — browser
   rule), moves to the next when it ends, wraps around. Arrows on the player's left/right edges,
   keyboard ←/→ and dots pick any video. Beside the player (below it on mobile): the story
   headline and a link to the article. Kept short (~40% of the screen height) so Top News
   still shows on first load. Pauses off-screen; no autoplay under prefers-reduced-motion.
═════════════════════════════════════════════════════════════════ */

const BG = '#0c0e12';
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
      className="px-5 md:px-10 lg:px-16 py-5" style={{ background: BG, color: '#fff' }}>
      <div className="mx-auto grid gap-5 lg:gap-10 items-center lg:[grid-template-columns:auto_minmax(0,1fr)]" style={{ maxWidth: 1600 }}>
        {/* PLAYER — one story at a time; height capped (~40vh) so the band stays short */}
        <div className="relative lg:w-[min(58vw,calc(40vh*16/9))]"
          style={{ aspectRatio: '16 / 9', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
          <video key={cur.storyId} ref={video} src={cur.url} poster={cur.poster} muted={muted} playsInline preload="metadata"
            onEnded={() => go(i + 1)} onError={() => window.setTimeout(() => go(i + 1), 4000)}
            onTimeUpdate={(e) => { const v = e.currentTarget; setProgress(v.duration ? v.currentTime / v.duration : 0); }}
            onClick={(e) => { const v = e.currentTarget; if (v.paused) play(); else v.pause(); }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />

          {/* Arrows: vertical centre of the left and right edges */}
          {n > 1 && <EdgeArrow dir="prev" onClick={() => go(i - 1)} />}
          {n > 1 && <EdgeArrow dir="next" onClick={() => go(i + 1)} />}

          {blocked && (
            <button type="button" onClick={play} aria-label="Play video"
              style={{ position: 'absolute', inset: 0, margin: 'auto', width: 72, height: 72, borderRadius: '50%', border: 'none', background: 'rgba(214,32,42,0.92)', color: '#fff', fontSize: 26, cursor: 'pointer' }}>
              ▶
            </button>
          )}

          <button type="button" onClick={() => { setMuted((m) => !m); if (video.current) video.current.muted = !muted; }}
            aria-label={muted ? 'Turn sound on' : 'Mute'}
            style={{ position: 'absolute', right: 12, top: 12, ...label, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.62)', border: `1px solid ${LINE}`, borderRadius: 999, padding: '7px 12px', cursor: 'pointer' }}>
            {muted ? '🔇 Tap for sound' : '🔊 Sound on'}
          </button>

          {/* Progress */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.18)' }}>
            <div style={{ height: '100%', width: `${progress * 100}%`, background: RED, transition: 'width 0.25s linear' }} />
          </div>
        </div>

        {/* CAPTION — the article this video is about */}
        <div aria-live="polite" style={{ minWidth: 0 }}>
          <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
            <span style={{ ...label, background: RED, color: '#fff', padding: '4px 9px', borderRadius: 2 }}>▶ Video</span>
            <span style={{ ...label, color: '#fff' }}>Today&rsquo;s bulletin</span>
          </div>
          <div style={{ ...label, color: RED, marginBottom: 8 }}>{cur.kicker}</div>
          <Link href={href} style={{ color: '#fff', textDecoration: 'none' }}>
            <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.3rem, 1.9vw, 2.05rem)', fontWeight: 600, lineHeight: 1.14, letterSpacing: '-0.015em', margin: 0, textWrap: 'pretty', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {cur.title}
            </h2>
          </Link>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2" style={{ marginTop: 14 }}>
            <Link href={href} style={{ ...label, color: '#fff', borderBottom: `2px solid ${RED}`, paddingBottom: 2, textDecoration: 'none' }}>
              Read the full story →
            </Link>
            <span style={{ fontFamily: SANS, fontSize: 13, color: DIM }}>Presented by {cur.anchorName}{cur.durationS ? ` · ${mmss(cur.durationS)}` : ''}</span>
          </div>
          {/* Which video of the day this is */}
          {n > 1 && (
            <div className="flex items-center gap-2" style={{ marginTop: 20 }} role="tablist" aria-label="Choose a video">
              {items.map((v, k) => (
                <button key={v.storyId} type="button" role="tab" aria-selected={k === i} aria-label={`Video ${k + 1}: ${v.title}`}
                  onClick={() => go(k)}
                  style={{ width: k === i ? 26 : 9, height: 9, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: k === i ? RED : 'rgba(255,255,255,0.35)', transition: 'width 0.2s' }} />
              ))}
              <span style={{ ...label, color: DIM, letterSpacing: '0.1em', marginLeft: 6 }}>{i + 1} / {n}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function EdgeArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir === 'prev' ? 'Previous video' : 'Next video'}
      style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [dir === 'prev' ? 'left' : 'right']: 10, width: 42, height: 42, borderRadius: '50%', border: `1px solid ${LINE}`, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 24, lineHeight: '38px', cursor: 'pointer' }}>
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

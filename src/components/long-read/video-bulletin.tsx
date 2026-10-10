'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import type { BulletinVideo } from '@/lib/worldwide/video-bulletin';

/* ═════════════════════════════════════════════════════════════════
   VIDEO BULLETIN — the day's anchor videos, first thing on the page.
   One story video at a time. It autoplays with sound when the browser allows it; otherwise it
   starts muted and the reader's first click/tap/key anywhere on the page turns the sound on. Hovering the video shows
   YouTube-style controls: play/pause, a seek bar and the time. When a video ends the next one
   starts, wrapping around. Arrows sit on the band's left/right edges; keyboard ←/→, the dots
   and a phone swipe also switch. The story's name and link sit under the video. Pauses off-screen; no
   autoplay under prefers-reduced-motion.
═════════════════════════════════════════════════════════════════ */

const BG = '#0c0e12';
const LINE = 'rgba(255,255,255,0.14)';
const DIM = 'rgba(255,255,255,0.62)';
const RED = '#d6202a';
const SANS = 'var(--font-jakarta), system-ui, sans-serif';
const SERIF = 'var(--font-fraunces), Georgia, serif';
const label = { fontFamily: SANS, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const };
// Player width: capped by viewport height so the band (title + video + story name) stays on the first screen.
const PLAYER_W = 'min(100%, calc(38vh * 16 / 9))';

function mmss(s: number): string {
  const t = Math.max(0, Math.floor(s || 0));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

export function VideoBulletin({ items }: { items: readonly BulletinVideo[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false); // autoplay refused (or reduced motion): big play button
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const visible = useRef(true);
  const soundOn = useRef(false); // becomes true on the reader's first interaction with the player
  const touchX = useRef<number | null>(null); // phone swipe: left = next, right = previous
  const n = items.length;
  const cur = items[i];

  const go = useCallback((k: number) => { setT(0); setDur(0); setI(((k % n) + n) % n); }, [n]);

  // Try with sound first (allowed once the reader has interacted with the site); if the browser refuses
  // unmuted autoplay, start muted - the first click/tap/key anywhere on the page then turns the sound on.
  const play = useCallback(() => {
    const v = video.current;
    if (!v || !visible.current) return;
    v.muted = false;
    v.play().then(() => setBlocked(false)).catch(() => {
      if (video.current !== v) return;
      v.muted = true;
      v.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
    });
  }, []);

  // First interaction anywhere on the page = browser permission for sound: unmute the playing video.
  useEffect(() => {
    const unmute = () => {
      soundOn.current = true;
      if (video.current) video.current.muted = false;
    };
    const opts = { once: true, capture: true } as const;
    window.addEventListener('pointerdown', unmute, opts);
    window.addEventListener('keydown', unmute, opts);
    return () => { window.removeEventListener('pointerdown', unmute, opts); window.removeEventListener('keydown', unmute, opts); };
  }, []);

  /** Any deliberate touch of the player is a user gesture: the browser now allows sound. */
  const gesture = useCallback(() => {
    soundOn.current = true;
    if (video.current) video.current.muted = false;
  }, []);

  const toggle = useCallback(() => {
    gesture();
    const v = video.current;
    if (!v) return;
    if (v.paused) play(); else v.pause();
  }, [gesture, play]);

  // New slide → autoplay it (unless the reader prefers reduced motion).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setBlocked(true); return; }
    play();
  }, [i, play]);

  // Pause off-screen / in a background tab; resume when the band is back in view.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      visible.current = e.isIntersecting;
      if (!e.isIntersecting) video.current?.pause();
      else if (!blocked) play();
    }, { threshold: 0.35 });
    io.observe(el);
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
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const x0 = touchX.current; touchX.current = null;
        const dx = x0 === null ? 0 : e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 60) go(dx < 0 ? i + 1 : i - 1);
      }}
      className="relative px-5 md:px-20 pt-4 pb-4" style={{ background: BG, color: '#fff' }}>
      {/* Arrows on the band's left/right edges, vertically centred */}
      {n > 1 && <BandArrow dir="prev" onClick={() => go(i - 1)} />}
      {n > 1 && <BandArrow dir="next" onClick={() => go(i + 1)} />}

      <div className="mx-auto" style={{ width: PLAYER_W }}>
        {/* Band title */}
        <div className="flex items-center justify-between gap-4" style={{ marginBottom: 9 }}>
          <div className="flex items-center gap-3">
            <span aria-hidden style={{ background: RED, color: '#fff', fontSize: 11, padding: '5px 8px', borderRadius: 2, lineHeight: 1 }}>▶</span>
            <h2 style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.15rem, 1.5vw, 1.5rem)', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
              Video Bulletin
            </h2>
            <span className="hidden sm:inline" style={{ ...label, color: DIM, fontSize: 10.5 }}>Today&rsquo;s top stories</span>
          </div>
          <span style={{ ...label, color: DIM, letterSpacing: '0.1em' }}>{i + 1} / {n}</span>
        </div>

        {/* PLAYER — controls appear on hover (and while paused), like YouTube */}
        <div className="group relative" style={{ aspectRatio: '16 / 9', background: '#000', borderRadius: 4, overflow: 'hidden' }}>
          <video key={cur.storyId} ref={video} src={cur.url} poster={cur.poster} muted playsInline preload="metadata"
            onEnded={() => go(i + 1)} onError={() => window.setTimeout(() => go(i + 1), 4000)}
            onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onClick={toggle}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', cursor: 'pointer' }} />

          {blocked && (
            <button type="button" onClick={toggle} aria-label="Play video"
              style={{ position: 'absolute', inset: 0, margin: 'auto', width: 72, height: 72, borderRadius: '50%', border: 'none', background: 'rgba(214,32,42,0.92)', color: '#fff', fontSize: 26, cursor: 'pointer' }}>
              ▶
            </button>
          )}

          <div className={`absolute left-0 right-0 bottom-0 transition-opacity duration-200 ${playing ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}
            style={{ padding: '26px 14px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))' }}>
            <input type="range" aria-label="Seek" min={0} max={dur || 0} step={0.1} value={Math.min(t, dur || 0)}
              onChange={(e) => { gesture(); if (video.current) video.current.currentTime = Number(e.target.value); setT(Number(e.target.value)); }}
              className="block w-full cursor-pointer" style={{ accentColor: RED, height: 4, margin: 0 }} />
            <div className="flex items-center gap-3" style={{ marginTop: 8 }}>
              <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
                style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: 'transparent', color: '#fff', fontSize: playing ? 15 : 17, cursor: 'pointer', lineHeight: 1 }}>
                {playing ? '❚❚' : '▶'}
              </button>
              <span style={{ fontFamily: SANS, fontSize: 12.5, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
                {mmss(t)} / {mmss(dur || cur.durationS || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* The story this video is about — under the video */}
        <div aria-live="polite" style={{ paddingTop: 10 }}>
          <div style={{ ...label, color: RED, marginBottom: 6 }}>{cur.kicker}</div>
          <Link href={href} style={{ color: '#fff', textDecoration: 'none' }}>
            <h3 style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.1rem, 1.4vw, 1.5rem)', fontWeight: 600, lineHeight: 1.15, letterSpacing: '-0.015em', margin: 0, textWrap: 'pretty' }}>
              {cur.title}
            </h3>
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3" style={{ marginTop: 8 }}>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
              <Link href={href} style={{ ...label, color: '#fff', borderBottom: `2px solid ${RED}`, paddingBottom: 2, textDecoration: 'none' }}>
                Read the full story →
              </Link>
              <span style={{ fontFamily: SANS, fontSize: 13, color: DIM }}>Presented by {cur.anchorName}</span>
            </div>
            {n > 1 && (
              <div className="flex items-center gap-2" role="tablist" aria-label="Choose a video">
                {items.map((v, k) => (
                  <button key={v.storyId} type="button" role="tab" aria-selected={k === i} aria-label={`Video ${k + 1}: ${v.title}`}
                    onClick={() => go(k)}
                    style={{ width: k === i ? 24 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: k === i ? RED : 'rgba(255,255,255,0.35)', transition: 'width 0.2s' }} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function BandArrow({ dir, onClick }: { dir: 'prev' | 'next'; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={dir === 'prev' ? 'Previous video' : 'Next video'}
      className="hidden md:flex items-center justify-center"
      style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [dir === 'prev' ? 'left' : 'right']: 18, width: 48, height: 48, borderRadius: '50%', border: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 26, cursor: 'pointer', zIndex: 2 }}>
      {dir === 'prev' ? '‹' : '›'}
    </button>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SyntheticEvent } from 'react';

import type { CardView } from '@/lib/worldwide/to-view';
import { countryName } from '@/lib/worldwide/country';
import { pinPercent } from '@/lib/worldwide/geo';
import { LAND_PATH } from '@/lib/worldwide/worldmap-data';

/* ═════════════════════════════════════════════════════════════════
   AROUND THE WORLD — a live world map. One lead story per country plots as a
   pulsing pin on a dotted equirectangular map; hovering a pin (or the country
   rail) raises its story card. Below md, the map is replaced by a clean list
   (a wide map is unusable on a phone). Geographic view = the brand promise made
   legible: the world side by side, not Anglo-Atlantic first.
═════════════════════════════════════════════════════════════════ */

const INK = 'var(--rw-ink)';
const BODY = 'var(--rw-body)';
const MUTED = 'var(--rw-muted)';
const SOFT = 'var(--rw-faint)';
const RULE = 'var(--rw-rule)';
const RULE2 = 'var(--rw-rule-strong)';
const ACCENT = 'var(--rw-accent)';
const RED = 'var(--rw-red)';
const FALLBACK_IMAGE = '/cards/fallback-1.png';

function onImgError(e: SyntheticEvent<HTMLImageElement>): void {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = FALLBACK_IMAGE;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

interface Placed { s: CardView; p: { left: number; top: number } }

export function AroundTheWorld({ stories }: { stories: CardView[] }) {
  const placed: Placed[] = stories
    .map((s) => ({ s, p: pinPercent(s.country) }))
    .filter((x): x is Placed => x.p !== null);

  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  if (stories.length === 0) return null;

  // At rest NOTHING is active — no floating card, no red pin. A card raises only while a pin or a
  // rail row is actually hovered/focused, and drops the moment the cursor leaves (onMouseLeave below),
  // so the card can never sit over the map and block navigation.
  const active = activeSlug ? (placed.find((x) => x.s.slug === activeSlug) ?? null) : null;

  return (
    <section className="px-5 md:px-10 lg:px-16 pt-14 pb-16" style={{ borderTop: `3px solid ${RULE2}` }} aria-label="Around the World">
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        {/* ── Masthead ── */}
        <div className="text-center" style={{ marginBottom: 10 }}>
          <h2 className="font-display" style={{ color: INK, fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.026em', fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>
            Around the World
          </h2>
          <p className="font-display italic" style={{ color: MUTED, fontSize: 'clamp(0.95rem, 1.2vw, 1.15rem)', fontWeight: 400, marginTop: 10, fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            One headline from every corner — the world today, side by side.
          </p>
          <div style={{ width: 64, height: 3, background: RED, margin: '16px auto 0', borderRadius: 2 }} />
        </div>

        {placed.length === 0 ? (
          /* No mappable countries — fall back to a plain grid. */
          <div className="grid gap-x-9 gap-y-8 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {stories.map((s) => <ListCard key={s.slug} s={s} />)}
          </div>
        ) : (
          <>
            {/* ── DESKTOP: map + country rail ── */}
            <div className="hidden md:grid mt-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 224px', gap: 28, alignItems: 'start' }}>
              <div className="relative" style={{ width: '100%', aspectRatio: '2 / 1' }} onMouseLeave={() => setActiveSlug(null)}>
                <svg viewBox="0 0 1000 500" width="100%" height="100%" style={{ display: 'block' }} aria-hidden>
                  <defs>
                    <clipPath id="atw-land"><path d={LAND_PATH} /></clipPath>
                    <pattern id="atw-dots" width="7" height="7" patternUnits="userSpaceOnUse">
                      <circle cx="1.5" cy="1.5" r="1.15" fill="#c9c0aa" />
                    </pattern>
                  </defs>
                  <path d={LAND_PATH} fill="#efe9d9" />
                  <rect x="0" y="0" width="1000" height="500" fill="url(#atw-dots)" clipPath="url(#atw-land)" />
                </svg>

                {/* pins */}
                {placed.map(({ s, p }) => {
                  const isActive = active?.s.slug === s.slug;
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      aria-label={`${countryName(s.country)}: ${s.title}`}
                      onMouseEnter={() => setActiveSlug(s.slug)}
                      onFocus={() => setActiveSlug(s.slug)}
                      onClick={() => setActiveSlug(s.slug)}
                      className="atw-pin"
                      style={{ position: 'absolute', left: `${p.left}%`, top: `${p.top}%`, zIndex: isActive ? 5 : 2 }}
                    >
                      {!isActive && <span className="atw-pulse" style={{ background: ACCENT }} />}
                      <span className="atw-dot" style={{ background: isActive ? RED : ACCENT, width: isActive ? 15 : 10, height: isActive ? 15 : 10, boxShadow: isActive ? `0 0 0 4px rgba(168,20,26,0.18)` : 'none' }} />
                    </button>
                  );
                })}

                {/* floating active card */}
                {active && <FloatingCard s={active.s} p={active.p} />}
              </div>

              {/* rail */}
              <div>
                <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', borderBottom: `2px solid ${INK}`, paddingBottom: 8, marginBottom: 6 }}>
                  {placed.length} regions live
                </div>
                <ul className="atw-rail" style={{ maxHeight: 420, overflowY: 'auto' }} onMouseLeave={() => setActiveSlug(null)}>
                  {placed.map(({ s }) => {
                    const isActive = active?.s.slug === s.slug;
                    const inner = (
                      <span className="flex items-center gap-2.5" style={{ padding: '9px 4px' }}>
                        <PinGlyph color={isActive ? RED : SOFT} />
                        <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: isActive ? RED : INK, fontSize: 15.5, fontWeight: isActive ? 700 : 500, letterSpacing: '-0.006em' }}>
                          {countryName(s.country) || 'Worldwide'}
                        </span>
                      </span>
                    );
                    return (
                      <li key={s.slug} onMouseEnter={() => setActiveSlug(s.slug)} style={{ borderBottom: `1px solid ${RULE}` }}>
                        {s.href
                          ? <Link href={s.href} onFocus={() => setActiveSlug(s.slug)} className="block hover:opacity-80 transition-opacity">{inner}</Link>
                          : inner}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* ── MOBILE: stacked list (a map is unusable on a phone) ── */}
            <div className="md:hidden mt-8 grid gap-y-7">
              {placed.map(({ s }) => <ListCard key={s.slug} s={s} />)}
            </div>
          </>
        )}
      </div>

      <style>{`
        .atw-pin { border: 0; background: transparent; padding: 0; cursor: pointer; transform: translate(-50%, -50%); line-height: 0; }
        .atw-dot { display: block; border-radius: 9999px; border: 2px solid var(--rw-cream, #fbf8f0); transition: width .15s ease, height .15s ease; }
        .atw-pulse { position: absolute; left: 50%; top: 50%; width: 11px; height: 11px; margin: -5.5px 0 0 -5.5px; border-radius: 9999px; opacity: .5; animation: atwPulse 2.6s ease-out infinite; }
        @keyframes atwPulse { 0% { transform: scale(1); opacity: .5; } 70% { transform: scale(3.4); opacity: 0; } 100% { transform: scale(3.4); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .atw-pulse { animation: none; opacity: .3; } }
      `}</style>
    </section>
  );
}

/* Floating story card near the active pin, clamped to stay on the map. */
function FloatingCard({ s, p }: { s: CardView; p: { left: number; top: number } }) {
  const W = 33; // card width, % of map
  const left = clamp(p.left > 50 ? p.left - W - 3 : p.left + 3, 1, 100 - W - 1);
  const top = clamp(p.top - 10, 2, 60);
  const card = (
    <div className="flex" style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 14px 40px -12px rgba(20,23,31,0.35)', border: `1px solid ${RULE}` }}>
      <img src={s.image} alt="" onError={onImgError} style={{ width: '42%', objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ padding: '13px 15px', minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>{s.kicker}</div>
        <div style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: INK, fontSize: 'clamp(1rem, 1.15vw, 1.2rem)', fontWeight: 700, lineHeight: 1.16, letterSpacing: '-0.012em', textWrap: 'balance' }}>{s.title}</div>
        <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginTop: 9 }}>{s.timestamp}</div>
      </div>
    </div>
  );
  return (
    <div className="atw-card-in" style={{ position: 'absolute', left: `${left}%`, top: `${top}%`, width: `${W}%`, zIndex: 6, pointerEvents: 'auto' }}>
      {s.href ? <Link href={s.href} className="block hover:opacity-95 transition-opacity">{card}</Link> : card}
    </div>
  );
}

/* A small teardrop map-pin glyph for the rail. */
function PinGlyph({ color }: { color: string }) {
  return (
    <svg width="12" height="15" viewBox="0 0 12 15" fill="none" style={{ flexShrink: 0 }} aria-hidden>
      <path d="M6 0C2.7 0 0 2.6 0 5.9 0 10.1 6 15 6 15s6-4.9 6-9.1C12 2.6 9.3 0 6 0z" fill={color} />
      <circle cx="6" cy="5.9" r="2.1" fill="#fff" />
    </svg>
  );
}

/* Thumbnail card used for the no-map fallback and the mobile list. */
function ListCard({ s }: { s: CardView }) {
  const title = s.href
    ? <Link href={s.href} className="hover:opacity-75 transition-opacity">{s.title}</Link>
    : <span>{s.title}</span>;
  return (
    <article>
      {s.href
        ? <Link href={s.href} aria-label={s.title} className="block"><img src={s.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover', marginBottom: 12 }} onError={onImgError} /></Link>
        : <img src={s.image} alt="" className="block w-full" style={{ aspectRatio: '16/10', objectFit: 'cover', marginBottom: 12 }} onError={onImgError} />}
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{s.kicker}</span>
        <span style={{ fontFamily: 'var(--font-mono), monospace', color: SOFT, fontSize: 9.5, letterSpacing: '0.08em' }}>{s.timestamp}</span>
      </div>
      <h4 style={{ color: INK, fontSize: 'clamp(1.0625rem, 1.4vw, 1.25rem)', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance' }}>
        {title}
      </h4>
    </article>
  );
}

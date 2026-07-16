'use client';

import { useEffect, useState } from 'react';

import { videos, type Video } from './videos-data';

/* ═════════════════════════════════════════════════════════════════
   WATCH — Democracy News Live's channel, embedded, as a dark-cinema
   CONTACT SHEET: an asymmetric mosaic of red-duotone 16:9 frames (the
   feature is the big one) that lift + bloom to full colour on hover.
   Click any → Theater mode with AMBIENT glow (the backdrop blooms with
   the film's own colours) and a browsable reel. Renders only with data.
═════════════════════════════════════════════════════════════════ */

const SERIF = 'var(--font-fraunces), Georgia, serif';
const UI = 'var(--font-jakarta), sans-serif';
const MONO = 'var(--font-mono), monospace';
const RED = 'var(--rw-red)';
const BG = '#0E0B0A';
const CREAM = '#F2ECE2';
const LINE = '#2A211C';
const AREAS = ['b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

const thumb = (id: string): string => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
const embed = (id: string): string => `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
const ALLOW = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

function Tri({ w }: { w: number }) {
  return <svg width={w} height={w * 1.16} viewBox="0 0 12 14" aria-hidden="true"><path d="M0 0l12 7-12 7z" fill="#fff" /></svg>;
}
function Expand({ stroke }: { stroke: string }) {
  return <svg width={14} height={14} viewBox="0 0 14 14" aria-hidden="true"><path d="M1 5V1h4M13 5V1H9M1 9v4h4M13 9v4H9" fill="none" stroke={stroke} strokeWidth="1.6" /></svg>;
}

export function VideoBand() {
  const feature = videos.find((v) => v.kind === 'feature') ?? videos[0];
  const [active, setActive] = useState<Video | undefined>(feature);
  const [theater, setTheater] = useState(false);

  useEffect(() => {
    if (!theater || !active) return;
    const at = videos.findIndex((v) => v.youtubeId === active.youtubeId);
    const go = (d: number) => setActive(videos[(at + d + videos.length) % videos.length]);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTheater(false);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [theater, active]);

  if (videos.length === 0 || !active) return null;

  const gridItems = videos.filter((v) => v.youtubeId !== feature.youtubeId).slice(0, 8);
  const idx = videos.findIndex((v) => v.youtubeId === active.youtubeId);

  const open = (v: Video): void => { setActive(v); setTheater(true); };
  const step = (d: number): void => setActive(videos[(idx + d + videos.length) % videos.length]);

  const Tile = ({ v, area, no, feat }: { v: Video; area: string; no: number; feat?: boolean }) => (
    <button type="button" onClick={() => open(v)} title={v.title} aria-label={v.title}
      className={`vb-tile${feat ? ' vb-feat' : ''}`} style={{ gridArea: area }}>
      <img src={thumb(v.youtubeId)} alt="" />
      <span className="vb-duo" />
      <span className="vb-shade" />
      {feat ? <span className="vb-rib">● Feature</span> : <span className="vb-fno">{String(no).padStart(2, '0')}</span>}
      {v.kind === 'short' && <span className="vb-tag">Short</span>}
      <span className="vb-play" style={{ width: feat ? 60 : 38, height: feat ? 60 : 38 }}><Tri w={feat ? 16 : 11} /></span>
      <span className="vb-meta">
        <span style={{ fontFamily: UI, color: '#fff', fontSize: feat ? 11 : 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}><span style={{ color: RED }}>●</span> {v.kicker}</span>
        <span style={{ display: 'block', fontFamily: SERIF, color: '#fff', fontWeight: 700, lineHeight: 1.1, marginTop: 5, fontSize: feat ? 'clamp(1.2rem, 2vw, 1.9rem)' : 13, textWrap: 'balance' }}>{v.title}</span>
      </span>
    </button>
  );

  return (
    <section id="video" className="px-5 md:px-10 lg:px-16 pt-14 pb-16"
      style={{ borderTop: `3px solid ${RED}`, color: CREAM, scrollMarginTop: 96,
        background: `radial-gradient(100% 80% at 50% -12%, rgba(226,59,48,0.09), transparent 55%), radial-gradient(140% 120% at 50% 46%, transparent 62%, rgba(0,0,0,0.55)), ${BG}` }}>
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        {/* header */}
        <div className="flex items-end justify-between gap-4 mb-8" style={{ borderBottom: `1px solid ${LINE}`, paddingBottom: 12 }}>
          <div className="flex items-center gap-3">
            <span style={{ width: 34, height: 34, borderRadius: '50%', background: RED, display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(226,59,48,0.5)' }}><Tri w={12} /></span>
            <div>
              <div style={{ fontFamily: UI, color: RED, fontSize: 10, fontWeight: 800, letterSpacing: '0.24em', textTransform: 'uppercase' }}>Democracy News Live · Originals</div>
              <h2 style={{ fontFamily: SERIF, color: CREAM, fontSize: 'clamp(1.875rem, 2.6vw, 2.5rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", marginTop: 2 }}>Watch</h2>
            </div>
          </div>
          <button type="button" onClick={() => setTheater(true)} className="hidden md:inline-flex items-center gap-2 hover:opacity-70 transition-opacity" style={{ fontFamily: UI, color: CREAM, fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', border: `1px solid ${LINE}`, borderRadius: 999, padding: '8px 15px' }}>
            <Expand stroke="currentColor" /> Theater mode
          </button>
        </div>

        {/* the contact sheet */}
        <div className="vb-mosaic">
          <Tile v={feature} area="feat" no={1} feat />
          {gridItems.map((v, i) => <Tile key={v.youtubeId} v={v} area={AREAS[i]} no={i + 2} />)}
        </div>
      </div>

      {/* ── THEATER MODE (with ambient bloom) ── */}
      {theater && (
        <div role="dialog" aria-modal="true" aria-label="Theater mode" onClick={() => setTheater(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#070606', display: 'flex', flexDirection: 'column' }}>
          {/* ambient backdrop — the film's own colours, blurred */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '-12%', backgroundImage: `url(${thumb(active.youtubeId)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(80px) saturate(1.8) brightness(0.5)', transform: 'scale(1.25)', opacity: 0.55, transition: 'opacity .5s ease' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 50% 42%, transparent 40%, rgba(6,5,5,0.85))' }} />
          </div>

          <div className="flex items-center justify-between gap-4" style={{ padding: '18px 22px', position: 'relative', zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
            <div>
              <div style={{ fontFamily: UI, color: RED, fontSize: 10, fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase' }}>{active.kicker}</div>
              <div style={{ fontFamily: SERIF, color: '#fff', fontSize: 'clamp(1.05rem, 1.8vw, 1.5rem)', fontWeight: 700, lineHeight: 1.1, marginTop: 4, maxWidth: '60ch' }}>{active.title}</div>
            </div>
            <button type="button" aria-label="Close theater" onClick={() => setTheater(false)} style={{ width: 40, height: 40, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.3)', display: 'grid', placeItems: 'center', flexShrink: 0, cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
              <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1l14 14M15 1L1 15" stroke="#fff" strokeWidth="1.6" /></svg>
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4" onClick={(e) => e.stopPropagation()} style={{ minHeight: 0, position: 'relative', zIndex: 1 }}>
            <div className="relative w-full" style={{ maxWidth: 'min(1200px, 92vw)', aspectRatio: '16 / 9', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.8)' }}>
              <button type="button" aria-label="Previous film" onClick={() => step(-1)} className="hidden md:grid" style={{ position: 'absolute', left: -58, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', placeItems: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2L4 8l6 6" fill="none" stroke="#fff" strokeWidth="1.8" /></svg>
              </button>
              <iframe key={active.youtubeId} title={active.title} src={embed(active.youtubeId)} allow={ALLOW} allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, borderRadius: 4, background: '#000' }} />
              <button type="button" aria-label="Next film" onClick={() => step(1)} className="hidden md:grid" style={{ position: 'absolute', right: -58, top: '50%', transform: 'translateY(-50%)', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)', placeItems: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.25)' }}>
                <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true"><path d="M6 2l6 6-6 6" fill="none" stroke="#fff" strokeWidth="1.8" /></svg>
              </button>
            </div>
          </div>
          <div onClick={(e) => e.stopPropagation()} style={{ padding: '14px 22px 22px', position: 'relative', zIndex: 1 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span style={{ fontFamily: UI, color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase' }}>The reel · {videos.length} films</span>
              <span style={{ fontFamily: MONO, color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>← → browse · Esc close</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {videos.map((v) => {
                const on = v.youtubeId === active.youtubeId;
                return (
                  <button key={v.youtubeId} type="button" onClick={() => setActive(v)} title={v.title} className="relative shrink-0 overflow-hidden"
                    style={{ width: 140, aspectRatio: '16 / 9', borderRadius: 3, cursor: 'pointer', outline: on ? `2px solid ${RED}` : '1px solid rgba(255,255,255,0.15)', outlineOffset: -2, opacity: on ? 1 : 0.55, transition: 'opacity .2s', boxShadow: on ? '0 0 22px rgba(226,59,48,0.5)' : 'none' }}>
                    <img src={thumb(v.youtubeId)} alt="" className="block w-full h-full" style={{ objectFit: 'cover' }} />
                    {!on && <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .vb-mosaic{display:grid;gap:9px;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(6,1fr);
          aspect-ratio:16/27;grid-template-areas:"feat feat" "feat feat" "b c" "d e" "f g" "h i";}
        @media(min-width:768px){.vb-mosaic{grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(3,1fr);
          aspect-ratio:64/27;grid-template-areas:"feat feat b c" "feat feat d e" "f g h i";}}
        .vb-tile{position:relative;overflow:hidden;border-radius:6px;cursor:pointer;background:#140d0e;
          padding:0;border:0;display:block;box-shadow:0 2px 10px rgba(0,0,0,.35);
          transition:transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s ease;}
        .vb-tile:hover{transform:translateY(-5px);z-index:2;
          box-shadow:0 20px 40px -16px rgba(226,59,48,.45), 0 6px 16px rgba(0,0,0,.55);}
        .vb-tile img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;
          filter:grayscale(1) contrast(1.03);transition:filter .5s ease, transform .6s ease;}
        .vb-tile:hover img{filter:grayscale(0) contrast(1);transform:scale(1.06);}
        .vb-duo{position:absolute;inset:0;mix-blend-mode:color;opacity:.62;transition:opacity .5s ease;
          background:linear-gradient(155deg,#3b171b,#c5352e);}
        .vb-tile:hover .vb-duo{opacity:0;}
        .vb-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,5,6,.02),rgba(8,5,6,.78));}
        .vb-fno{position:absolute;top:10px;left:12px;z-index:3;font-family:${MONO};font-size:9px;
          letter-spacing:.12em;color:rgba(255,255,255,.88);text-transform:uppercase;text-shadow:0 1px 3px rgba(0,0,0,.6);}
        .vb-rib{position:absolute;top:0;left:0;z-index:3;background:${RED};color:#fff;font-family:${MONO};
          font-size:9px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:5px 11px;border-bottom-right-radius:7px;}
        .vb-tag{position:absolute;top:10px;right:12px;z-index:3;font-family:${MONO};font-size:8px;
          letter-spacing:.14em;text-transform:uppercase;color:#fff;background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.25);padding:2px 6px;border-radius:3px;}
        .vb-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.85);border-radius:50%;
          background:${RED};display:grid;place-items:center;z-index:3;opacity:0;
          transition:opacity .3s ease, transform .3s ease;box-shadow:0 8px 24px rgba(0,0,0,.5);}
        .vb-play svg{margin-left:1px;}
        .vb-tile:hover .vb-play{opacity:1;transform:translate(-50%,-50%) scale(1);}
        .vb-feat .vb-play{opacity:1;transform:translate(-50%,-50%) scale(1);}
        .vb-meta{position:absolute;left:13px;right:13px;bottom:13px;z-index:3;
          transform:translateY(9px);opacity:0;transition:transform .35s ease, opacity .35s ease;}
        .vb-tile:hover .vb-meta{transform:none;opacity:1;}
        .vb-feat .vb-meta{transform:none;opacity:1;}
      `}</style>
    </section>
  );
}

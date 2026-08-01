'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/brand/theme-toggle';

import { TweetCard } from './tweet-card';

import type { CoveragePoint, LensView, StoryAudio, StoryDetail, StoryImage, TweetEmbed } from '@/lib/worldwide/detail';

const INK = 'var(--rw-ink)';
const BODY = 'var(--rw-body)';
const MUTED = 'var(--rw-muted)';
const FAINT = 'var(--rw-faint)';
const ACCENT = 'var(--rw-accent)';
const RED = 'var(--rw-red)';
const RULE = 'var(--rw-rule)';

function asHeading(raw: string): string | null {
  const t = raw.trim();
  const md = t.match(/^#{1,6}\s+(.+?)$/);
  if (md) return md[1].replace(/\*+/g, '').trim();
  const bold = t.match(/^\*\*([^*]+)\*\*$/);
  if (bold) return bold[1].trim();
  if (t.length <= 70 && t.split(/\s+/).length <= 9 && /^[A-Z]/.test(t) && !/[.?!:]$/.test(t) && !/\*\*/.test(t)) return t;
  return null;
}
const isRule = (raw: string): boolean => /^\s*([-*_]\s*){3,}$/.test(raw);

function renderParagraph(raw: string): ReactNode[] {
  const text = raw.replace(/^\s*[#>]+\s*/, '');
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} style={{ fontWeight: 700, color: INK }}>{bold[1]}</strong>;
    return <span key={i}>{part.replace(/\*+/g, '')}</span>;
  });
}

// `md` marks a real markdown heading (`## …`). Only these are section boundaries for
// tweet anchoring — the box-side selector counts sections the same way, so the two
// stay aligned even though bold/short-line headings are also styled as headings.
type Block = { kind: 'heading'; text: string; md: boolean } | { kind: 'para'; text: string };
function toBlocks(paragraphs: string[]): Block[] {
  const out: Block[] = [];
  paragraphs.forEach((p) => {
    if (isRule(p)) return;
    const head = asHeading(p);
    out.push(head ? { kind: 'heading', text: head, md: /^#{1,6}\s+/.test(p.trim()) } : { kind: 'para', text: p });
  });
  return out;
}

const label: React.CSSProperties = {
  fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 700,
  letterSpacing: '0.16em', textTransform: 'uppercase',
};

function Figure({ img, ratio = '16/9' }: { img: StoryImage; ratio?: string }) {
  // Wire/member photos carry no caption (never surface another outlet's branding). Sourced
  // photos (Commons/Pexels/Openverse) DO carry the required attribution caption.
  return (
    <figure style={{ margin: '6px 0 26px' }}>
      <img src={img.url} alt="Coverage" loading="lazy" className="block w-full"
        style={{ aspectRatio: ratio, objectFit: 'cover', borderRadius: 2, background: '#f0f0f0' }}
        onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement).style.display = 'none'; }} />
    </figure>
  );
}

function PullQuote({ text }: { text: string }) {
  return (
    <blockquote style={{ margin: '12px 0 30px', paddingLeft: 22, borderLeft: `3px solid ${RED}` }}>
      <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: INK, fontSize: 'clamp(1.4rem, 1.8vw, 1.7rem)', lineHeight: 1.32, fontWeight: 500, fontStyle: 'italic', margin: 0, fontVariationSettings: "'opsz' 144, 'SOFT' 60" }}>
        {text}
      </p>
    </blockquote>
  );
}

function CoverageChart({ data, sources }: { data: CoveragePoint[]; sources: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ margin: '10px 0 30px', paddingTop: 18, borderTop: `2px solid ${INK}` }}>
      <div style={{ ...label, color: INK, marginBottom: 2 }}>Coverage volume</div>
      <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, color: MUTED, marginBottom: 14 }}>Articles gathered per day</div>
      <div style={{ position: 'relative', height: 92 }}>
        {[0, 0.5, 1].map((f) => (
          <div key={f} style={{ position: 'absolute', left: 0, right: 0, top: `${f * 100}%`, borderTop: `1px solid ${f === 1 ? '#c9c9c9' : '#efefef'}` }} />
        ))}
        <span style={{ position: 'absolute', right: 0, top: -3, fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: FAINT }}>{max}</span>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
          {data.map((d, i) => (
            <div key={i} title={`${d.label}: ${d.value}`} style={{ flex: 1, height: `${Math.max(3, (d.value / max) * 100)}%`, background: i === data.length - 1 ? RED : '#d8c3c3', borderRadius: '2px 2px 0 0' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, color: FAINT }}>{data[0].label}</span>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, color: FAINT }}>{data[data.length - 1].label}</span>
      </div>
      <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, color: MUTED, lineHeight: 1.45, marginTop: 10 }}>
        Drawn from <b style={{ color: INK }}>{sources}</b> independent sources across the story&rsquo;s lifetime.
      </p>
    </div>
  );
}

// One-time reading hint: the poster (headline + photo) pins on the left while the article scrolls on
// the right, which can confuse a first-time reader. Show a dismissible tip once per browser.
function ScrollHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem('dnl-read-hint')) setShow(true); } catch { /* no storage */ }
  }, []);
  if (!show) return null;
  const dismiss = () => {
    try { localStorage.setItem('dnl-read-hint', '1'); } catch { /* no storage */ }
    setShow(false);
  };
  return (
    <div role="dialog" aria-label="Reading tip"
      style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 14, maxWidth: '92vw', background: INK, color: 'var(--rw-bg)', padding: '12px 18px', borderRadius: 999, boxShadow: '0 10px 34px rgba(0,0,0,0.28)', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>
      <span>Reading tip: the headline stays on the left — <b>scroll down to read the full story.</b></span>
      <button onClick={dismiss} aria-label="Got it"
        style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, opacity: 0.8 }}>✕</button>
    </div>
  );
}

// Scoped CSS for the seek scrubber (pseudo-elements can't be inlined) + the one authored
// motion moment (the lens body cross-fade). Rendered once at the top of StoryRead.
const UI_STYLES = `
.dnl-scrub{-webkit-appearance:none;appearance:none;width:100%;height:6px;border-radius:999px;background:linear-gradient(to right,var(--rw-red) var(--pct,0%),var(--rw-rule) var(--pct,0%));cursor:pointer;outline:none}
.dnl-scrub::-webkit-slider-thumb{-webkit-appearance:none;width:15px;height:15px;border-radius:50%;background:var(--rw-red);border:2px solid var(--rw-bg);box-shadow:0 1px 4px rgba(0,0,0,.28);cursor:pointer}
.dnl-scrub::-moz-range-thumb{width:15px;height:15px;border-radius:50%;background:var(--rw-red);border:2px solid var(--rw-bg);cursor:pointer}
.dnl-scrub:focus-visible::-webkit-slider-thumb{outline:2px solid var(--rw-ink);outline-offset:2px}
.dnl-scrub:focus-visible::-moz-range-thumb{outline:2px solid var(--rw-ink);outline-offset:2px}
.dnl-segs::-webkit-scrollbar{display:none}
@keyframes dnlSwap{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
.dnl-swap{animation:dnlSwap .42s cubic-bezier(.16,1,.3,1)}
@media (prefers-reduced-motion:reduce){.dnl-swap{animation:none}}
`;

function PlayIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.28-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z" /></svg>;
}
function PauseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.3" /><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.3" /></svg>;
}

const fmtTime = (s: number): string => {
  const v = !isFinite(s) || s < 0 ? 0 : s;
  const m = Math.floor(v / 60);
  const sec = Math.floor(v % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

/** Custom two-host audio player — drawn icons, seek scrubber, real play/pause/seek states. */
function AudioPlayer({ audio }: { audio: StoryAudio }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(audio.durationS ?? 0);
  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) void a.play(); else a.pause();
  };
  const onSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = ref.current;
    const t = Number(e.target.value);
    if (a) a.currentTime = t;
    setCur(t);
  };
  const pct = dur > 0 ? (cur / dur) * 100 : 0;
  return (
    <div style={{ marginTop: 20, padding: '13px 15px', borderRadius: 10, border: `1px solid ${RULE}`, background: 'color-mix(in srgb, var(--rw-ink) 4%, transparent)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <audio ref={ref} preload="metadata" src={audio.url}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCur(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)} />
      <button type="button" onClick={toggle} aria-label={playing ? 'Pause explainer' : 'Play the two-host explainer'}
        style={{ flexShrink: 0, width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', background: RED, color: '#fff', display: 'grid', placeItems: 'center', paddingLeft: playing ? 0 : 3, boxShadow: '0 2px 10px color-mix(in srgb, var(--rw-red) 38%, transparent)' }}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ ...label, fontSize: 9.5, color: INK, letterSpacing: '0.13em' }}>Listen · two-host explainer</span>
          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, color: MUTED, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{fmtTime(cur)} / {fmtTime(dur)}</span>
        </div>
        <input type="range" className="dnl-scrub" aria-label="Seek audio" min={0} max={dur || 0} step="any"
          value={Math.min(cur, dur || 0)} onChange={onSeek}
          style={{ ['--pct']: `${pct}%` } as React.CSSProperties} />
      </div>
    </div>
  );
}

/** All-Sides perspective switcher — segmented control; neutral fills ink, an active lens fills red. */
function PerspectiveBar({ lenses, active, onChange }: { lenses: LensView[]; active: string | null; onChange: (k: string | null) => void }) {
  const seg = (k: string | null, lbl: string) => {
    const on = active === k;
    return (
      <button key={k ?? 'neutral'} type="button" onClick={() => onChange(k)} aria-pressed={on}
        style={{ flexShrink: 0, whiteSpace: 'nowrap', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.005em', padding: '8px 15px', borderRadius: 999, border: 'none', cursor: 'pointer', color: on ? '#fff' : MUTED, background: on ? (k === null ? INK : RED) : 'transparent', transition: 'color .15s, background .15s' }}>
        {lbl}
      </button>
    );
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span style={{ ...label, fontSize: 9.5, color: FAINT, flexShrink: 0 }}>Perspectives</span>
      <div className="dnl-segs" style={{ display: 'flex', gap: 3, overflowX: 'auto', padding: 4, border: `1px solid ${RULE}`, borderRadius: 999, minWidth: 0 }}>
        {seg(null, 'The full report')}
        {lenses.map((l) => seg(l.key, l.label))}
      </div>
    </div>
  );
}

/** Honesty banner shown while a lens is active — clearly marks it as a vantage, not the report. */
function PerspectiveBanner({ lens, onReset }: { lens: LensView; onReset: () => void }) {
  return (
    <div style={{ marginBottom: 26, padding: '13px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--rw-red) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--rw-red) 22%, transparent)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <span style={{ ...label, fontSize: 9.5, color: RED, letterSpacing: '0.12em', flexShrink: 0 }}>Perspective</span>
      <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13, color: BODY, lineHeight: 1.4, flex: 1, minWidth: 170 }}>
        You&rsquo;re reading how <b style={{ color: INK }}>{lens.label}</b> sees this — same facts, one vantage.
      </span>
      <button type="button" onClick={onReset}
        style={{ flexShrink: 0, fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, fontWeight: 700, color: INK, background: 'var(--rw-bg)', border: `1px solid ${RULE}`, borderRadius: 999, padding: '6px 13px', cursor: 'pointer' }}>
        &larr; Back to the full report
      </button>
    </div>
  );
}

/** The article body for an active lens — matches the neutral column's type scale. */
function LensBody({ lens, onReset }: { lens: LensView; onReset: () => void }) {
  return (
    <>
      <PerspectiveBanner lens={lens} onReset={onReset} />
      {toBlocks(lens.paragraphs).map((b, i) =>
        b.kind === 'heading' ? (
          <div key={i} style={{ ...label, fontSize: 15, fontWeight: 800, color: RED, marginTop: i === 0 ? 0 : 34, marginBottom: 12, paddingTop: i === 0 ? 0 : 16, borderTop: i === 0 ? 'none' : `1px solid ${RULE}`, fontFamily: 'var(--font-jakarta), sans-serif', letterSpacing: '0.06em' }}>
            {b.text}
          </div>
        ) : (
          <p key={i} style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: BODY, fontSize: 'clamp(1.05rem, 1.1vw, 1.15rem)', lineHeight: 1.76, marginBottom: 18, fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}>
            {renderParagraph(b.text)}
          </p>
        ),
      )}
      {lens.framingNote && (
        <p style={{ marginTop: 22, paddingTop: 14, borderTop: `1px solid ${RULE}`, fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
          <b style={{ color: INK }}>How this lens is grounded:</b> {lens.framingNote}
        </p>
      )}
    </>
  );
}

export function StoryRead({ story }: { story: StoryDetail }) {
  const lenses = story.lenses ?? [];
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const current = activeLens ? lenses.find((l) => l.key === activeLens) ?? null : null;
  const blocks = toBlocks(story.paragraphs);

  // Related tweets are anchored to a `##` heading ordinal; render each after its section's
  // content (i.e. just before the next markdown heading, or at the article's end).
  const tweetsBySection = new Map<number, TweetEmbed[]>();
  story.tweets.forEach((t) => {
    tweetsBySection.set(t.sectionIndex, [...(tweetsBySection.get(t.sectionIndex) ?? []), t]);
  });

  // Right column = the article, with media woven in prominently and EARLY (visible without deep scroll).
  const nodes: ReactNode[] = [];
  let paraSeen = 0;
  let firstPara = true;
  let mdHeadings = 0; // sections closed so far (0 = the opening/lede)
  const flushTweets = (section: number): void => {
    const ts = tweetsBySection.get(section);
    if (!ts) return;
    ts.forEach((t, j) => nodes.push(<TweetCard key={`tw-${section}-${t.tweetId || j}`} tweet={t} />));
    tweetsBySection.delete(section);
  };
  blocks.forEach((b, i) => {
    if (b.kind === 'heading') {
      if (b.md) {
        flushTweets(mdHeadings); // close the section that just ended
        mdHeadings += 1;
      }
      nodes.push(
        <div key={`h${i}`} style={{ ...label, fontSize: 15, fontWeight: 800, color: RED, marginTop: firstPara ? 0 : 34, marginBottom: 12, paddingTop: firstPara ? 0 : 16, borderTop: firstPara ? 'none' : `1px solid ${RULE}`, fontFamily: 'var(--font-jakarta), sans-serif', letterSpacing: '0.06em' }}>
          {b.text}
        </div>,
      );
      return;
    }
    const dropCap = firstPara;
    firstPara = false;
    nodes.push(
      <p key={`p${i}`}
        className={dropCap ? 'first-letter:float-left first-letter:font-bold first-letter:pr-2 first-letter:text-[3.6rem] first-letter:leading-[0.8] first-letter:mt-1' : undefined}
        style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: BODY, fontSize: 'clamp(1.05rem, 1.1vw, 1.15rem)', lineHeight: 1.76, marginBottom: 18, fontVariationSettings: "'opsz' 14, 'SOFT' 30" }}>
        {renderParagraph(b.text)}
      </p>,
    );
    paraSeen += 1;
    if (paraSeen === 1 && story.images[0]) nodes.push(<Figure key="fig0" img={story.images[0]} />);
    if (paraSeen === 3 && story.pullQuote) nodes.push(<PullQuote key="pq" text={story.pullQuote} />);
    if (paraSeen === 5 && story.stats) nodes.push(<CoverageChart key="chart" data={story.coverage} sources={story.stats.sources} />);
    if (paraSeen === 7 && story.images[1]) nodes.push(<Figure key="fig1" img={story.images[1]} />);
  });
  // Flush the final section's tweets, then any anchored beyond the sections we saw.
  flushTweets(mdHeadings);
  [...tweetsBySection.keys()].sort((a, b) => a - b).forEach(flushTweets);

  // Anything not yet placed (short article) drops to the end so nothing is lost.
  if (paraSeen < 5 && story.stats) nodes.push(<CoverageChart key="chart-end" data={story.coverage} sources={story.stats.sources} />);
  if (paraSeen < 3 && story.pullQuote) nodes.push(<PullQuote key="pq-end" text={story.pullQuote} />);

  return (
    <div className="min-h-dvh" style={{ background: 'var(--rw-bg)', color: BODY }}>
      <style>{UI_STYLES}</style>
      <ScrollHint />
      {/* ── Masthead ── */}
      <header style={{ borderBottom: `1px solid ${INK}` }}>
        <div className="flex items-center gap-8 px-8" style={{ maxWidth: 1620, height: 58 }}>
          <Wordmark size="md" href="/long-read" rigColor="var(--rw-ink)" />
          <div style={{ flex: 1 }} />
          <ThemeToggle />
          <Link href="/long-read" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 14 }}>&larr;</span> Back to DNL
          </Link>
        </div>
      </header>

      {/* ── All-Sides perspective switcher — flips the whole story to a chosen vantage ── */}
      {lenses.length > 0 && (
        <div style={{ borderBottom: `1px solid ${RULE}`, background: 'var(--rw-bg)' }}>
          <div className="px-8" style={{ maxWidth: 1620, margin: '0 auto', padding: '11px 32px' }}>
            <PerspectiveBar lenses={lenses} active={activeLens} onChange={setActiveLens} />
          </div>
        </div>
      )}

      {/* ── TWO halves: poster (sticky) | article — one divider between ── */}
      <div className="w-full px-8 grid grid-cols-1 lg:grid-cols-2 items-start" style={{ maxWidth: 1620, paddingTop: 36, columnGap: 0 }}>

        {/* LEFT HALF — poster: kicker · headline · deck · hero · byline (fits on landing, pinned) */}
        <div className="lg:pr-14 lg:sticky lg:top-8 self-start">
          <div style={{ ...label, color: current ? RED : ACCENT, marginBottom: 16 }}>{current ? `${current.label} · Perspective` : story.kicker}</div>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: INK, fontSize: 'clamp(2.15rem, 2.7vw, 3.05rem)', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.02em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'pretty', margin: 0 }}>
            {current ? current.headline : story.title}
          </h1>
          {!current && story.deck && (
            <p className="italic" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--rw-body)', fontSize: 'clamp(1.1rem, 1.3vw, 1.35rem)', lineHeight: 1.46, marginTop: 18, fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
              {story.deck}
            </p>
          )}
          {story.image && (
            <figure style={{ margin: '22px 0 0' }}>
              <img src={story.image} alt={story.title} className="block w-full" style={{ aspectRatio: '16/9', objectFit: 'cover', borderRadius: 2 }}
                onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement).style.display = 'none'; }} />
            </figure>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginTop: 16, paddingTop: 15, borderTop: `1px solid ${RULE}` }}>
            <div style={{ display: 'flex', gap: 28 }}>
              {[['Author', 'Rig Wire'], ['Date', story.date], ['Read', story.readTime.replace(' read', '')]].map(([k, v]) => (
                <div key={k}>
                  <div style={{ ...label, fontSize: 9, color: FAINT, marginBottom: 4 }}>{k}</div>
                  <div style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, fontWeight: 700, color: INK }}>{v}</div>
                </div>
              ))}
              {/* Coverage honesty: a story grounded in a single outlet is not multi-source corroborated.
                  Label it plainly so it never carries the authority of a widely-reported story. */}
              {story.stats && story.stats.sources <= 1 && (
                <div>
                  <div style={{ ...label, fontSize: 9, color: FAINT, marginBottom: 4 }}>Coverage</div>
                  <div title="Reported by a single outlet — not yet independently corroborated"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: MUTED, border: `1px solid ${RULE}`, borderRadius: 3, padding: '3px 7px' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: MUTED, display: 'inline-block' }} />
                    Single source
                  </div>
                </div>
              )}
            </div>
          </div>
          {story.audio && <AudioPlayer audio={story.audio} />}
        </div>

        {/* RIGHT HALF — the article; body swaps to the chosen perspective with one authored fade */}
        <article className="lg:pl-14 lg:border-l order-last lg:order-none" style={{ borderColor: RULE, minWidth: 0, marginTop: 6 }}>
          <div key={activeLens ?? 'neutral'} className="dnl-swap">
            {current ? <LensBody lens={current} onReset={() => setActiveLens(null)} /> : nodes}
          </div>
          <div style={{ marginTop: 26 }}>
            <Link href="/long-read" style={{ ...label, fontSize: 10.5, color: ACCENT }}>← Back to DNL</Link>
          </div>
        </article>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

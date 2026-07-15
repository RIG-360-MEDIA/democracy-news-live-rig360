'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/brand/theme-toggle';

import { TweetCard } from './tweet-card';

import type { CoveragePoint, StoryDetail, StoryImage, TweetEmbed } from '@/lib/worldwide/detail';

const INK = 'var(--rw-ink)';
const BODY = 'var(--rw-body)';
const MUTED = 'var(--rw-muted)';
const FAINT = 'var(--rw-faint)';
const ACCENT = 'var(--rw-accent)';
const RED = 'var(--rw-red)';
const RULE = 'var(--rw-rule)';

const NAV = ['World', 'Politics', 'Environment', 'Business', 'Global'];

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
  // Never surface the originating outlet's name (e.g. "ABP NEWS") on a photo — it reads as another
  // channel's branding inside our product. No publisher caption, and a neutral alt text.
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

export function StoryRead({ story }: { story: StoryDetail }) {
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
        <div key={`h${i}`} style={{ ...label, fontSize: 11, color: RED, marginTop: firstPara ? 0 : 32, marginBottom: 12, paddingTop: firstPara ? 0 : 15, borderTop: firstPara ? 'none' : `1px solid ${RULE}`, fontFamily: 'var(--font-jakarta), sans-serif', letterSpacing: '0.13em' }}>
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
      {/* ── Masthead ── */}
      <header style={{ borderBottom: `1px solid ${INK}` }}>
        <div className="flex items-center gap-8 px-8" style={{ maxWidth: 1620, height: 58 }}>
          <Wordmark size="md" href="/long-read" rigColor="var(--rw-ink)" />
          <nav className="hidden md:flex items-center gap-6" style={{ flex: 1 }}>
            {NAV.map((n) => (
              <Link key={n} href="/long-read" style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--rw-body)', textDecoration: 'none' }}>{n}</Link>
            ))}
          </nav>
          <ThemeToggle />
          <Link href="/long-read" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: 14 }}>&larr;</span> Back to Worldwide
          </Link>
        </div>
      </header>

      {/* ── TWO halves: poster (sticky) | article — one divider between ── */}
      <div className="w-full px-8 grid grid-cols-1 lg:grid-cols-2 items-start" style={{ maxWidth: 1620, paddingTop: 36, columnGap: 0 }}>

        {/* LEFT HALF — poster: kicker · headline · deck · hero · byline (fits on landing, pinned) */}
        <div className="lg:pr-14 lg:sticky lg:top-8 self-start">
          <div style={{ ...label, color: ACCENT, marginBottom: 16 }}>{story.kicker}</div>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: INK, fontSize: 'clamp(2.15rem, 2.7vw, 3.05rem)', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-0.02em', fontVariationSettings: "'opsz' 144, 'SOFT' 0", textWrap: 'pretty', margin: 0 }}>
            {story.title}
          </h1>
          {story.deck && (
            <p className="italic" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: 'var(--rw-body)', fontSize: 'clamp(1.1rem, 1.3vw, 1.35rem)', lineHeight: 1.46, marginTop: 18, fontVariationSettings: "'opsz' 144, 'SOFT' 90" }}>
              {story.deck}
            </p>
          )}
          {story.image && (
            <figure style={{ margin: '22px 0 0' }}>
              <img src={story.image} alt={story.title} className="block w-full" style={{ aspectRatio: '16/9', objectFit: 'cover', borderRadius: 2 }}
                onError={(e) => { (e.currentTarget.closest('figure') as HTMLElement).style.display = 'none'; }} />
              {story.heroImage && (
                <figcaption style={{ marginTop: 6, fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, color: FAINT, letterSpacing: '0.02em' }}>
                  {story.heroImage.author ? `Photo: ${story.heroImage.author}` : 'Photo'}
                  {story.heroImage.license && (
                    <> · {story.heroImage.licenseUrl
                      ? <a href={story.heroImage.licenseUrl} target="_blank" rel="noopener noreferrer" style={{ color: FAINT, textDecoration: 'underline' }}>{story.heroImage.license}</a>
                      : story.heroImage.license}</>
                  )}
                  {' · '}
                  {story.heroImage.sourcePage
                    ? <a href={story.heroImage.sourcePage} target="_blank" rel="noopener noreferrer" style={{ color: FAINT, textDecoration: 'underline' }}>via {story.heroImage.source}</a>
                    : <>via {story.heroImage.source}</>}
                </figcaption>
              )}
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
            <div style={{ display: 'flex', gap: 14 }}>
              {['Share', 'Save'].map((t) => (
                <button key={t} style={{ ...label, fontSize: 10, color: MUTED, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT HALF — the article with woven media */}
        <article className="lg:pl-14 lg:border-l order-last lg:order-none" style={{ borderColor: RULE, minWidth: 0, marginTop: 6 }}>
          {nodes}
          <div style={{ marginTop: 26 }}>
            <Link href="/long-read" style={{ ...label, fontSize: 10.5, color: ACCENT }}>← Back to Worldwide</Link>
          </div>
        </article>
      </div>

      <div style={{ height: 80 }} />
    </div>
  );
}

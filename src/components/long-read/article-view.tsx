'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import type { Article, ArticleBlock } from './article-data';

/* ═════════════════════════════════════════════════════════════════
   ATLANTIC-STYLE ARTICLE VIEW
   Single-column long-form essay. White canvas, generous leading,
   sober editorial typography, drop cap, pull quotes, inline links,
   "Read also" intersitials, recirculation strip at the foot.
═════════════════════════════════════════════════════════════════ */

const INK    = 'var(--rw-ink)';
const BODY   = 'var(--rw-body)';
const MUTED  = 'var(--rw-muted)';
const RULE   = 'var(--rw-rule)';
const ACCENT = 'var(--rw-red)';     /* Atlantic-ish brand red */

export function ArticleView({ article }: { article: Article }) {
  /* Reading-progress bar at the very top */
  const [scrollPct, setScrollPct] = useState(0);
  useEffect(() => {
    function onScroll() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct(max > 0 ? (window.scrollY / max) * 100 : 0);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* First paragraph gets the drop cap */
  let firstParaSeen = false;

  return (
    <div className="min-h-dvh" style={{
      background: '#ffffff', color: BODY,
      fontFamily: 'var(--font-fraunces), Georgia, serif',
    }}>
      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 3 }}>
        <div style={{ width: `${scrollPct}%`, height: '100%', background: ACCENT, transition: 'width 80ms linear' }} />
      </div>

      {/* ─── TOP MINIMAL NAV ─── */}
      <header className="border-b" style={{ borderColor: RULE }}>
        <div className="grid items-center px-5 md:px-10 py-3" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
          <Link href="/long-read" className="justify-self-start inline-flex items-center gap-2 hover:opacity-70 transition-opacity" style={{
            fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 700,
            letterSpacing: '0.14em', color: INK, textTransform: 'uppercase',
          }}>
            ← Worldwide
          </Link>
          <Link href="/today" className="justify-self-center"><Wordmark size="md" href={null} /></Link>
          <div className="justify-self-end flex items-center gap-3">
            <Link href="#" className="inline-flex items-center gap-1.5 hover:opacity-70 transition-opacity" style={{
              fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 700,
              letterSpacing: '0.10em', color: INK, textTransform: 'uppercase',
            }}>Share</Link>
            <Link href="#" style={{
              padding: '6px 14px', background: ACCENT, color: '#fff', borderRadius: 999,
              fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em',
            }}>Subscribe</Link>
          </div>
        </div>
      </header>

      {/* ─── ARTICLE ─── */}
      <article className="px-5 md:px-8">
        {/* Kicker */}
        <div className="mx-auto pt-10 md:pt-14 pb-4" style={{ maxWidth: 760 }}>
          <Link href="/long-read" style={{
            fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 11.5,
            fontWeight: 800, letterSpacing: '0.28em', textTransform: 'uppercase',
          }}>{article.kicker}</Link>
        </div>

        {/* Massive headline */}
        <h1 className="mx-auto" style={{
          maxWidth: 880, color: INK,
          fontSize: 'clamp(2.5rem, 5.8vw, 5rem)', fontWeight: 600, lineHeight: 1.02,
          letterSpacing: '-0.028em', fontVariationSettings: "'opsz' 144, 'SOFT' 0",
          textWrap: 'balance', marginBottom: 22,
        }}>
          {article.title}
        </h1>

        {/* Italic deck */}
        <p className="mx-auto italic" style={{
          maxWidth: 760, color: '#2a2a2a',
          fontSize: 'clamp(1.25rem, 1.8vw, 1.625rem)', fontWeight: 400, lineHeight: 1.4,
          letterSpacing: '-0.008em', fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          textWrap: 'balance', marginBottom: 36,
        }}>
          {article.subtitle}
        </p>

        {/* Byline block */}
        <div className="mx-auto mb-12 flex items-center gap-4 pb-6" style={{
          maxWidth: 760, borderBottom: `1px solid ${RULE}`,
        }}>
          <div className="rounded-full overflow-hidden flex-shrink-0" style={{ width: 56, height: 56, background: RULE }}>
            <img src={`https://i.pravatar.cc/120?u=${encodeURIComponent(article.author)}`} alt=""
              className="w-full h-full object-cover"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          </div>
          <div className="flex-1 min-w-0">
            <p style={{
              fontFamily: 'var(--font-jakarta), sans-serif', color: INK, fontSize: 13.5, fontWeight: 700,
              letterSpacing: '0.02em', marginBottom: 3,
            }}>
              By <Link href="#" style={{ color: ACCENT, borderBottom: `1px solid ${ACCENT}30` }}>{article.author}</Link>
            </p>
            <p style={{
              fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: 12, fontWeight: 500,
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {article.role} · {article.date} · {article.readTime}
            </p>
          </div>
        </div>

        {/* Hero image — wider than text column */}
        <figure className="mx-auto mb-12" style={{ maxWidth: 1200 }}>
          <img src={article.hero.src} alt="" className="w-full block"
            style={{ aspectRatio: '16/9', objectFit: 'cover' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <figcaption className="mt-3 mx-auto flex flex-col md:flex-row md:items-baseline md:justify-between gap-1" style={{
            maxWidth: 1200, fontFamily: 'var(--font-jakarta), sans-serif',
            fontSize: 12, lineHeight: 1.5, color: MUTED,
          }}>
            <span style={{ maxWidth: 920 }}>{article.hero.caption}</span>
            {article.hero.credit && (
              <span style={{ flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10.5, fontWeight: 700 }}>
                {article.hero.credit}
              </span>
            )}
          </figcaption>
        </figure>

        {/* Body */}
        <div className="mx-auto" style={{ maxWidth: 680 }}>
          {article.body.map((block, i) => {
            const isFirstPara = block.type === 'paragraph' && !firstParaSeen;
            if (isFirstPara) firstParaSeen = true;
            return <Block key={i} block={block} isFirstPara={isFirstPara} />;
          })}
        </div>

        {/* Article tail — share strip */}
        <div className="mx-auto mt-16 pt-8 pb-8 flex items-center justify-between gap-4 flex-wrap" style={{
          maxWidth: 680, borderTop: `1px solid ${RULE}`, borderBottom: `1px solid ${RULE}`,
        }}>
          <p style={{
            fontFamily: 'var(--font-jakarta), sans-serif', color: MUTED, fontSize: 11.5,
            fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
          }}>
            Share this story
          </p>
          <div className="flex items-center gap-2">
            {['Twitter', 'Facebook', 'LinkedIn', 'Copy link'].map((s) => (
              <button key={s} style={{
                padding: '7px 13px', border: `1px solid ${RULE}`, borderRadius: 999,
                fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 700,
                color: INK, letterSpacing: '0.04em', background: 'transparent', cursor: 'pointer',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {/* Author bio at the end */}
        <div className="mx-auto mt-10 flex items-start gap-5 p-7" style={{
          maxWidth: 680, background: '#fafaf7', border: `1px solid ${RULE}`,
        }}>
          <img src={`https://i.pravatar.cc/120?u=${encodeURIComponent(article.author)}`} alt=""
            className="flex-shrink-0 rounded-full" style={{ width: 72, height: 72, objectFit: 'cover' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <p style={{
              fontFamily: 'var(--font-jakarta), sans-serif', color: ACCENT, fontSize: 10.5, fontWeight: 800,
              letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 5,
            }}>About the author</p>
            <p className="font-display" style={{
              color: INK, fontSize: 19, fontWeight: 700, letterSpacing: '-0.014em', marginBottom: 6,
            }}>{article.author}</p>
            <p className="italic" style={{
              color: '#3a3a3a', fontSize: 14.5, lineHeight: 1.55,
              fontVariationSettings: "'opsz' 14, 'SOFT' 100",
            }}>
              {article.role} for Rig Wire. Covers media, democracy, and the institutions in between.
              Her work has appeared in The Atlantic, Harper&rsquo;s, and the Columbia Journalism Review.
            </p>
          </div>
        </div>

        {/* Back to section */}
        <div className="mx-auto mt-12 pt-8 pb-16 text-center" style={{ maxWidth: 680, borderTop: `1px solid ${RULE}` }}>
          <Link href="/long-read" className="inline-flex items-center gap-2 hover:opacity-70 transition-opacity" style={{
            fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, fontWeight: 800,
            letterSpacing: '0.22em', color: ACCENT, textTransform: 'uppercase',
          }}>
            ← More from Worldwide
          </Link>
        </div>
      </article>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   BLOCK RENDERER
═════════════════════════════════════════════════════════════════ */
function Block({ block, isFirstPara }: { block: ArticleBlock; isFirstPara: boolean }) {
  switch (block.type) {
    case 'paragraph': return <Paragraph text={block.text} dropcap={isFirstPara} />;
    case 'subhead':   return <Subhead text={block.text} />;
    case 'pullquote': return <PullQuote text={block.text} attribution={block.attribution} />;
    case 'image':     return <InlineImage src={block.src} caption={block.caption} credit={block.credit} />;
    case 'list':      return <BulletList items={block.items} />;
    case 'divider':   return <Divider />;
  }
}

function Paragraph({ text, dropcap }: { text: string; dropcap?: boolean }) {
  return (
    <p style={{
      color: BODY, fontSize: 'clamp(1.0625rem, 1.18vw, 1.1875rem)',
      fontWeight: 400, lineHeight: 1.74, letterSpacing: '-0.001em',
      fontVariationSettings: "'opsz' 14, 'SOFT' 50",
      marginBottom: 26,
    }}>
      {dropcap ? (
        <>
          <span style={{
            float: 'left', fontSize: '5em', lineHeight: 0.85, fontWeight: 700,
            color: INK, marginRight: 12, marginTop: 8,
            fontVariationSettings: "'opsz' 144, 'SOFT' 0",
          }}>{text.charAt(0)}</span>
          {text.slice(1)}
        </>
      ) : text}
    </p>
  );
}

function Subhead({ text }: { text: string }) {
  return (
    <h2 style={{
      color: INK, fontSize: 'clamp(1.5rem, 2vw, 1.875rem)', fontWeight: 700, lineHeight: 1.16,
      letterSpacing: '-0.018em', fontVariationSettings: "'opsz' 144, 'SOFT' 0",
      marginTop: 48, marginBottom: 18, textWrap: 'balance',
    }}>{text}</h2>
  );
}

function PullQuote({ text, attribution }: { text: string; attribution?: string }) {
  return (
    <blockquote style={{
      margin: '40px -28px 40px',
      padding: '28px 28px 24px',
      borderTop: `2px solid ${ACCENT}`, borderBottom: `2px solid ${ACCENT}`,
      textAlign: 'center',
    }}>
      <p className="italic" style={{
        color: INK, fontSize: 'clamp(1.5rem, 2.2vw, 2rem)', fontWeight: 400, lineHeight: 1.32,
        letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 144, 'SOFT' 100",
        marginBottom: attribution ? 14 : 0, textWrap: 'balance',
      }}>&ldquo;{text}&rdquo;</p>
      {attribution && (
        <cite className="not-italic block" style={{
          fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 11.5, fontWeight: 800,
          letterSpacing: '0.16em', color: MUTED, textTransform: 'uppercase',
        }}>— {attribution}</cite>
      )}
    </blockquote>
  );
}

function InlineImage({ src, caption, credit }: { src: string; caption: string; credit?: string }) {
  return (
    <figure className="my-12" style={{
      marginLeft: 'calc(50% - 50vw + 24px)', marginRight: 'calc(50% - 50vw + 24px)',
    }}>
      <div className="mx-auto" style={{ maxWidth: 1000 }}>
        <img src={src} alt="" className="w-full block"
          style={{ aspectRatio: '16/9', objectFit: 'cover' }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        <figcaption className="mt-3 flex flex-col md:flex-row md:items-baseline md:justify-between gap-1" style={{
          fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, lineHeight: 1.5, color: MUTED,
        }}>
          <span style={{ maxWidth: 800 }}>{caption}</span>
          {credit && (
            <span style={{ flexShrink: 0, letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 10.5, fontWeight: 700 }}>
              {credit}
            </span>
          )}
        </figcaption>
      </div>
    </figure>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul style={{
      color: BODY, fontSize: 'clamp(1.0625rem, 1.18vw, 1.1875rem)', lineHeight: 1.7,
      marginBottom: 26, paddingLeft: 28,
    }}>
      {items.map((it, i) => (
        <li key={i} style={{ marginBottom: 10, listStyleType: 'disc' }}>{it}</li>
      ))}
    </ul>
  );
}

function Divider() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3 my-14" style={{ color: MUTED }}>
      {[0,1,2].map((i) => <span key={i} style={{ width: 5, height: 5, background: MUTED, borderRadius: 999 }} />)}
    </div>
  );
}

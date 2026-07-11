import Link from 'next/link';

import type { CardView } from '@/lib/worldwide/to-view';

/* ═════════════════════════════════════════════════════════════════
   AROUND THE WORLD — one lead story per qualifying country (World scope).
   The brand-promise band: the world side by side, not Anglo-Atlantic first.
   Region is by SUBJECT. Live: flat country grid (continent grouping = later).
═════════════════════════════════════════════════════════════════ */

const INK = 'var(--rw-ink)';
const SOFT = 'var(--rw-faint)';
const RULE = 'var(--rw-rule)';
const RULE2 = 'var(--rw-rule-strong)';
const ACCENT = 'var(--rw-accent)';

export function AroundTheWorld({ stories }: { stories: CardView[] }) {
  if (stories.length === 0) return null;
  return (
    <section className="px-5 md:px-10 lg:px-16 pt-14 pb-16" style={{ borderTop: `3px solid ${RULE2}` }} aria-label="Around the World">
      <div className="mx-auto" style={{ maxWidth: 1600 }}>
        <div className="mb-8" style={{ borderBottom: `2px solid ${INK}`, paddingBottom: 12 }}>
          <h2 className="font-display" style={{ color: INK, fontSize: 'clamp(1.875rem, 2.6vw, 2.5rem)', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.022em', fontVariationSettings: "'opsz' 144, 'SOFT' 0" }}>
            Around the World
          </h2>
          <p className="font-display italic" style={{ color: ACCENT, fontSize: 'clamp(0.95rem, 1.2vw, 1.125rem)', fontWeight: 400, marginTop: 8, fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
            One headline from every corner — the world today, side by side.
          </p>
        </div>
        <div className="grid gap-x-9 gap-y-7 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <CountryCard key={s.slug} story={s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CountryCard({ story }: { story: CardView }) {
  return (
    <article>
      <div className="flex items-baseline justify-between" style={{ marginBottom: 6 }}>
        <span style={{ fontFamily: 'var(--font-mono), monospace', color: ACCENT, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{story.kicker}</span>
        <span style={{ fontFamily: 'var(--font-mono), monospace', color: SOFT, fontSize: 9.5, letterSpacing: '0.08em' }}>{story.timestamp}</span>
      </div>
      <h4 style={{ color: INK, fontSize: 'clamp(1.0625rem, 1.4vw, 1.25rem)', fontWeight: 700, lineHeight: 1.18, letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 24, 'SOFT' 10", textWrap: 'balance' }}>
        {story.href ? <Link href={story.href} className="hover:opacity-75 transition-opacity">{story.title}</Link> : <span>{story.title}</span>}
      </h4>
    </article>
  );
}

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MODES_BY_KEY } from '@/lib/modes';
import {
  sectionContainer,
  textFromLeft,
  textItem,
  cardFromRight,
} from '@/lib/animations';

const MODE = MODES_BY_KEY['all-sides'];

const STORY = {
  headline: 'US extends H-1B visa review period to 90 days.',
  date:     'TUE 22 MAY · 06:30 GMT',
};

interface Perspective {
  lean:    string;
  accent:  string;
  bg:      string;
  border:  string;
  framing: string;
  sources: string[];
  isOmitted?: boolean;
}

const PERSPECTIVES: Perspective[] = [
  {
    lean:    'LEFT',
    accent:  '#2d5c8a',
    bg:      '#dce6f3',
    border:  '#a8c3e0',
    framing: 'Administration targets tech workers with sweeping new restrictions — chilling effect on global talent.',
    sources: ['Guardian', 'NPR', 'HuffPost'],
  },
  {
    lean:    'RIGHT',
    accent:  '#a03a20',
    bg:      '#fce0d2',
    border:  '#e0b4a0',
    framing: 'Closes the H-1B loophole exploited by IT staffing firms to displace American workers for decades.',
    sources: ['Fox News', 'WSJ', 'NY Post'],
  },
  {
    lean:    'GLOBAL SOUTH',
    accent:  '#6a4c19',
    bg:      '#f5e4c2',
    border:  '#d4b888',
    framing: '$22B in annual remittances now in question — Indian, Filipino, Pakistani workers facing extended uncertainty.',
    sources: ['The Hindu', 'Dawn', 'Inquirer'],
  },
  {
    lean:    'OMITTED BY ALL',
    accent:  '#3a3633',
    bg:      '#ebe7e0',
    border:  '#9a9590',
    framing: 'Most H-1B holders work for major US corporations, not staffing firms. The "loophole" framing applies to ~12% of total holders.',
    sources: ['USCIS data · Internal'],
    isOmitted: true,
  },
];

const LENS_TOGGLES = ['ALL 4', 'LEFT', 'RIGHT', 'GLOBAL', 'OMITTED'];

const PERSPECTIVE_CHIPS = [
  { label: 'Left',         color: '#2d5c8a', bg: '#dce6f3' },
  { label: 'Right',        color: '#a03a20', bg: '#fce0d2' },
  { label: 'Global South', color: '#6a4c19', bg: '#f5e4c2' },
  { label: 'Omitted',      color: '#3a3633', bg: '#ebe7e0' },
];

function Mockup() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-white"
      style={{
        boxShadow:
          '0 2px 4px rgba(26,24,21,0.06), 0 14px 28px rgba(26,24,21,0.10), 0 32px 64px rgba(26,24,21,0.08)',
      }}
    >
      {/* Header — live + 3-dot multi-perspective indicator */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: MODE.cardBg, borderBottom: `1px solid ${MODE.rule}33` }}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1">
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#2d5c8a' }} />
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#a03a20' }} />
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#6a4c19' }} />
            <span className="block w-1.5 h-1.5 rounded-full" style={{ background: '#3a3633' }} />
          </span>
          <p className="kicker" style={{ color: MODE.accent }}>All Sides</p>
          <span
            className="font-sans hidden sm:inline"
            style={{ color: MODE.accent, opacity: 0.5, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em' }}
          >
            · {STORY.date}
          </span>
        </div>
        <span className="font-mono text-[11px]" style={{ color: MODE.accent, opacity: 0.7 }}>
          8 min
        </span>
      </div>

      {/* Shared headline — "The Story" */}
      <div className="px-6 pt-5 pb-4">
        <p className="kicker mb-2" style={{ color: MODE.accent, opacity: 0.55 }}>The Story</p>
        <h3
          className="font-display text-[#1a1815]"
          style={{
            fontSize:      'clamp(1.125rem, 1.9vw, 1.375rem)',
            fontWeight:    600,
            lineHeight:    1.15,
            letterSpacing: '-0.015em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 80",
          }}
        >
          &ldquo;{STORY.headline}&rdquo;
        </h3>
      </div>

      {/* Lens toggle pills */}
      <div className="px-6 mb-4 flex items-center gap-1.5 flex-wrap">
        {LENS_TOGGLES.map((lens, i) => (
          <span
            key={lens}
            className="font-sans px-2.5 py-1 rounded-full"
            style={{
              fontSize:      9.5,
              fontWeight:    800,
              letterSpacing: '0.12em',
              color:         i === 0 ? '#ffffff' : MODE.accent,
              background:    i === 0 ? MODE.accent : 'transparent',
              border:        i === 0 ? 'none' : `1px solid ${MODE.rule}40`,
            }}
          >
            {lens}
          </span>
        ))}
      </div>

      {/* 2×2 perspective grid */}
      <div className="px-6 pb-5 grid grid-cols-2 gap-2.5">
        {PERSPECTIVES.map((p) => (
          <div
            key={p.lean}
            className="rounded-md p-3.5"
            style={{
              background: p.bg,
              border: p.isOmitted ? `1.5px dashed ${p.border}` : `1px solid ${p.border}`,
            }}
          >
            <div className="flex items-center justify-between mb-2.5">
              <p
                className="font-sans"
                style={{
                  color:         p.accent,
                  fontSize:      9,
                  fontWeight:    800,
                  letterSpacing: '0.14em',
                }}
              >
                {p.lean}
              </p>
              {p.isOmitted && (
                <span
                  className="font-sans"
                  style={{
                    fontSize:      8,
                    fontWeight:    800,
                    letterSpacing: '0.12em',
                    color:         p.accent,
                    opacity:       0.7,
                  }}
                >
                  ◇ EXCLUSIVE
                </span>
              )}
            </div>
            <p
              className={p.isOmitted ? 'font-display italic' : 'font-sans'}
              style={{
                color:      '#1a1815',
                fontSize:   10.5,
                lineHeight: 1.45,
                fontVariationSettings: p.isOmitted ? "'opsz' 144, 'SOFT' 100" : undefined,
              }}
            >
              {p.framing}
            </p>
            <div className="mt-3 pt-2.5" style={{ borderTop: `1px solid ${p.border}` }}>
              <p
                className="font-sans"
                style={{
                  color:    p.accent,
                  fontSize: 8.5,
                  fontWeight: 600,
                  opacity:  0.85,
                  letterSpacing: '0.04em',
                }}
              >
                {p.sources.join(' · ')}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-[#fafaf8] border-t border-[#e8e5e0] flex items-center justify-between">
        <span className="font-sans text-[11px] text-[#7a756e]">
          Synthesised from 47 sources across 4 framings
        </span>
        <span
          className="font-sans"
          style={{
            color:         MODE.accent,
            fontSize:      9.5,
            fontWeight:    800,
            letterSpacing: '0.14em',
          }}
        >
          UPDATED 4 MIN AGO
        </span>
      </div>
    </div>
  );
}

export function SectionAllSides() {
  return (
    <section
      id="mode-all-sides"
      className="relative px-6 md:px-10 py-16 md:py-24 bg-white border-t border-[#f0ede8] overflow-hidden"
    >
      {/* Subtle corner sparkles — four colors echoing the four perspectives */}
      <svg
        aria-hidden
        viewBox="0 0 1200 600"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g opacity="0.08">
          <path d="M 90 110 L 96 116 L 102 110 L 96 104 Z" fill="#2d5c8a" />
          <path d="M 1110 80 L 1118 88 L 1126 80 L 1118 72 Z" fill="#a03a20" />
          <path d="M 70 520 L 76 526 L 82 520 L 76 514 Z" fill="#6a4c19" />
          <path d="M 1140 540 L 1148 548 L 1156 540 L 1148 532 Z" fill="#3a3633" />
        </g>
      </svg>

      <div className="relative mx-auto max-w-[1200px]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={sectionContainer}
          className="grid md:grid-cols-2 gap-12 md:gap-20 items-center"
        >
          {/* Text — slides in from left */}
          <motion.div variants={textFromLeft}>
            <motion.p
              variants={textItem}
              className="kicker mb-5 inline-flex items-center gap-2"
              style={{ color: MODE.accent }}
            >
              <span className="inline-block" style={{ width: 18, height: 2, background: MODE.rule }} />
              All Sides
            </motion.p>

            <motion.h2
              variants={textItem}
              className="font-display text-[#1a1815] text-balance mb-6"
              style={{
                fontSize:      'clamp(2rem, 3.8vw, 3rem)',
                lineHeight:    1.06,
                letterSpacing: '-0.025em',
                fontWeight:    500,
                fontVariationSettings: "'opsz' 144, 'SOFT' 80",
              }}
            >
              {MODE.tagline}
            </motion.h2>

            <motion.p
              variants={textItem}
              className="font-sans text-[16px] text-[#4f4b46] leading-[1.6] mb-7 max-w-[480px]"
            >
              {MODE.blurb}
            </motion.p>

            {/* Four-perspective chips */}
            <motion.div
              variants={textItem}
              className="flex flex-wrap gap-2 mb-8 max-w-[480px]"
            >
              {PERSPECTIVE_CHIPS.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[12px] font-semibold"
                  style={{
                    color:      chip.color,
                    background: chip.bg,
                    border:     `1px solid ${chip.color}30`,
                  }}
                >
                  <span aria-hidden className="block w-1.5 h-1.5 rounded-full" style={{ background: chip.color }} />
                  {chip.label}
                </span>
              ))}
            </motion.div>

            <motion.div variants={textItem} className="flex flex-wrap items-center gap-x-5 gap-y-3 mb-5">
              <Link
                href={MODE.href}
                className="inline-flex items-center gap-2 h-11 px-5 bg-[#1f234a] text-white font-sans text-[13px] font-bold hover:bg-[#0f1339] transition-colors"
              >
                {MODE.cta}
              </Link>
              <Link
                href="/today"
                className="font-sans text-[13px] font-semibold text-[#1a1815] hover:editorial-underline transition-all"
              >
                Today&rsquo;s contested story &rarr;
              </Link>
            </motion.div>

            <motion.div
              variants={textItem}
              className="flex items-center gap-2 font-sans text-[12px] text-[#7a756e]"
            >
              <span
                className="block w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: MODE.rule }}
              />
              <span>Live · {MODE.meta}</span>
            </motion.div>
          </motion.div>

          {/* Card — pops in from right */}
          <motion.div variants={cardFromRight}>
            <Mockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

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

const MODE = MODES_BY_KEY['long-view'];

const STORY = {
  date:     'FEB 22, 2026',
  topic:    'TECHNOLOGY',
  headline: 'The OpenAI boardroom crisis.',
};

const RETROSPECTIVE = [
  { icon: '✓', label: 'What held up',      text: 'Commercial momentum was never truly at risk.',                  color: '#2e7c45' },
  { icon: '✗', label: 'What we got wrong', text: 'We predicted a talent exodus. It never came.',                 color: '#a03a20' },
  { icon: '!', label: 'What collapsed',    text: "The myth of Silicon Valley's ethical oversight.",              color: MODE.accent },
];

const WHAT_YOU_GET = [
  '90 days later',
  'What held',
  'What broke',
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
      {/* Header */}
      <div
        className="px-7 py-3.5 flex items-center justify-between"
        style={{ background: MODE.cardBg, borderBottom: `1px solid ${MODE.rule}33` }}
      >
        <div className="flex items-center gap-2.5">
          <p className="kicker" style={{ color: MODE.accent }}>The Long View</p>
        </div>
        <span className="font-mono text-[10.5px]" style={{ color: MODE.accent, opacity: 0.7 }}>
          QUARTERLY · 12 MIN
        </span>
      </div>

      {/* THEN — sepia-faded original */}
      <div
        className="px-7 pt-6 pb-5 relative"
        style={{
          background: 'linear-gradient(180deg, #f6efe0 0%, #f4e2c0 100%)',
        }}
      >
        <p
          className="font-sans mb-2"
          style={{ color: MODE.accent, opacity: 0.55, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.2em' }}
        >
          THEN — THE ORIGINAL STORY
        </p>
        <p
          className="font-display leading-[0.92] mb-3"
          style={{
            color: MODE.accent,
            fontSize: 'clamp(2.25rem, 4.2vw, 3rem)',
            fontWeight: 700,
            letterSpacing: '-0.032em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 50",
            opacity: 0.78,
          }}
        >
          {STORY.date}
        </p>
        <p className="kicker mb-2" style={{ color: MODE.accent, opacity: 0.7 }}>{STORY.topic}</p>
        <h3
          className="font-display italic"
          style={{
            color: '#1a1815',
            fontSize: 'clamp(1rem, 1.7vw, 1.25rem)',
            fontWeight: 500,
            lineHeight: 1.2,
            opacity: 0.78,
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}
        >
          &ldquo;{STORY.headline}&rdquo;
        </h3>
      </div>

      {/* Connector — "90 DAYS LATER" timeline bridge */}
      <div className="relative bg-white py-5 flex items-center justify-center">
        <div className="absolute inset-x-7 top-1/2 h-px bg-[#e8e5e0]" />
        <span
          className="relative bg-white px-4 font-sans inline-flex items-center gap-2"
          style={{
            color: MODE.accent,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.22em',
          }}
        >
          <span aria-hidden>↓</span>
          90 DAYS LATER
          <span aria-hidden>↓</span>
        </span>
      </div>

      {/* NOW — full color retrospective */}
      <div className="px-7 pt-2 pb-6">
        <p
          className="font-sans mb-5"
          style={{ color: MODE.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.22em' }}
        >
          NOW — WHAT WE KNOW
        </p>
        <div className="space-y-4">
          {RETROSPECTIVE.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <span
                className="inline-flex items-center justify-center flex-shrink-0 rounded-full text-white font-bold"
                style={{
                  background: row.color,
                  width: 22,
                  height: 22,
                  fontSize: 11,
                  fontFamily: 'var(--font-jakarta), sans-serif',
                }}
              >
                {row.icon}
              </span>
              <div className="flex-1">
                <p
                  className="font-sans mb-0.5"
                  style={{ color: row.color, fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em' }}
                >
                  {row.label.toUpperCase()}
                </p>
                <p className="font-sans text-[12.5px] text-[#1a1815] leading-snug">{row.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-7 py-3.5 bg-[#fafaf8] border-t border-[#e8e5e0] flex items-center justify-between">
        <span className="font-sans text-[11px] text-[#7a756e]">
          <span className="font-semibold text-[#1a1815]">29 sources</span> · Quarterly accountability
        </span>
        <span
          className="font-sans"
          style={{ color: MODE.accent, fontSize: 9.5, fontWeight: 800, letterSpacing: '0.14em' }}
        >
          Q2 2026
        </span>
      </div>
    </div>
  );
}

export function SectionLongView() {
  return (
    <section
      id="mode-long-view"
      className="relative px-6 md:px-10 py-16 md:py-24 bg-white border-t border-[#f0ede8] overflow-hidden"
    >
      <svg
        aria-hidden
        viewBox="0 0 1200 600"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill={MODE.rule} opacity="0.08">
          <path d="M 90 110 L 96 116 L 102 110 L 96 104 Z" />
          <path d="M 1110 80 L 1118 88 L 1126 80 L 1118 72 Z" />
          <path d="M 70 520 L 76 526 L 82 520 L 76 514 Z" />
          <path d="M 1140 540 L 1148 548 L 1156 540 L 1148 532 Z" />
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
          <motion.div variants={textFromLeft}>
            <motion.p
              variants={textItem}
              className="kicker mb-5 inline-flex items-center gap-2"
              style={{ color: MODE.accent }}
            >
              <span className="inline-block" style={{ width: 18, height: 2, background: MODE.rule }} />
              The Long View
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

            <motion.div variants={textItem} className="flex flex-wrap gap-2 mb-8 max-w-[480px]">
              {WHAT_YOU_GET.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[12px] font-semibold"
                  style={{
                    color:      MODE.accent,
                    background: MODE.cardBg,
                    border:     `1px solid ${MODE.rule}30`,
                  }}
                >
                  <span aria-hidden style={{ color: MODE.rule, fontSize: 10 }}>✓</span>
                  {item}
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
                href="/archive"
                className="font-sans text-[13px] font-semibold text-[#1a1815] hover:editorial-underline transition-all"
              >
                Past retrospectives &rarr;
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
              <span>Live · Quarterly retrospectives · Last published 22 May</span>
            </motion.div>
          </motion.div>

          <motion.div variants={cardFromRight}>
            <Mockup />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

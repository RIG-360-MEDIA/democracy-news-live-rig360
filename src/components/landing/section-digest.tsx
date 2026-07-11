'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MODES_BY_KEY } from '@/lib/modes';
import {
  sectionContainer,
  textFromRight,
  textItem,
  cardFromLeft,
} from '@/lib/animations';

const MODE = MODES_BY_KEY.digest;

const STORIES = [
  { topic: 'MARKETS',  line: 'Fed signals two rate cuts in 2026 as core inflation falls to 2.1%.' },
  { topic: 'POLITICS', line: 'UK PM confirms July 3 election — Conservatives trail Labour by 22 points.' },
  { topic: 'TECH',     line: 'OpenAI releases GPT-5 with 10× efficiency gains; cuts API pricing 80%.' },
  { topic: 'WORLD',    line: 'India-Pakistan back-channel talks resume — first contact since 2019.' },
  { topic: 'SCIENCE',  line: 'SpaceX Starship completes first commercial payload delivery to lunar orbit.' },
];

const WHAT_YOU_GET = [
  '5 stories',
  '5 minutes',
  'Email · WhatsApp · Web',
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
      {/* Email chrome header */}
      <div className="px-5 py-3 bg-[#f4f1ec] border-b border-[#e8e5e0] space-y-0.5">
        <div className="flex items-baseline gap-3 font-sans text-[11px]">
          <span className="text-[#7a756e] w-12">From</span>
          <span className="text-[#1a1815] font-semibold">Rig Wire</span>
          <span className="text-[#7a756e]">&lt;digest@rigwire.com&gt;</span>
        </div>
        <div className="flex items-baseline gap-3 font-sans text-[11px]">
          <span className="text-[#7a756e] w-12">To</span>
          <span className="text-[#1a1815]">you@email.com</span>
        </div>
        <div className="flex items-baseline gap-3 font-sans text-[11px]">
          <span className="text-[#7a756e] w-12">Subject</span>
          <span className="text-[#1a1815] font-semibold">
            Tuesday, 22 May · Your 5-minute brief
          </span>
        </div>
      </div>

      {/* Newsletter masthead */}
      <div className="px-7 pt-7 pb-5 text-center" style={{ background: MODE.cardBg }}>
        <p
          className="font-sans mb-2"
          style={{ color: MODE.accent, opacity: 0.6, fontSize: 10, fontWeight: 800, letterSpacing: '0.22em' }}
        >
          TUESDAY · MAY 22 · ISSUE №847
        </p>
        <h4
          className="font-display"
          style={{
            color:         MODE.accent,
            fontSize:      'clamp(1.5rem, 2.4vw, 1.875rem)',
            fontWeight:    700,
            lineHeight:    1.0,
            letterSpacing: '-0.022em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 50",
          }}
        >
          The Rig&nbsp;Wire Digest
        </h4>
        <div className="mx-auto mt-3" style={{ width: 40, height: 2, background: MODE.rule, opacity: 0.6 }} />
      </div>

      {/* Five-story table of contents */}
      <div className="bg-white">
        {STORIES.map((s, i) => (
          <div
            key={s.topic}
            className="px-7 py-3.5 flex items-center gap-4 border-b border-[#f0ede8] last:border-b-0"
          >
            <span
              className="font-mono flex-shrink-0"
              style={{ color: MODE.accent, opacity: 0.5, fontSize: 11, width: 16 }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <span
              className="kicker flex-shrink-0"
              style={{ color: MODE.accent, width: 70 }}
            >
              {s.topic}
            </span>
            <p className="font-sans text-[12.5px] text-[#1a1815] leading-snug flex-1">
              {s.line}
            </p>
          </div>
        ))}
      </div>

      {/* Footer — readers + delivery channels */}
      <div className="px-7 py-4 bg-[#fafaf8] border-t border-[#e8e5e0] flex items-center justify-between">
        <span className="font-sans text-[11px] text-[#7a756e]">
          <span className="font-semibold text-[#1a1815]">4,287</span> readers today
        </span>
        <div className="flex items-center gap-1.5">
          {['Email', 'WhatsApp', 'Web'].map((ch) => (
            <span
              key={ch}
              className="font-sans px-2 py-0.5 rounded-full"
              style={{
                color: MODE.accent,
                background: MODE.cardBg,
                border: `1px solid ${MODE.rule}40`,
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SectionDigest() {
  return (
    <section
      id="mode-digest"
      className="relative px-6 md:px-10 py-16 md:py-24 bg-white border-t border-[#f0ede8] overflow-hidden"
    >
      <svg
        aria-hidden
        viewBox="0 0 1200 600"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill={MODE.rule} opacity="0.07">
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
          <motion.div variants={cardFromLeft} className="md:order-1">
            <Mockup />
          </motion.div>

          <motion.div variants={textFromRight} className="md:order-2">
            <motion.p
              variants={textItem}
              className="kicker mb-5 inline-flex items-center gap-2"
              style={{ color: MODE.accent }}
            >
              <span className="inline-block" style={{ width: 18, height: 2, background: MODE.rule }} />
              The Digest
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
                href="#subscribe"
                className="font-sans text-[13px] font-semibold text-[#1a1815] hover:editorial-underline transition-all"
              >
                Subscribe free &rarr;
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
              <span>Live · Sent 06:30 daily · 4,287 subscribers</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

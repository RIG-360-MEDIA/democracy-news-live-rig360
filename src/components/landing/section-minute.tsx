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

const MODE = MODES_BY_KEY.minute;

const STORY = {
  topic:    'ECONOMY',
  date:     'TUE 22 MAY · 06:30 GMT',
  headline: "India becomes the world's third-largest economy, surpassing Japan.",
  body:     "GDP crossed $4.3 trillion at market rates Tuesday, the IMF confirmed — driven by 6.8% annual growth and reached two years ahead of projections.",
  why:      "India's working-age population — 900 million strong — is now entering peak productivity. The demographic dividend everyone forecasted is finally here.",
  sources:  31,
  bylines:  'Reuters · FT · IMF · 28 more',
  badge:    'Breaking',
};

const WHAT_YOU_GET = [
  'The headline',
  'The context',
  'The takeaway',
];

function Mockup() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: '#ffffff',
        boxShadow:
          '0 2px 4px rgba(26,24,21,0.06), 0 14px 28px rgba(26,24,21,0.10), 0 32px 64px rgba(26,24,21,0.08)',
      }}
    >
      {/* Header band — peach with live indicator + countdown */}
      <div
        className="px-7 py-4 flex items-center justify-between"
        style={{ background: MODE.cardBg, borderBottom: `1px solid ${MODE.rule}33` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="block w-2 h-2 rounded-full animate-pulse"
            style={{ background: MODE.rule }}
          />
          <p className="kicker" style={{ color: MODE.accent }}>The Minute</p>
          <span
            className="font-sans hidden sm:inline"
            style={{ color: MODE.accent, opacity: 0.5, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em' }}
          >
            · {STORY.date}
          </span>
        </div>
        <div className="flex items-baseline gap-1 font-mono" style={{ color: MODE.accent }}>
          <span className="text-[20px] font-bold">60</span>
          <span className="text-[12px] opacity-60">:00</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-7 py-6">
        {/* Topic with rule */}
        <div className="flex items-center gap-3 mb-4">
          <span
            className="block"
            style={{ width: 24, height: 2, background: MODE.rule }}
          />
          <p className="kicker" style={{ color: MODE.accent }}>{STORY.topic}</p>
        </div>

        {/* Headline */}
        <h3
          className="font-display text-[#1a1815] mb-4"
          style={{
            fontSize:      'clamp(1.375rem, 2.2vw, 1.625rem)',
            fontWeight:    600,
            lineHeight:    1.12,
            letterSpacing: '-0.018em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 80",
          }}
        >
          {STORY.headline}
        </h3>

        {/* Body */}
        <p className="font-sans text-[14px] text-[#4f4b46] leading-[1.6] mb-5">
          {STORY.body}
        </p>

        {/* Why it matters — editorial callout */}
        <div
          className="pl-4 mb-6"
          style={{ borderLeft: `2.5px solid ${MODE.rule}` }}
        >
          <p
            className="kicker mb-1.5"
            style={{ color: MODE.accent }}
          >
            Why it matters
          </p>
          <p
            className="font-display italic text-[#1a1815] leading-[1.45]"
            style={{
              fontSize: 13.5,
              fontVariationSettings: "'opsz' 144, 'SOFT' 100",
            }}
          >
            {STORY.why}
          </p>
        </div>

        {/* Footer — sources + breaking badge */}
        <div className="pt-4 border-t border-[#e8e5e0] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-sans text-[12px] font-bold text-[#1a1815]">
              {STORY.sources} sources
            </span>
            <span className="font-sans text-[10.5px] text-[#7a756e] mt-0.5">
              {STORY.bylines}
            </span>
          </div>
          <span
            className="font-sans text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{ background: MODE.rule, color: '#ffffff' }}
          >
            {STORY.badge}
          </span>
        </div>
      </div>
    </div>
  );
}

export function SectionMinute() {
  return (
    <section
      id="mode-minute"
      className="relative px-6 md:px-10 py-16 md:py-24 bg-white border-t border-[#f0ede8] overflow-hidden"
    >
      {/* Subtle decoration — faint sparkles echoing the homepage card */}
      <svg
        aria-hidden
        viewBox="0 0 1200 600"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMid slice"
      >
        <g fill={MODE.rule} opacity="0.06">
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
          {/* Text — slides in from left, cascades children */}
          <motion.div variants={textFromLeft}>
            {/* Kicker */}
            <motion.p
              variants={textItem}
              className="kicker mb-5 inline-flex items-center gap-2"
              style={{ color: MODE.accent }}
            >
              <span className="inline-block" style={{ width: 18, height: 2, background: MODE.rule }} />
              The Minute
            </motion.p>

            {/* Headline */}
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

            {/* Description */}
            <motion.p
              variants={textItem}
              className="font-sans text-[16px] text-[#4f4b46] leading-[1.6] mb-7 max-w-[480px]"
            >
              {MODE.blurb}
            </motion.p>

            {/* What you get — three chip-style items */}
            <motion.div
              variants={textItem}
              className="flex flex-wrap gap-2 mb-8 max-w-[480px]"
            >
              {WHAT_YOU_GET.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[12px] font-semibold"
                  style={{
                    color: MODE.accent,
                    background: MODE.cardBg,
                    border: `1px solid ${MODE.rule}30`,
                  }}
                >
                  <span aria-hidden style={{ color: MODE.rule, fontSize: 10 }}>✓</span>
                  {item}
                </span>
              ))}
            </motion.div>

            {/* CTAs */}
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
                Read today&rsquo;s &rarr;
              </Link>
            </motion.div>

            {/* Meta — live indicator + meta line */}
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

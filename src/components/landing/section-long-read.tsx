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

const MODE = MODES_BY_KEY['long-read'];

const STORY = {
  topic:    'MEDIA',
  byline:   'Sarah Chen',
  date:     '22 MAY 2026',
  headline: 'The slow death of local news.',
  dek:      'In 3,200 American towns, the last local paper closed this decade. We visited five of them.',
  body1:    'The newsroom at the Daily Sentinel was once the loudest room in Elkhart, Indiana. Reporters argued over leads at noon, editors shouted corrections across rows of desks, and the police scanner never went quiet. Today it is a dental office.',
  pull:     'When the paper closed, the city council stopped holding public comment periods. Nobody noticed for three months.',
  body2:    'What replaced the Sentinel is harder to name. A hyperlocal Facebook group run by a retired teacher. A regional TV station that drives in from fifty miles away.',
};

const WHAT_YOU_GET = [
  'Drop cap',
  'Pull quote',
  'Single column',
];

function Mockup() {
  return (
    <div
      className="relative rounded-2xl overflow-hidden mx-auto"
      style={{
        background: '#ffffff',
        maxWidth:   380,
        boxShadow:
          '0 2px 4px rgba(26,24,21,0.06), 0 14px 28px rgba(26,24,21,0.10), 0 32px 64px rgba(26,24,21,0.08)',
      }}
    >
      {/* Masthead */}
      <div
        className="px-7 py-3 flex items-center justify-between"
        style={{ background: MODE.cardBg, borderBottom: `1px solid ${MODE.rule}33` }}
      >
        <p className="kicker" style={{ color: MODE.accent }}>The Long Read</p>
        <span className="font-mono text-[10.5px]" style={{ color: MODE.accent, opacity: 0.7 }}>
          14 MIN · MEDIA
        </span>
      </div>

      {/* Article body — magazine spread */}
      <div className="px-7 pt-6 pb-2">
        {/* Byline */}
        <div className="flex items-center gap-2 mb-5 font-sans text-[10.5px]">
          <span className="font-bold text-[#1a1815]">{STORY.byline}</span>
          <span className="text-[#9a9590]">·</span>
          <span className="text-[#7a756e]">{STORY.date}</span>
        </div>

        {/* Headline */}
        <h3
          className="font-display text-[#1a1815] mb-4"
          style={{
            fontSize:      'clamp(1.5rem, 2.8vw, 2rem)',
            fontWeight:    600,
            lineHeight:    1.02,
            letterSpacing: '-0.026em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 50",
          }}
        >
          {STORY.headline}
        </h3>

        {/* Dek */}
        <p
          className="font-display italic text-[#4f4b46] mb-5"
          style={{
            fontSize: 14,
            lineHeight: 1.45,
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}
        >
          {STORY.dek}
        </p>

        {/* Rule */}
        <div className="h-px bg-[#1a1815]/15 mb-5" />

        {/* Body with drop cap */}
        <p
          className="font-display text-[14px] leading-[1.7] text-[#1a1815] drop-cap mb-5"
          style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}
        >
          {STORY.body1}
        </p>

        {/* Pull quote */}
        <blockquote
          className="pl-4 my-5"
          style={{ borderLeft: `3px solid ${MODE.rule}` }}
        >
          <p
            className="font-display italic text-[#1a1815]"
            style={{
              fontSize: 16,
              lineHeight: 1.35,
              fontVariationSettings: "'opsz' 144, 'SOFT' 100",
            }}
          >
            &ldquo;{STORY.pull}&rdquo;
          </p>
        </blockquote>

        {/* Body continuation */}
        <p className="font-sans text-[13.5px] leading-[1.7] text-[#1a1815]">
          {STORY.body2}
        </p>
      </div>

      {/* Fade-out continuation + reading meta */}
      <div className="relative">
        <div
          className="absolute -top-12 inset-x-0 h-12 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, transparent, #ffffff)' }}
        />
        <div className="px-7 pt-3 pb-4 bg-white border-t border-[#f0ede8] flex items-center justify-between">
          <span className="font-sans text-[10.5px] text-[#7a756e]">
            <span className="font-semibold text-[#1a1815]">18 sources</span> · Original reporting
          </span>
          <span
            className="font-sans inline-flex items-center gap-1"
            style={{
              color: MODE.accent,
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.12em',
            }}
          >
            CONTINUE READING <span aria-hidden>↓</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function SectionLongRead() {
  return (
    <section
      id="mode-long-read"
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
              The Long Read
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
                href="/today"
                className="font-sans text-[13px] font-semibold text-[#1a1815] hover:editorial-underline transition-all"
              >
                This week&rsquo;s feature &rarr;
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
              <span>Published Tuesdays · 18 sources · 14-min average read</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

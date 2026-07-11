'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MODES_BY_KEY } from '@/lib/modes';
import {
  sectionContainer,
  textFromRight,
  textItem,
  cardFromLeft,
} from '@/lib/animations';

const SPRING = [0.16, 1, 0.3, 1] as const;
const MODE   = MODES_BY_KEY.queue;

interface QueueItem {
  mode: string;
  accent: string;
  bg: string;
  shortTime: string;
  topic: string;
  headline: string;
  duration: string;
}

const QUEUE: QueueItem[] = [
  { mode: 'The Minute',    accent: '#a03a20', bg: '#fcded0', shortTime: '60 sec', topic: 'ECONOMY',  headline: "India becomes world's third-largest economy.",  duration: '1:00' },
  { mode: 'The Long Read', accent: '#264e78', bg: '#d6e2f0', shortTime: '14 min', topic: 'MEDIA',    headline: 'The slow death of local news.',                 duration: '14:00' },
  { mode: 'All Sides',     accent: '#3a3633', bg: '#e8e5e0', shortTime: '8 min',  topic: 'POLITICS', headline: 'H-1B visa review extended to 90 days.',         duration: '8:00' },
  { mode: 'The Digest',    accent: '#2e5e3e', bg: '#d6e8dc', shortTime: '5 min',  topic: 'WORLD',    headline: "Today's morning briefing.",                     duration: '5:00' },
];

const WHAT_YOU_GET = [
  'Personalised',
  'Auto-play',
  'No menus',
];

function Mockup() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setActive((i) => (i + 1) % QUEUE.length);
          return 0;
        }
        return p + 1.5;
      });
    }, 60);
    return () => clearInterval(t);
  }, []);

  const current = QUEUE[active];
  const elapsed = Math.floor((progress / 100) * 252); // 0:42 of 4:12

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-white"
      style={{
        boxShadow:
          '0 2px 4px rgba(26,24,21,0.06), 0 14px 28px rgba(26,24,21,0.10), 0 32px 64px rgba(26,24,21,0.08)',
      }}
    >
      {/* Player header — Now Playing + transport controls */}
      <div
        className="px-6 py-3.5 flex items-center justify-between"
        style={{ background: MODE.cardBg, borderBottom: `1px solid ${MODE.rule}33` }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="block w-2 h-2 rounded-full animate-pulse"
            style={{ background: MODE.rule }}
          />
          <p className="kicker" style={{ color: MODE.accent }}>Now Playing</p>
        </div>
        <div className="flex items-center gap-3 font-mono" style={{ color: MODE.accent, opacity: 0.7 }}>
          <span className="text-[15px]" aria-hidden>⏮</span>
          <span className="text-[18px] font-bold" aria-hidden>⏸</span>
          <span className="text-[15px]" aria-hidden>⏭</span>
        </div>
      </div>

      {/* Currently playing card */}
      <div
        className="relative px-6 py-5 transition-colors duration-500"
        style={{ background: current.bg }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: SPRING }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="kicker" style={{ color: current.accent }}>{current.mode}</p>
              <span
                className="font-mono"
                style={{ color: current.accent, opacity: 0.7, fontSize: 10.5, fontWeight: 700 }}
              >
                {current.shortTime}
              </span>
            </div>
            <p
              className="font-sans mb-2"
              style={{ color: current.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em' }}
            >
              {current.topic}
            </p>
            <h3
              className="font-display text-[#1a1815]"
              style={{
                fontSize: 'clamp(1.0625rem, 1.8vw, 1.25rem)',
                fontWeight: 600,
                lineHeight: 1.15,
                letterSpacing: '-0.018em',
                fontVariationSettings: "'opsz' 144, 'SOFT' 80",
              }}
            >
              {current.headline}
            </h3>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="px-6 py-3 bg-white border-y border-[#f0ede8]">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px]" style={{ color: MODE.accent }}>
            {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
          </span>
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: MODE.accent + '20' }}
          >
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${progress}%`,
                background: MODE.rule,
              }}
            />
          </div>
          <span className="font-mono text-[10px]" style={{ color: MODE.accent, opacity: 0.55 }}>
            {current.duration}
          </span>
        </div>
      </div>

      {/* Up next queue */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <p
            className="font-sans"
            style={{ color: MODE.accent, fontSize: 10, fontWeight: 800, letterSpacing: '0.22em' }}
          >
            UP NEXT
          </p>
          <p
            className="font-sans inline-flex items-center gap-1"
            style={{ color: MODE.accent, opacity: 0.6, fontSize: 9, fontWeight: 700, letterSpacing: '0.14em' }}
          >
            <span className="block w-1 h-1 rounded-full" style={{ background: MODE.rule }} />
            TAILORED FOR YOU
          </p>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((offset) => {
            const next = QUEUE[(active + offset) % QUEUE.length];
            return (
              <div
                key={offset}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors"
                style={{
                  background: offset === 1 ? '#fafaf8' : 'transparent',
                  border: `1px solid ${MODE.accent}15`,
                }}
              >
                <span
                  className="block flex-shrink-0"
                  aria-hidden
                  style={{
                    color: next.accent,
                    fontSize: 11,
                    opacity: offset === 1 ? 1 : 0.5,
                  }}
                >
                  ▶
                </span>
                <span className="kicker flex-shrink-0 w-20" style={{ color: next.accent }}>
                  {next.mode}
                </span>
                <p className="font-sans text-[11.5px] text-[#1a1815] leading-snug flex-1 line-clamp-1">
                  {next.headline}
                </p>
                <span
                  className="font-mono text-[10px] flex-shrink-0"
                  style={{ color: next.accent, opacity: 0.6 }}
                >
                  {next.shortTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 bg-[#fafaf8] border-t border-[#e8e5e0] flex items-center justify-between">
        <span className="font-sans text-[11px] text-[#7a756e]">
          Auto-play · No decisions
        </span>
        <span
          className="font-sans inline-flex items-center gap-1.5"
          style={{
            color: MODE.accent,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.14em',
          }}
        >
          <span className="block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: MODE.rule }} />
          STREAMING
        </span>
      </div>
    </div>
  );
}

export function SectionQueue() {
  return (
    <section
      id="mode-queue"
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
              The Queue
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
                href="/queue"
                className="font-sans text-[13px] font-semibold text-[#1a1815] hover:editorial-underline transition-all"
              >
                Press play &rarr;
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
              <span>Streaming · Personalised · Queue updates as you read</span>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

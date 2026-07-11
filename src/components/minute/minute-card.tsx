'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import type { MinuteStory } from './stories';

const SPRING = [0.16, 1, 0.3, 1] as const;

interface MinuteCardProps {
  story:     MinuteStory;
  index:     number;
  total:     number;
  direction: 1 | -1;
}

/* ═════════════════════════════════════════════════════════════════
   MinuteCard — single story plate, hero on top, body below.
   Hero image has mouse-parallax and a slow Ken-Burns drift.
   The whole card slides + rotates + fades on advance.
═════════════════════════════════════════════════════════════════ */
export function MinuteCard({ story, index, total, direction }: MinuteCardProps) {
  /* ── Mouse parallax on hero image ───────────────────────── */
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 80, damping: 18, mass: 0.4 });
  const smy = useSpring(my, { stiffness: 80, damping: 18, mass: 0.4 });
  const imgX = useTransform(smx, [-1, 1], [-14, 14]);
  const imgY = useTransform(smy, [-1, 1], [-10, 10]);
  const imgScale = 1.08;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2))  / (r.width / 2);
    const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
    mx.set(dx);
    my.set(dy);
  }
  function handleMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  /* ── Card slide-in / slide-out transition (direction-aware) ── */
  const variants = {
    enter: (dir: 1 | -1) => ({
      opacity:  0,
      y:        dir > 0 ? 60 : -60,
      rotateX:  dir > 0 ?  6 : -6,
      scale:    0.94,
    }),
    center: {
      opacity:  1,
      y:        0,
      rotateX:  0,
      scale:    1,
    },
    exit: (dir: 1 | -1) => ({
      opacity:  0,
      y:        dir > 0 ? -60 : 60,
      rotateX:  dir > 0 ? -6 :  6,
      scale:    0.94,
    }),
  };

  return (
    <motion.article
      key={story.id}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.55, ease: SPRING }}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden mx-auto"
      style={{
        width:       '100%',
        maxWidth:    840,
        borderRadius: 22,
        background:  '#ffffff',
        boxShadow: `
          0 28px 70px -14px ${story.categoryColor}48,
          0 14px 32px -8px rgba(20,18,14,0.20),
          0 3px 8px -2px rgba(20,18,14,0.12),
          0 0 0 1px rgba(20,18,14,0.06)
        `,
      }}
    >
      {/* ─────── HERO ─────── */}
      <div
        className="relative overflow-hidden"
        style={{
          height:     'clamp(260px, 40dvh, 450px)',
          background: `linear-gradient(135deg, ${story.categoryColor} 0%, ${story.categoryColor}cc 100%)`,
        }}
      >
        {/* Image with parallax + Ken Burns slow drift */}
        <motion.div
          className="absolute inset-0"
          style={{ x: imgX, y: imgY, scale: imgScale }}
        >
          <motion.img
            src={story.image}
            alt={story.imageAlt}
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            loading="eager"
            onError={(e) => {
              /* Hide the broken-image slot so the gradient fallback shows
                 cleanly without bleeding alt text. */
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
            initial={{ scale: 1, x: 0, y: 0 }}
            animate={{ scale: 1.06, x: -8, y: -4 }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity, repeatType: 'reverse' }}
          />
        </motion.div>

        {/* Bottom gradient so the chip/badge area reads cleanly */}
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.55) 100%)',
          }}
        />

        {/* Category chip — top-left */}
        <div
          className="absolute top-5 left-5 flex items-center gap-2.5"
          style={{
            background:  'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(6px)',
            padding:     '7px 12px 7px 9px',
            borderRadius: 999,
            boxShadow:   '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <span
            aria-hidden
            className="block rounded-full"
            style={{ width: 7, height: 7, background: story.categoryColor }}
          />
          <span
            style={{
              fontFamily:    'var(--font-mono), monospace',
              color:         story.categoryColor,
              fontSize:      10,
              fontWeight:    800,
              letterSpacing: '0.22em',
            }}
          >
            {story.category}
          </span>
        </div>

        {/* Story counter — top-right */}
        <div
          className="absolute top-5 right-5"
          style={{
            background:  'rgba(20,18,14,0.65)',
            backdropFilter: 'blur(6px)',
            padding:     '6px 12px',
            borderRadius: 999,
          }}
        >
          <span
            style={{
              fontFamily:    'var(--font-mono), monospace',
              color:         '#fff',
              fontSize:      10.5,
              fontWeight:    700,
              letterSpacing: '0.18em',
            }}
          >
            {String(index + 1).padStart(2, '0')} <span style={{ opacity: 0.5 }}>/</span> {String(total).padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* ─────── BODY ─────── */}
      <div className="relative px-8 md:px-12 pt-8 pb-8">
        {/* Headline */}
        <motion.h2
          className="font-display"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: SPRING, delay: 0.15 }}
          style={{
            color:         '#0f0e0c',
            fontSize:      'clamp(1.625rem, 2.7vw, 2.25rem)',
            fontWeight:    600,
            lineHeight:    1.12,
            letterSpacing: '-0.024em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 50",
            textWrap:      'balance',
            marginBottom:  18,
          }}
        >
          {story.headline}
        </motion.h2>

        {/* Summary body */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: SPRING, delay: 0.22 }}
          style={{
            fontFamily:    'var(--font-jakarta), sans-serif',
            color:         '#3a3633',
            fontSize:      'clamp(0.975rem, 1.15vw, 1.0625rem)',
            fontWeight:    400,
            lineHeight:    1.58,
            letterSpacing: '-0.003em',
            marginBottom:  20,
          }}
        >
          {story.summary}
        </motion.p>

        {/* Hairline rule in story colour */}
        <motion.span
          aria-hidden
          className="block"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 0.4 }}
          transition={{ duration: 0.6, ease: SPRING, delay: 0.3 }}
          style={{
            height:       1,
            background:   story.categoryColor,
            transformOrigin: 'left center',
            marginBottom: 14,
          }}
        />

        {/* Meta row — source · time · read time */}
        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.4 }}
          style={{
            fontFamily:    'var(--font-mono), monospace',
            fontSize:      10.5,
            letterSpacing: '0.18em',
            fontWeight:    700,
          }}
        >
          <span style={{ color: story.categoryColor }}>{story.source.toUpperCase()}</span>
          <span style={{ color: '#c0bbb3' }}>·</span>
          <span style={{ color: '#7a756e' }}>{story.timeAgo.toUpperCase()}</span>
          <span style={{ color: '#c0bbb3' }}>·</span>
          <span style={{ color: '#7a756e' }}>{story.readSeconds}s READ</span>
        </motion.div>
      </div>
    </motion.article>
  );
}

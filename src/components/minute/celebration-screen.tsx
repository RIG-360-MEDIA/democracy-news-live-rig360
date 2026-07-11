'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const SPRING = [0.16, 1, 0.3, 1] as const;

interface CelebrationScreenProps {
  storiesCount:     number;
  categoriesCount:  number;
  timeSavedSeconds: number;
  onRestart:        () => void;
}

/* ═════════════════════════════════════════════════════════════════
   CelebrationScreen — the reward.
   Confetti burst, big italic "Done.", stat grid, mode hand-offs.
═════════════════════════════════════════════════════════════════ */
export function CelebrationScreen({
  storiesCount,
  categoriesCount,
  timeSavedSeconds,
  onRestart,
}: CelebrationScreenProps) {
  const min = Math.floor(timeSavedSeconds / 60);
  const sec = timeSavedSeconds % 60;

  /* ── Confetti particles — randomised positions/colours ── */
  const palette = ['#a03a20', '#5b21b6', '#0e7490', '#c2410c', '#065f46', '#1e3a8a'];
  const particles = Array.from({ length: 28 }, (_, i) => ({
    id:    i,
    x:     (Math.random() - 0.5) * 600,
    y:     -300 - Math.random() * 200,
    rot:   Math.random() * 720 - 360,
    delay: Math.random() * 0.4,
    color: palette[i % palette.length],
    size:  Math.random() > 0.5 ? 8 : 12,
  }));

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1    }}
      transition={{ duration: 0.6, ease: SPRING }}
      className="relative mx-auto text-center"
      style={{ width: '100%', maxWidth: 720 }}
    >
      {/* Confetti — bursts from centre, falls upward & sideways */}
      <div aria-hidden className="absolute inset-0 pointer-events-none overflow-visible">
        {particles.map((p) => (
          <motion.span
            key={p.id}
            className="absolute left-1/2 top-32 block"
            initial={{ opacity: 0, x: 0, y: 0, rotate: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x:       p.x,
              y:       p.y,
              rotate:  p.rot,
              scale:   [0, 1, 1, 0.6],
            }}
            transition={{ duration: 1.8, delay: p.delay, ease: 'easeOut' }}
            style={{
              width:        p.size,
              height:       p.size * 0.6,
              background:   p.color,
              borderRadius: 2,
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {/* ── Eyebrow ── */}
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: SPRING }}
        className="flex items-center justify-center gap-3 mb-6"
        style={{
          fontFamily:    'var(--font-mono), monospace',
          fontSize:      11,
          fontWeight:    800,
          letterSpacing: '0.30em',
          color:         '#a03a20',
        }}
      >
        <span aria-hidden style={{ display: 'inline-block', width: 24, height: 1.5, background: '#a03a20' }} />
        YOU&rsquo;RE CAUGHT UP
        <span aria-hidden style={{ display: 'inline-block', width: 24, height: 1.5, background: '#a03a20' }} />
      </motion.p>

      {/* ── Big "Done." ── */}
      <motion.h1
        initial={{ opacity: 0, y: 24, scale: 0.94 }}
        animate={{ opacity: 1, y: 0,  scale: 1    }}
        transition={{ delay: 0.18, duration: 0.7, ease: SPRING }}
        className="font-display italic"
        style={{
          color:         '#0f0e0c',
          fontSize:      'clamp(4rem, 10vw, 7.5rem)',
          fontWeight:    400,
          lineHeight:    0.95,
          letterSpacing: '-0.04em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
          marginBottom:  12,
        }}
      >
        Done.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.36, duration: 0.6 }}
        className="font-display italic"
        style={{
          color:         '#5d4a9a',
          fontSize:      'clamp(1.125rem, 1.7vw, 1.4rem)',
          fontWeight:    400,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          marginBottom:  56,
        }}
      >
        You read the world in a minute.
      </motion.p>

      {/* ── Stat grid ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.46, duration: 0.6, ease: SPRING }}
        className="grid grid-cols-3 gap-4 mb-12"
      >
        <Stat number={storiesCount}        label="STORIES READ"  color="#a03a20" />
        <Stat number={`${min}m ${sec}s`}   label="TIME SAVED"     color="#5b21b6" />
        <Stat number={categoriesCount}     label="CATEGORIES"     color="#0e7490" />
      </motion.div>

      {/* ── What's next ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        style={{
          fontFamily:    'var(--font-mono), monospace',
          fontSize:      10.5,
          fontWeight:    800,
          letterSpacing: '0.28em',
          color:         '#7a756e',
          marginBottom:  18,
        }}
      >
        OR GO DEEPER
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.68, duration: 0.55, ease: SPRING }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10"
      >
        <NextModeCard href="/digest"     name="Newsletter"    duration="5 MIN" tint="#2e5e3e" />
        <NextModeCard href="/long-read"  name="Worldwide"     duration="14 MIN" tint="#264e78" />
        <NextModeCard href="/queue"      name="Pocket"        duration="∞"      tint="#4d3a85" />
      </motion.div>

      {/* ── Quiet restart link ── */}
      <motion.button
        onClick={onRestart}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.84, duration: 0.5 }}
        className="hover:opacity-100 transition-opacity"
        style={{
          fontFamily:    'var(--font-mono), monospace',
          fontSize:      10.5,
          fontWeight:    700,
          letterSpacing: '0.22em',
          color:         '#7a756e',
          opacity:       0.7,
          padding:       '8px 0',
          cursor:        'pointer',
        }}
      >
        ⟲ READ AGAIN FROM THE TOP
      </motion.button>
    </motion.section>
  );
}

/* ─────────────── stat block ─────────────── */
function Stat({ number, label, color }: { number: string | number; label: string; color: string }) {
  return (
    <div
      className="relative px-4 py-5"
      style={{
        background:   'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: 14,
        border:       `1px solid ${color}22`,
        boxShadow:    `0 8px 20px -10px ${color}44`,
      }}
    >
      <p
        className="font-display"
        style={{
          color,
          fontSize:      'clamp(1.75rem, 3vw, 2.5rem)',
          fontWeight:    600,
          lineHeight:    1,
          letterSpacing: '-0.022em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 50",
          marginBottom:  6,
        }}
      >
        {number}
      </p>
      <p
        style={{
          fontFamily:    'var(--font-mono), monospace',
          fontSize:      9,
          fontWeight:    800,
          letterSpacing: '0.24em',
          color:         '#7a756e',
        }}
      >
        {label}
      </p>
    </div>
  );
}

/* ─────────────── mode hand-off card ─────────────── */
function NextModeCard({ href, name, duration, tint }: {
  href: string; name: string; duration: string; tint: string;
}) {
  return (
    <Link
      href={href}
      className="group block px-5 py-4 text-left relative overflow-hidden"
      style={{
        background:   '#ffffff',
        border:       '1px solid #e6e0d6',
        borderRadius: 14,
        boxShadow:    '0 4px 10px -6px rgba(20,18,14,0.08)',
        transition:   'transform 320ms cubic-bezier(.16,1,.3,1), box-shadow 320ms',
      }}
    >
      {/* Tint wash on hover */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none"
        style={{
          background: `linear-gradient(135deg, ${tint}0d 0%, ${tint}1f 100%)`,
          transition: 'opacity 320ms cubic-bezier(.16,1,.3,1)',
        }}
      />
      <span
        className="block group-hover:translate-x-1"
        style={{ transition: 'transform 320ms cubic-bezier(.16,1,.3,1)' }}
      >
        <span
          className="block"
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         tint,
            fontSize:      9,
            fontWeight:    800,
            letterSpacing: '0.26em',
            marginBottom:  4,
          }}
        >
          {duration}
        </span>
        <span
          className="font-display block"
          style={{
            color:         '#15130f',
            fontSize:      17,
            fontWeight:    600,
            letterSpacing: '-0.014em',
            fontVariationSettings: "'opsz' 24, 'SOFT' 50",
          }}
        >
          {name}
          <span style={{ marginLeft: 6, color: tint }}>→</span>
        </span>
      </span>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MODES, type Mode } from '@/lib/modes';

const SPRING = [0.16, 1, 0.3, 1] as const;
const TILTS  = [-2.4, 3.2, -1.6, 2.6, -3.0, 1.8] as const;

/* ──────────────────────────────────────────────────────
   Mycelial mesh behind the grid (between cards)
────────────────────────────────────────────────────── */
function MycelialNetwork() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      style={{ zIndex: 0, mixBlendMode: 'multiply' }}
    >
      <path d="M 12 22 Q 33 12, 50 22 T 88 22" stroke="#4f4b46" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" opacity="0.16" />
      <path d="M 12 78 Q 33 86, 50 78 T 88 78" stroke="#4f4b46" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" opacity="0.16" />
      <path d="M 14 22 Q 6 50, 14 78" stroke="#4f4b46" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" opacity="0.14" />
      <path d="M 50 22 Q 52 50, 50 78" stroke="#4f4b46" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" opacity="0.14" />
      <path d="M 86 22 Q 94 50, 86 78" stroke="#4f4b46" strokeWidth="1" vectorEffect="non-scaling-stroke" fill="none" opacity="0.14" />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────
   Reusable building blocks
────────────────────────────────────────────────────── */
function Sparkle({
  x, y, size, color, opacity = 0.7, rotate = 0,
}: { x: number; y: number; size: number; color: string; opacity?: number; rotate?: number }) {
  const inner = size * 0.26;
  return (
    <g transform={`translate(${x}, ${y}) rotate(${rotate})`} fill={color} opacity={opacity}>
      <path
        d={`M 0 -${size} L ${inner} -${inner} L ${size} 0 L ${inner} ${inner} L 0 ${size} L -${inner} ${inner} L -${size} 0 L -${inner} -${inner} Z`}
      />
    </g>
  );
}

function GridPattern({ id, color, opacity = 0.16 }: { id: string; color: string; opacity?: number }) {
  return (
    <defs>
      <pattern id={id} width="22" height="22" patternUnits="userSpaceOnUse">
        <path d="M 22 0 L 0 0 0 22" fill="none" stroke={color} strokeWidth="0.6" opacity={opacity} />
      </pattern>
    </defs>
  );
}

/* ──────────────────────────────────────────────────────
   Per-mode decoration plates
────────────────────────────────────────────────────── */
function MinuteDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-minute" color={accent} opacity={0.16} />
      <rect width="400" height="300" fill="url(#grid-minute)" />

      {/* Bold red wedge — bottom-left */}
      <path d="M 0 150 L 130 100 L 130 220 L 0 250 Z" fill={rule} opacity="0.32" />

      {/* Radial tick marks — partial clock dial top-right */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i * 360) / 60 - 90;
        const isMajor = i % 5 === 0;
        const inner = isMajor ? 92 : 100;
        const outer = 108;
        const x1 = 320 + inner * Math.cos((angle * Math.PI) / 180);
        const y1 = 90  + inner * Math.sin((angle * Math.PI) / 180);
        const x2 = 320 + outer * Math.cos((angle * Math.PI) / 180);
        const y2 = 90  + outer * Math.sin((angle * Math.PI) / 180);
        return (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke={accent} strokeWidth={isMajor ? 2 : 1} opacity={isMajor ? 0.65 : 0.4}
            strokeLinecap="round" />
        );
      })}

      {/* Sparkles */}
      <Sparkle x={64}  y={64}  size={11} color={accent} opacity={0.75} />
      <Sparkle x={350} y={210} size={9}  color={rule}   opacity={0.7}  rotate={25} />
      <Sparkle x={70}  y={250} size={7}  color={rule}   opacity={0.6}  rotate={45} />
      <Sparkle x={245} y={280} size={6}  color={accent} opacity={0.55} />
    </svg>
  );
}

function DigestDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-digest" color={accent} opacity={0.16} />
      <rect width="400" height="300" fill="url(#grid-digest)" />

      {/* Big green arc — swoosh in upper-right */}
      <path d="M 230 -20 A 220 220 0 0 1 430 180 L 430 -20 Z" fill={rule} opacity="0.28" />

      {/* Small data nodes — constellation bottom-left */}
      <g fill={accent} opacity="0.55">
        <circle cx="50"  cy="220" r="3.5" />
        <circle cx="90"  cy="245" r="2.5" />
        <circle cx="120" cy="210" r="3" />
        <circle cx="160" cy="240" r="2.5" />
        <line x1="50"  y1="220" x2="90"  y2="245" stroke={accent} strokeWidth="0.8" opacity="0.55" />
        <line x1="90"  y1="245" x2="120" y2="210" stroke={accent} strokeWidth="0.8" opacity="0.55" />
        <line x1="120" y1="210" x2="160" y2="240" stroke={accent} strokeWidth="0.8" opacity="0.55" />
      </g>

      {/* Sparkles */}
      <Sparkle x={55}  y={80}  size={11} color={rule}   opacity={0.75} />
      <Sparkle x={340} y={250} size={10} color={accent} opacity={0.65} rotate={20} />
      <Sparkle x={60}  y={260} size={6}  color={accent} opacity={0.55} rotate={45} />
      <Sparkle x={280} y={70}  size={7}  color={rule}   opacity={0.7} />
    </svg>
  );
}

function AllSidesDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-sides" color={accent} opacity={0.18} />
      <rect width="400" height="300" fill="url(#grid-sides)" />

      {/* Crosshair compass */}
      <line x1="200" y1="20"  x2="200" y2="280" stroke={rule} strokeWidth="1.2" opacity="0.35" strokeDasharray="3 6" />
      <line x1="20"  y1="150" x2="380" y2="150" stroke={rule} strokeWidth="1.2" opacity="0.35" strokeDasharray="3 6" />

      {/* Four perspective triangles — compass points */}
      <polygon points="195,30 205,30 200,18" fill="#2d5c8a" opacity="0.7" />
      <polygon points="370,145 370,155 382,150" fill="#c44a2e" opacity="0.7" />
      <polygon points="195,270 205,270 200,282" fill="#2e7c45" opacity="0.7" />
      <polygon points="30,145 30,155 18,150" fill="#8a6520" opacity="0.7" />

      {/* Inner ring */}
      <circle cx="200" cy="150" r="44" fill="none" stroke={accent} strokeWidth="1.4" opacity="0.4" />

      {/* Sparkles */}
      <Sparkle x={75}  y={75}  size={10} color={rule}   opacity={0.7} />
      <Sparkle x={325} y={75}  size={8}  color="#2d5c8a" opacity={0.7} rotate={20} />
      <Sparkle x={75}  y={235} size={8}  color="#c44a2e" opacity={0.7} rotate={45} />
      <Sparkle x={325} y={235} size={10} color="#8a6520" opacity={0.7} />
    </svg>
  );
}

function LongReadDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-lr" color={accent} opacity={0.14} />
      <rect width="400" height="300" fill="url(#grid-lr)" />

      {/* Editorial column ruled lines — left side */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1="22" y1={60 + i * 24} x2="125" y2={60 + i * 24}
          stroke={rule} strokeWidth="1.2" opacity="0.35" />
      ))}

      {/* Big blue arc — bottom-right swoosh */}
      <path d="M 430 320 A 220 220 0 0 1 230 320 Z" fill={rule} opacity="0.22" />

      {/* Pilcrow mark, big */}
      <text x="335" y="115" fontSize="56" fontWeight="700" fill={accent} opacity="0.4"
        fontFamily="serif" textAnchor="middle">¶</text>

      {/* Sparkles */}
      <Sparkle x={60}  y={250} size={10} color={accent} opacity={0.7} rotate={20} />
      <Sparkle x={345} y={245} size={7}  color={rule}   opacity={0.65} />
      <Sparkle x={195} y={50}  size={6}  color={rule}   opacity={0.6}  rotate={45} />
      <Sparkle x={280} y={270} size={8}  color={accent} opacity={0.65} />
    </svg>
  );
}

function LongViewDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-lv" color={accent} opacity={0.14} />
      <rect width="400" height="300" fill="url(#grid-lv)" />

      {/* Horizontal strata bands — geological time */}
      <rect x="0" y="40"  width="400" height="10" fill={rule}   opacity="0.22" />
      <rect x="0" y="62"  width="400" height="4"  fill={accent} opacity="0.18" />
      <rect x="0" y="240" width="400" height="6"  fill={rule}   opacity="0.2" />
      <rect x="0" y="258" width="400" height="12" fill={accent} opacity="0.18" />
      <rect x="0" y="280" width="400" height="3"  fill={rule}   opacity="0.22" />

      {/* Fibonacci spiral — bottom-right corner */}
      <path
        d="M 370 230 A 30 30 0 0 0 340 200 A 19 19 0 0 0 321 219 A 12 12 0 0 0 333 231 A 7 7 0 0 0 340 224"
        fill="none" stroke={accent} strokeWidth="2" opacity="0.5" strokeLinecap="round"
      />

      {/* Gold dust flakes */}
      <g fill={rule} opacity="0.6">
        <polygon points="60,72 66,75 64,82 56,79" />
        <polygon points="110,80 117,82 114,89 107,86" />
        <polygon points="320,68 326,71 323,78 316,75" />
        <polygon points="285,76 290,77 288,82 283,81" />
      </g>

      {/* Sparkles */}
      <Sparkle x={70}  y={250} size={10} color={accent} opacity={0.65} rotate={20} />
      <Sparkle x={350} y={120} size={7}  color={rule}   opacity={0.7} />
      <Sparkle x={250} y={290} size={6}  color={accent} opacity={0.55} rotate={45} />
    </svg>
  );
}

function QueueDecoration({ accent, rule }: { accent: string; rule: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full pointer-events-none">
      <GridPattern id="grid-q" color={accent} opacity={0.16} />
      <rect width="400" height="300" fill="url(#grid-q)" />

      {/* Outer dotted loop — auto-play */}
      <circle cx="200" cy="150" r="118" fill="none" stroke={accent} strokeWidth="2.5"
        strokeDasharray="3 8" opacity="0.38" />
      {/* Inner ring */}
      <circle cx="200" cy="150" r="80" fill="none" stroke={rule} strokeWidth="1.5" opacity="0.4" />
      {/* Sector wedge */}
      <path d="M 200 150 L 200 32 A 118 118 0 0 1 318 150 Z" fill={rule} opacity="0.16" />
      {/* Play triangle */}
      <g transform="translate(48, 220)">
        <polygon points="0,0 0,38 32,19" fill={accent} opacity="0.62" />
      </g>
      {/* Diagonal stripe */}
      <rect x="-20" y="270" width="180" height="6" fill={accent} opacity="0.35"
        transform="rotate(-8, 70, 273)" />

      {/* Sparkles */}
      <Sparkle x={60}  y={70}  size={12} color={accent} opacity={0.75} />
      <Sparkle x={342} y={62}  size={8}  color={rule}   opacity={0.7}  rotate={20} />
      <Sparkle x={350} y={240} size={11} color={accent} opacity={0.65} />
      <Sparkle x={210} y={275} size={6}  color={accent} opacity={0.55} rotate={45} />
      <Sparkle x={120} y={260} size={5}  color={rule}   opacity={0.6} />
    </svg>
  );
}

/* ──────────────────────────────────────────────────────
   Card illustration — decoration plate + cutout PNG
────────────────────────────────────────────────────── */
function CardIllustration({ mode, priority }: { mode: Mode; priority: boolean }) {
  const decoMap: Record<Mode['key'], (p: { accent: string; rule: string }) => React.JSX.Element> = {
    'minute':    MinuteDecoration,
    'digest':    DigestDecoration,
    'all-sides': AllSidesDecoration,
    'long-read': LongReadDecoration,
    'long-view': LongViewDecoration,
    'queue':     QueueDecoration,
  };
  const Decoration = decoMap[mode.key];

  return (
    <div className="relative w-full" style={{ aspectRatio: '4 / 3' }}>
      <Decoration accent={mode.accent} rule={mode.rule} />
      <div className="absolute inset-0 z-10 flex items-center justify-center p-4">
        <div className="relative w-full h-full">
          <Image
            src={mode.image}
            alt={`${mode.name} — illustration`}
            fill
            sizes="(max-width: 640px) 90vw, (max-width: 1024px) 46vw, 30vw"
            className="object-contain"
            style={{
              filter:
                'drop-shadow(0 14px 22px rgba(26,24,21,0.32)) drop-shadow(0 4px 6px rgba(26,24,21,0.22))',
            }}
            unoptimized
            priority={priority}
          />
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Section
────────────────────────────────────────────────────── */
export function ValueProps() {
  return (
    <section
      id="modes"
      className="px-6 md:px-10 pt-2 md:pt-6 pb-10 md:pb-14 bg-white"
    >
      <div className="mx-auto max-w-[1200px]">

        <div className="relative">
          <MycelialNetwork />

          <div
            className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12 md:gap-x-10 md:gap-y-14"
            style={{ zIndex: 1 }}
          >
            {MODES.map((mode, i) => (
              <motion.div
                key={mode.key}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.7, ease: SPRING, delay: i * 0.06 }}
                style={{ transform: `rotate(${TILTS[i]}deg)` }}
              >
                <Link
                  href={`#mode-${mode.key}`}
                  className="group block rounded-xl hover:-translate-y-1 transition-transform duration-300 h-full paper-grain overflow-hidden relative text-center"
                  style={{
                    background: mode.cardBg,
                    boxShadow:
                      '0 2px 4px rgba(26,24,21,0.06), 0 14px 28px rgba(26,24,21,0.1), 0 32px 64px rgba(26,24,21,0.08)',
                  }}
                >
                  <div className="relative pt-7 px-6 pb-4" style={{ zIndex: 2 }}>
                    <h3
                      className="font-display"
                      style={{
                        color:         mode.accent,
                        fontSize:      'clamp(1.875rem, 2.8vw, 2.5rem)',
                        fontWeight:    700,
                        lineHeight:    1.0,
                        letterSpacing: '-0.024em',
                        fontVariationSettings: "'opsz' 144, 'SOFT' 80",
                      }}
                    >
                      {mode.name}
                    </h3>
                    <p
                      className="font-sans mt-2"
                      style={{
                        color: mode.accent, opacity: 0.55,
                        fontSize: 11, fontWeight: 800, letterSpacing: '0.2em',
                      }}
                    >
                      {mode.shortTime.toUpperCase()}
                    </p>
                  </div>

                  <CardIllustration mode={mode} priority={i < 3} />

                  <div className="relative px-6 pt-4 pb-7" style={{ zIndex: 2 }}>
                    <p
                      className="font-display italic"
                      style={{
                        color: mode.accent,
                        fontSize: 'clamp(0.9375rem, 1.2vw, 1.0625rem)',
                        lineHeight: 1.35,
                        fontVariationSettings: "'opsz' 144, 'SOFT' 100",
                      }}
                    >
                      {mode.tagline}
                    </p>
                    <p
                      className="font-sans mt-4 inline-flex items-center gap-1.5 transition-transform duration-300 group-hover:translate-y-0.5"
                      style={{
                        color: mode.accent,
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                      }}
                    >
                      <span style={{ borderBottom: `1.5px solid ${mode.accent}` }}>
                        Jump down
                      </span>
                      <span aria-hidden>↓</span>
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}

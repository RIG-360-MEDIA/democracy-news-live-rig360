'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';

const SPRING = [0.16, 1, 0.3, 1] as const;

/* ═════════════════════════════════════════════════
   TODAY'S PUBLICATIONS — six modes, each with its
   plate, today's headline, accent colour, and route.
═════════════════════════════════════════════════ */
interface Publication {
  key:      string;
  name:     string;
  duration: string;
  topic:    string;
  headline: string;
  accent:   string;
  image:    string;
  href:     string;
}

const PUBLICATIONS: Publication[] = [
  {
    key:      'minute',
    name:     'Flash',
    duration: '60 SEC',
    topic:    'ECONOMY',
    headline: "India becomes world's third-largest economy.",
    accent:   '#a03a20',
    image:    '/newsstand/minute.png',
    href:     '/minute',
  },
  {
    key:      'digest',
    name:     'Newsletter',
    duration: '5 MIN',
    topic:    'MORNING',
    headline: 'Five stories that defined the night.',
    accent:   '#2e5e3e',
    image:    '/newsstand/digest.png',
    href:     '/digest',
  },
  {
    key:      'all-sides',
    name:     'All Sides',
    duration: '8 MIN',
    topic:    'POLITICS',
    headline: 'H-1B visa review extended to 90 days.',
    accent:   '#3a3633',
    image:    '/newsstand/all-sides.png',
    href:     '/all-sides',
  },
  {
    key:      'long-read',
    name:     'Worldwide',
    duration: '14 MIN',
    topic:    'MEDIA',
    headline: 'The slow death of local news.',
    accent:   '#264e78',
    image:    '/newsstand/long-read.png',
    href:     '/long-read',
  },
  {
    key:      'long-view',
    name:     'Aftermath',
    duration: '12 MIN',
    topic:    'TECHNOLOGY',
    headline: 'OpenAI boardroom crisis, three months later.',
    accent:   '#6a4c19',
    image:    '/newsstand/long-view.png',
    href:     '/long-view',
  },
  {
    key:      'queue',
    name:     'Pocket',
    duration: '∞',
    topic:    'PERSONAL',
    headline: '47 stories ready. Press play.',
    accent:   '#4d3a85',
    image:    '/newsstand/queue.png',
    href:     '/queue',
  },
];

/* ═════════════════════════════════════════════════
   CHALKBOARD — small slate sign at left end of rail
═════════════════════════════════════════════════ */
function Chalkboard() {
  const today = new Date();
  const day  = today.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dm   = `${today.getDate()} ${today.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}`;
  return (
    <div
      className="absolute z-20"
      style={{
        top: -22,
        left: 16,
        transform: 'rotate(-3deg)',
      }}
    >
      <div
        className="px-3 py-2 flex flex-col items-center"
        style={{
          background:   '#1a1815',
          border:       '3px solid #3d2b16',
          borderRadius: 2,
          boxShadow:    '0 6px 12px rgba(0,0,0,0.25), inset 0 0 8px rgba(255,255,255,0.04)',
          minWidth:     78,
        }}
      >
        <span
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#f5ecd9',
            fontSize:      9,
            letterSpacing: '0.18em',
            fontWeight:    700,
            opacity:       0.85,
          }}
        >
          TODAY
        </span>
        <span
          style={{
            fontFamily:    'var(--font-fraunces), Georgia, serif',
            color:         '#f5ecd9',
            fontSize:      15,
            fontWeight:    700,
            letterSpacing: '0.02em',
            marginTop:     1,
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}
        >
          {dm}
        </span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════
   PUBLICATION CARD — image + label + headline
   3D-feel: multi-layer drop-shadow casting back onto
   the cork shelf, slight tilt on hover, ground shadow.
═════════════════════════════════════════════════ */
/* PublicationOnShelf — image only, sits on the unified wood surface.
   Hover choreography:
     • card lifts ~26px and tilts forward (rotateX -6 → 0)
     • soft mode-coloured halo blooms behind it
     • ground shadow expands wider/softer + displaces (object now farther from shelf)
     • subtle top-light flare brightens the cover */
function PublicationOnShelf({ pub, index }: { pub: Publication; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: SPRING, delay: 0.3 + index * 0.08 }}
      className="flex flex-col items-center relative flex-1"
      style={{ minWidth: 190, maxWidth: 260 }}
    >
      <Link
        href={pub.href}
        className="group block relative"
        style={{
          width: '100%',
          aspectRatio: '2/3',
          perspective: '1400px',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* HALO — warm mode-coloured bloom that appears behind on hover */}
        <span
          aria-hidden
          className="absolute pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            inset: '-12%',
            background: `radial-gradient(ellipse 60% 50% at 50% 55%, ${pub.accent} 0%, ${pub.accent}66 35%, transparent 72%)`,
            filter:    'blur(28px)',
            transform: 'translateZ(-30px)',
            transition: 'opacity 520ms cubic-bezier(.16,1,.3,1)',
            zIndex: 0,
          }}
        />

        {/* GROUND SHADOW — animated: tight pool when at rest, wide soft pool when lifted */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
          style={{
            bottom: -2,
            width:  '55%',
            height: 12,
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 55%, transparent 92%)',
            filter: 'blur(3px)',
            transition: 'all 480ms cubic-bezier(.16,1,.3,1)',
            zIndex: 1,
          }}
        />
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            bottom: -10,
            width:  '78%',
            height: 22,
            background:
              'radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.20) 50%, transparent 92%)',
            filter: 'blur(9px)',
            transition: 'opacity 480ms cubic-bezier(.16,1,.3,1)',
            zIndex: 1,
          }}
        />

        <motion.div
          className="relative w-full h-full"
          initial={false}
          animate="rest"
          whileHover="hover"
          whileTap="tap"
          variants={{
            rest:  { rotateX: -6, y: 0,   scale: 1,    rotateY: 0  },
            hover: { rotateX: 0,  y: -26, scale: 1.10, rotateY: -3 },
            tap:   { rotateX: -2, y: -16, scale: 1.04, rotateY: -1 },
          }}
          transition={{ type: 'spring', stiffness: 240, damping: 22, mass: 0.9 }}
          style={{
            transformOrigin: 'bottom center',
            transformStyle:  'preserve-3d',
            zIndex: 2,
          }}
        >
          {/* Multiply blend kills any white PNG background into the dark wood. */}
          <div
            className="relative w-full h-full"
            style={{ mixBlendMode: 'multiply' }}
          >
            <Image
              src={pub.image}
              alt={`${pub.name} — today's edition`}
              fill
              sizes="(max-width: 768px) 50vw, 260px"
              className="object-contain object-bottom"
              unoptimized
              priority={index < 3}
            />
          </div>

          {/* Spotlight flare on the cover — only shows on hover, gives the
              impression of a stage light catching the picked-up object. */}
          <span
            aria-hidden
            className="absolute pointer-events-none opacity-0 group-hover:opacity-100"
            style={{
              inset: 0,
              background:
                'radial-gradient(ellipse 70% 45% at 50% 18%, rgba(255,238,200,0.30) 0%, transparent 60%)',
              mixBlendMode: 'screen',
              transition: 'opacity 420ms cubic-bezier(.16,1,.3,1)',
            }}
          />
        </motion.div>

        {/* Tiny accent dot at the foot — appears on hover, like a stage marker */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100"
          style={{
            bottom: -14,
            width:  4,
            height: 4,
            borderRadius: 999,
            background: pub.accent,
            boxShadow: `0 0 12px ${pub.accent}, 0 0 4px ${pub.accent}`,
            transition: 'opacity 360ms cubic-bezier(.16,1,.3,1) 80ms',
            zIndex: 3,
          }}
        />
      </Link>
    </motion.div>
  );
}

/* PublicationLabel — three-tier editorial signature below the shelf.
   Now also a click target with its own subtle hover lift. */
function PublicationLabel({ pub, index }: { pub: Publication; index: number }) {
  const num = String(index + 1).padStart(2, '0');
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: SPRING, delay: 0.55 + index * 0.05 }}
      className="flex-1 px-3"
      style={{ minWidth: 190, maxWidth: 260 }}
    >
      <Link
        href={pub.href}
        className="group/label flex flex-col items-center text-center transition-transform duration-500"
        style={{ transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)' }}
      >
        {/* Display numeral — Fraunces italic, mode-accent, oversize */}
        <span
          className="font-display italic transition-transform duration-500"
          style={{
            color:         pub.accent,
            fontSize:      30,
            fontWeight:    400,
            lineHeight:    1,
            letterSpacing: '-0.02em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            marginBottom:  6,
            transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
          }}
        >
          {num}
        </span>

        {/* Hairline accent rule — expands on hover */}
        <span
          aria-hidden
          className="block transition-all duration-500 group-hover/label:w-10 group-hover/label:opacity-100"
          style={{
            width:  20,
            height: 1,
            background: pub.accent,
            opacity: 0.55,
            marginBottom: 10,
            transitionTimingFunction: 'cubic-bezier(.16,1,.3,1)',
          }}
        />

        {/* Mode name — colour shifts to accent on hover */}
        <p
          className="font-display transition-colors duration-300 group-hover/label:[color:var(--accent)]"
          style={{
            color:         '#15130f',
            fontSize:      13,
            fontWeight:    600,
            letterSpacing: '0.18em',
            lineHeight:    1.1,
            textTransform: 'uppercase',
            fontVariationSettings: "'opsz' 14, 'SOFT' 50",
            marginBottom:  6,
            ['--accent' as string]: pub.accent,
          }}
        >
          {pub.name}
        </p>

        {/* Duration — minuscule mono tick, muted */}
        <p
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         '#a8a39c',
            fontSize:      8.5,
            fontWeight:    600,
            letterSpacing: '0.32em',
            marginBottom:  12,
          }}
        >
          {pub.duration}
        </p>

        {/* Headline — Jakarta Sans. */}
        <p
          className="transition-colors duration-300 group-hover/label:text-black"
          style={{
            fontFamily:    'var(--font-jakarta), sans-serif',
            color:         '#3a3633',
            fontSize:      13.5,
            fontWeight:    450,
            lineHeight:    1.42,
            letterSpacing: '-0.005em',
            textWrap:      'balance',
            maxWidth:      210,
          }}
        >
          {pub.headline}
        </p>

        {/* Arrow that slides in on hover — subtle "go read" signal */}
        <span
          aria-hidden
          className="mt-3 inline-flex items-center gap-1.5 opacity-0 group-hover/label:opacity-100 -translate-y-1 group-hover/label:translate-y-0 transition-all duration-300"
          style={{
            fontFamily:    'var(--font-mono), monospace',
            color:         pub.accent,
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.28em',
          }}
        >
          READ <span style={{ fontSize: 12 }}>→</span>
        </span>
      </Link>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════
   MAIN — TodayPage
═════════════════════════════════════════════════ */
export function TodayPage() {
  const today  = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  }).toUpperCase().replace(/,/g, ' ·');

  return (
    <div
      className="relative min-h-dvh"
      style={{
        background: '#fbf8f1',
        fontFamily: 'var(--font-jakarta), sans-serif',
      }}
    >
      {/* Paper grain across the canvas */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.05,
          mixBlendMode: 'multiply',
        }}
      />

      {/* ── Top bar ───────────────────────────────── */}
      <header
        className="relative z-10 px-6 md:px-10 lg:px-14 py-5 md:py-6 flex items-center justify-between"
        style={{ borderBottom: '1px solid #d8d3cc' }}
      >
        <Wordmark size="md" />
        <div
          className="hidden sm:flex items-center gap-2.5"
          style={{
            fontFamily:    'var(--font-mono), monospace',
            fontSize:      10.5,
            letterSpacing: '0.22em',
            color:         '#7a756e',
          }}
        >
          <span
            className="block w-1.5 h-1.5 rounded-full"
            style={{ background: '#c44a2e' }}
          />
          <span>{dateStr} · NO. 847</span>
        </div>
      </header>

      {/* ── Greeting band ───────────────────────────── */}
      <section className="relative z-10 px-6 py-12 md:py-16 text-center">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-center gap-3 mb-5"
          style={{
            fontFamily:    'var(--font-mono), monospace',
            fontSize:      11,
            fontWeight:    700,
            letterSpacing: '0.26em',
            color:         '#7a756e',
          }}
        >
          <span aria-hidden style={{ display: 'inline-block', width: 22, height: 1.5, background: '#c44a2e' }} />
          TODAY&rsquo;S EDITION
          <span aria-hidden style={{ display: 'inline-block', width: 22, height: 1.5, background: '#c44a2e' }} />
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: SPRING }}
          className="font-display mb-3"
          style={{
            color:         '#0f0e0c',
            fontSize:      'clamp(2.75rem, 6.5vw, 5rem)',
            fontWeight:    600,
            lineHeight:    1.0,
            letterSpacing: '-0.03em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 50",
          }}
        >
          Good morning.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="font-display italic"
          style={{
            color:         '#5d4a9a',
            fontSize:      'clamp(1.125rem, 1.7vw, 1.5rem)',
            fontWeight:    400,
            letterSpacing: '-0.012em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 100",
          }}
        >
          Pick where you start today.
        </motion.p>
      </section>

      {/* ── The Newsstand ───────────────────────────── */}
      <section className="relative z-10 px-4 md:px-10 lg:px-14 pb-10 md:pb-16">
        <div
          className="mx-auto max-w-[1400px]"
          style={{ perspective: '1600px', perspectiveOrigin: '50% 0%' }}
        >
          {/* Stage spotlight — radial gradient highlighting the shelf area */}
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 90% 70% at 50% 40%, rgba(255,230,180,0.18) 0%, transparent 70%)',
              transform: 'translateY(-40px)',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: SPRING, delay: 0.15 }}
            className="relative"
            style={{
              transformStyle: 'preserve-3d',
              transform:      'rotateX(7deg)',
            }}
          >

            {/* ── OUTER WOODEN FRAME — gives the box real thickness ── */}
            <div
              className="relative"
              style={{
                background:
                  'linear-gradient(180deg, #7a5430 0%, #5a3b1d 8%, #4a2f15 18%, #3a2510 92%, #2a1a0a 100%)',
                padding:      '0 16px 0 16px',
                borderRadius: 6,
                /* outer shadow — sits on the cream wall behind */
                boxShadow:
                  '0 36px 70px -8px rgba(58,30,8,0.45), 0 18px 28px -10px rgba(58,30,8,0.28), 0 6px 10px -4px rgba(58,30,8,0.20), 0 1px 0 rgba(255,255,255,0.10) inset',
              }}
            >
              {/* ── WOOD GRAIN OVERLAY — subtle texture ── */}
              <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'%3E%3Cfilter id='w'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.012 0.4' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23w)'/%3E%3C/svg%3E")`,
                  opacity:      0.22,
                  mixBlendMode: 'multiply',
                  borderRadius: 6,
                }}
              />

              {/* ── TOP WOOD FACE — the upper edge of the box, catches light ── */}
              <div
                aria-hidden
                style={{
                  height: 10,
                  marginLeft:  -16,
                  marginRight: -16,
                  background:
                    'linear-gradient(180deg, #9a6e3e 0%, #7a5430 70%, #5a3b1d 100%)',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset',
                }}
              />

              {/* ── BRASS RAIL — dimensional, sits below the top wood ── */}
              <div
                className="relative"
                style={{
                  height:      16,
                  marginLeft:  -8,
                  marginRight: -8,
                  marginTop:   8,
                  marginBottom: 10,
                  background: `
                    linear-gradient(180deg,
                      #f4d68e 0%,
                      #e0b65a 12%,
                      #c19036 36%,
                      #a07526 64%,
                      #6a4612 92%,
                      #4a3008 100%)`,
                  borderRadius: 3,
                  boxShadow: `
                    0 2px 0 rgba(255,255,255,0.55) inset,
                    0 -2px 0 rgba(0,0,0,0.55) inset,
                    0 4px 8px rgba(0,0,0,0.35),
                    0 1px 2px rgba(255,255,255,0.18)
                  `,
                }}
              >
                <Chalkboard />
                {/* Brass rivets */}
                {[0.045, 0.955].map((pos) => (
                  <span
                    key={pos}
                    aria-hidden
                    className="absolute top-1/2 -translate-y-1/2 rounded-full"
                    style={{
                      left:  `${pos * 100}%`,
                      width: 6, height: 6,
                      background:
                        'radial-gradient(circle at 30% 30%, #fce8b0 10%, #c19036 55%, #4a3008 100%)',
                      boxShadow:
                        '0 1px 2px rgba(255,255,255,0.4) inset, 0 -1px 2px rgba(0,0,0,0.5) inset, 0 1px 2px rgba(0,0,0,0.5)',
                    }}
                  />
                ))}
                {/* Highlight strip — light reflection along the top edge */}
                <div
                  aria-hidden
                  className="absolute inset-x-0"
                  style={{
                    top: 2,
                    height: 1,
                    background: 'linear-gradient(90deg, transparent 4%, rgba(255,243,200,0.85) 50%, transparent 96%)',
                  }}
                />
              </div>

              {/* ── MUSEUM BACK PANEL — deep moss-green cloth wall, like a
                   vitrine in a small editorial archive. Warm items pop
                   against the cool back; brass rails frame the outside. */}
              <div
                className="relative"
                style={{
                  /* Forest-green gradient — Penguin Classics / library reading
                     room. Cool back wall against warm wooden frame outside. */
                  background:
                    'linear-gradient(180deg, #2d4034 0%, #1f2e26 35%, #14211a 72%, #0a140f 100%)',
                  padding: '44px 28px 36px 28px',
                  borderRadius: 3,
                  boxShadow: `
                    0 -2px 0 rgba(0,0,0,0.45) inset,
                    0 4px 10px rgba(0,0,0,0.38) inset,
                    0 12px 22px rgba(0,0,0,0.32) inset,
                    0 0 0 1px rgba(8,16,12,0.7) inset
                  `,
                }}
              >
                {/* Subtle linen-cloth texture — replaces wood grain.
                   Faint diagonal weave evokes the cloth-lined display case
                   of an archive room rather than the back of a shelf. */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Cfilter id='lin'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65 0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23lin)'/%3E%3C/svg%3E")`,
                    opacity: 0.07, mixBlendMode: 'overlay', borderRadius: 3,
                  }}
                />
                {/* SPOTLIGHT — warm cream wash from the brass rail above,
                   makes the items glow against the cool green back. */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(255,228,180,0.28) 0%, rgba(255,220,160,0.10) 35%, transparent 75%)',
                    borderRadius: 3,
                  }}
                />
                {/* VIGNETTE — corner darkening only, no centre artefact */}
                <div
                  aria-hidden
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(ellipse 120% 100% at 50% 50%, transparent 60%, rgba(0,0,0,0.42) 100%)',
                    borderRadius: 3,
                  }}
                />

                {/* PUBLICATIONS ROW — images only, evenly spaced */}
                <div
                  className="relative flex items-end justify-between gap-2"
                  style={{
                    /* No horizontal overflow — items fit exactly in the row.
                       No scrollbar artefact along the bottom-right edge. */
                    overflow: 'visible',
                  }}
                >
                  {PUBLICATIONS.map((pub, i) => (
                    <PublicationOnShelf key={pub.key} pub={pub} index={i} />
                  ))}
                </div>
              </div>

              {/* ── FRONT LIP / SHELF EDGE — protrudes toward viewer ── */}
              <div
                aria-hidden
                className="relative"
                style={{
                  height:      18,
                  marginTop:   8,
                  marginLeft:  -16,
                  marginRight: -16,
                  background: `
                    linear-gradient(180deg,
                      #6a4622 0%,
                      #4a2f15 20%,
                      #3a2510 50%,
                      #2a1808 100%)`,
                  borderRadius: '0 0 6px 6px',
                  /* Softer edge — front lip no longer flashes a cream line
                     where it meets the dark green back panel. */
                  boxShadow: `
                    0 1px 0 rgba(255,228,180,0.04) inset,
                    0 -1px 0 rgba(0,0,0,0.5) inset
                  `,
                }}
              >
                {/* Front-lip highlight — very faint brass catch */}
                <div
                  aria-hidden
                  className="absolute inset-x-0"
                  style={{
                    top: 0,
                    height: 1,
                    background: 'linear-gradient(90deg, transparent 10%, rgba(196,138,64,0.22) 50%, transparent 90%)',
                  }}
                />
                {/* Centred wood-grain mark, like a finger-pull hint */}
                <div
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: 6,
                    width: 60,
                    height: 5,
                    borderRadius: 3,
                    background: 'linear-gradient(180deg, #2a1808 0%, #1a0e02 100%)',
                    boxShadow: '0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.5) inset',
                  }}
                />
              </div>
            </div>

            {/* ── GROUND SHADOW — the whole shelf casts on the wall behind ── */}
            <div
              aria-hidden
              className="absolute pointer-events-none"
              style={{
                left:   '5%',
                right:  '5%',
                bottom: -32,
                height: 32,
                background:
                  'radial-gradient(ellipse at center, rgba(58,30,8,0.32) 0%, rgba(58,30,8,0.12) 50%, transparent 80%)',
                filter: 'blur(8px)',
                transform: 'translateZ(-10px)',
              }}
            />

          </motion.div>

          {/* ── LABEL STRIP — below the shelf, on cream, sleek editorial ── */}
          <div
            className="relative mt-12 md:mt-14 flex items-start justify-between gap-2"
            style={{ paddingLeft: 32, paddingRight: 32 }}
          >
            {PUBLICATIONS.map((pub, i) => (
              <PublicationLabel key={pub.key} pub={pub} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer caption ──────────────────────────── */}
      <footer
        className="relative z-10 px-6 md:px-10 lg:px-14 py-6 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderTop: '1px solid #d8d3cc' }}
      >
        <p
          style={{
            fontFamily:    'var(--font-mono), monospace',
            fontSize:      10.5,
            letterSpacing: '0.22em',
            color:         '#7a756e',
            fontWeight:    700,
          }}
        >
          CLICK ANY EDITION TO READ
        </p>
        <Link
          href="/queue"
          className="group inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ color: '#4d3a85' }}
        >
          <span
            className="inline-flex items-center justify-center rounded-full"
            style={{
              width:      26,
              height:     26,
              background: '#4d3a85',
              color:      '#ffffff',
              fontSize:   10,
            }}
          >
            ▶
          </span>
          <span
            className="font-display italic"
            style={{
              fontSize: 14,
              fontVariationSettings: "'opsz' 144, 'SOFT' 100",
            }}
          >
            or press play — The Queue takes over.
          </span>
        </Link>
      </footer>
    </div>
  );
}

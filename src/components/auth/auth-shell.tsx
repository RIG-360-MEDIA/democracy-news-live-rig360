'use client';

import { useState, useActionState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import { signupAction, type SignupState } from '@/app/(auth)/signup/actions';
import { signinAction, type SigninState } from '@/app/(auth)/signin/actions';

type AuthActionState = SignupState | SigninState;

const SPRING = [0.16, 1, 0.3, 1] as const;

type AuthVariant = 'signup' | 'signin';

interface VariantContent {
  kicker:        string;
  headline:      string;
  subhead:       string;
  submitLabel:   string;
  switchPrompt:  string;
  switchLabel:   string;
  switchHref:    string;
  successKicker: string;
  successHead:   string;
  successBody:   (email: string) => string;
}

const CONTENT: Record<AuthVariant, VariantContent> = {
  signup: {
    kicker:        'NEW READER',
    headline:      'Open an account.',
    subhead:       "Read at six lengths, from anywhere. One account works across web, email, and WhatsApp.",
    submitLabel:   'Create account',
    switchPrompt:  'Already a reader?',
    switchLabel:   'Sign in',
    switchHref:    '/signin',
    successKicker: 'ACCOUNT CREATED',
    successHead:   'You’re in.',
    successBody:   (email) => `Welcome to Rig Wire. Confirmation sent to ${email}.`,
  },
  signin: {
    kicker:        'RETURNING READER',
    headline:      'Sign in.',
    subhead:       'Continue where you left off. Your queue, your reading history, your preferences — all waiting.',
    submitLabel:   'Sign in',
    switchPrompt:  'New here?',
    switchLabel:   'Open an account',
    switchHref:    '/signup',
    successKicker: 'SIGNED IN',
    successHead:   'Back to today’s edition.',
    successBody:   () => 'Loading your queue.',
  },
};

/* ─────────────────────────────────────────────────
   Sky scene — drifting clouds carrying quotes
───────────────────────────────────────────────── */

/* Editorial fragments carried across the sky by each cloud.
   Short, sharp, brand-specific — each a passing signal. */
/* Each quote is a single mode of the app — a name + its promise.
   Short enough that the cloud SVG never clips them mid-drift. */
const SKY_QUOTES = [
  'Flash — sixty seconds.',
  'Newsletter — 7:30 a.m.',
  'All Sides — every angle.',
  'Worldwide — 14 minutes.',
  'Aftermath — 90 days on.',
  'Pocket — always playing.',
];

/* A single cloud with optional quote inside.
   Two-layer animation: drift horizontally (outer) +
   gentle vertical bob (inner) so motion feels organic
   rather than rail-bound. */
interface SkyCloudProps {
  top:       string;
  width:     number;
  duration:  number;     // horizontal drift seconds
  delay?:    number;     // negative offset so the loop starts mid-drift
  opacity?:  number;
  quote?:    string;
  bobDur?:   number;     // vertical bob seconds
  bobDelay?: number;
  shape?:    'puffy' | 'long';   // shape variant
}

/* Two cloud-shape variants for visual variety —
   puffy (cumulus) and long (stretched). */
const SHAPE_PUFFY = (
  <>
    <ellipse cx="100" cy="52" rx="62" ry="38" />
    <ellipse cx="65"  cy="58" rx="44" ry="30" />
    <ellipse cx="135" cy="58" rx="46" ry="30" />
    <ellipse cx="50"  cy="78" rx="40" ry="22" />
    <ellipse cx="100" cy="82" rx="50" ry="22" />
    <ellipse cx="150" cy="78" rx="38" ry="22" />
    <ellipse cx="170" cy="82" rx="24" ry="14" />
    <ellipse cx="30"  cy="82" rx="22" ry="14" />
    <ellipse cx="80"  cy="36" rx="22" ry="16" />
    <ellipse cx="120" cy="38" rx="20" ry="14" />
  </>
);

const SHAPE_LONG = (
  <>
    <ellipse cx="100" cy="55" rx="84" ry="26" />
    <ellipse cx="60"  cy="50" rx="42" ry="24" />
    <ellipse cx="140" cy="50" rx="44" ry="24" />
    <ellipse cx="100" cy="76" rx="70" ry="20" />
    <ellipse cx="30"  cy="62" rx="26" ry="16" />
    <ellipse cx="170" cy="62" rx="28" ry="16" />
    <ellipse cx="85"  cy="40" rx="26" ry="14" />
    <ellipse cx="125" cy="42" rx="22" ry="12" />
  </>
);

function SkyCloud({
  top,
  width,
  duration,
  delay     = 0,
  opacity   = 0.92,
  quote,
  bobDur    = 10,
  bobDelay  = 0,
  shape     = 'puffy',
}: SkyCloudProps) {
  const h        = width * 0.55;
  const fontSize = Math.min(36, Math.max(17, width / 12.5));
  const blur     = shape === 'long' ? 1.4 : 1.7;

  return (
    <div
      aria-hidden
      className="absolute"
      style={{
        top,
        left: 0,
        right: 0,
        animation: `cloud-drift ${duration}s linear infinite`,
        animationDelay: `${delay}s`,
        willChange: 'transform',
      }}
    >
      <div
        style={{
          display:        'inline-block',
          width,
          animation:      `cloud-bob ${bobDur}s ease-in-out infinite alternate`,
          animationDelay: `${bobDelay}s`,
          willChange:     'transform',
        }}
      >
        <div className="relative" style={{ width, height: h }}>
          {/* Cloud shape — dense ellipse stack with two variants and
              a warm-side highlight via overlaid gradient ellipse. */}
          <svg
            viewBox="0 0 200 110"
            width={width}
            height={h}
            style={{ display: 'block', opacity }}
          >
            <defs>
              <filter id={`cloud-blur-${width}-${delay}`} x="-15%" y="-20%" width="130%" height="140%">
                <feGaussianBlur stdDeviation={blur} />
              </filter>
              <radialGradient
                id={`cloud-grad-${width}-${delay}`}
                cx="0.72" cy="0.32" r="0.7"
              >
                <stop offset="0%"   stopColor="#fff6e8" />
                <stop offset="55%"  stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f1ecf6" />
              </radialGradient>
            </defs>

            <g
              fill={`url(#cloud-grad-${width}-${delay})`}
              filter={`url(#cloud-blur-${width}-${delay})`}
            >
              {shape === 'long' ? SHAPE_LONG : SHAPE_PUFFY}
            </g>
          </svg>

          {/* Quote — italic Fraunces, sized to cloud, kept inside the dense body */}
          {quote && (
            <p
              className="absolute flex items-center justify-center font-display italic text-center"
              style={{
                inset:   0,
                padding: `${h * 0.20}px ${width * 0.18}px ${h * 0.28}px`,
                color:           '#2a225e',
                fontSize,
                fontWeight:      500,
                lineHeight:      1.16,
                letterSpacing:   '-0.014em',
                fontVariationSettings: "'opsz' 144, 'SOFT' 100",
                textShadow:      '0 1px 12px rgba(255, 255, 255, 0.85)',
                textWrap:        'balance',
              }}
            >
              {quote}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorialScene() {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 82% 14%, rgba(255, 232, 196, 0.55) 0%, transparent 50%), radial-gradient(ellipse at 12% 88%, rgba(212, 196, 232, 0.4) 0%, transparent 55%), linear-gradient(180deg, #d2dae8 0%, #e6dff0 50%, #f2e8da 100%)',
      }}
    >
      {/* Paper grain — soft, painterly */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.07,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Drift + bob keyframes */}
      <style>{`
        @keyframes cloud-drift {
          from { transform: translateX(-34%); }
          to   { transform: translateX(134%); }
        }
        @keyframes cloud-bob {
          0%   { transform: translateY(0) scale(1) rotate(-0.3deg); }
          100% { transform: translateY(-12px) scale(1.012) rotate(0.3deg); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 0.92; }
        }
      `}</style>

      {/* Clouds — nine, layered for atmospheric depth.
          Foreground: large, opaque, carry quotes.
          Mid: medium, semi-opaque, carry quotes.
          Far back: small, soft, silent atmospheric fill.
          Two shape variants (puffy + long) for natural variety. */}

      {/* Foreground — large, quote-carrying */}
      <SkyCloud top="12%" width={460} duration={64} delay={-18} opacity={0.95}
        bobDur={12} bobDelay={0} quote={SKY_QUOTES[0]} shape="puffy" />
      <SkyCloud top="42%" width={540} duration={72} delay={-44} opacity={0.96}
        bobDur={14} bobDelay={2} quote={SKY_QUOTES[1]} shape="long"  />
      <SkyCloud top="72%" width={500} duration={68} delay={-12} opacity={0.94}
        bobDur={13} bobDelay={3} quote={SKY_QUOTES[2]} shape="puffy" />

      {/* Mid-distance — medium, quote-carrying */}
      <SkyCloud top="2%"  width={360} duration={56} delay={-50} opacity={0.82}
        bobDur={10} bobDelay={1} quote={SKY_QUOTES[3]} shape="long"  />
      <SkyCloud top="28%" width={340} duration={52} delay={-28} opacity={0.8}
        bobDur={9}  bobDelay={2} quote={SKY_QUOTES[4]} shape="puffy" />
      <SkyCloud top="58%" width={380} duration={58} delay={-36} opacity={0.86}
        bobDur={11} bobDelay={0} quote={SKY_QUOTES[5]} shape="long"  />

      {/* Far back — silent atmospheric fill */}
      <SkyCloud top="20%" width={220} duration={46} delay={-8}  opacity={0.5}
        bobDur={8}  bobDelay={1} shape="puffy" />
      <SkyCloud top="52%" width={200} duration={42} delay={-22} opacity={0.45}
        bobDur={7}  bobDelay={2} shape="long"  />
      <SkyCloud top="84%" width={240} duration={50} delay={-36} opacity={0.55}
        bobDur={9}  bobDelay={0} shape="puffy" />

      {/* ── CENTERPIECE — the actual product story.
            Sits above the clouds (z-20), guaranteed not to clip.
            Three lines stagger in; subtitle and mode list follow. ── */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 px-6 md:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: SPRING, delay: 0.35 }}
          className="font-display italic text-center text-[#2a225e]"
          style={{
            fontSize: 'clamp(2.5rem, 5.2vw, 4.75rem)',
            lineHeight: 0.96,
            letterSpacing: '-0.028em',
            fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            fontWeight: 500,
            textShadow: '0 2px 24px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.6)',
          }}
        >
          <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: SPRING, delay: 0.40 }} className="block">
            247 newsrooms.
          </motion.span>
          <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: SPRING, delay: 0.62 }} className="block">
            Six readings.
          </motion.span>
          <motion.span initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: SPRING, delay: 0.84 }} className="block">
            One reader.
          </motion.span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: SPRING, delay: 1.15 }}
          className="font-sans text-center mt-7 max-w-[480px]"
          style={{
            color: '#3a3633',
            fontSize: 'clamp(0.95rem, 1.1vw, 1.0625rem)',
            lineHeight: 1.55,
            textShadow: '0 1px 12px rgba(255,255,255,0.88)',
          }}
        >
          From a <em>sixty-second Flash</em> to a <em>fourteen-minute Worldwide</em>{' '}— pick your length, pick your voice, get on with your day.
        </motion.p>

        {/* Six mode names — animated in sequence */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.55 }}
          className="mt-7 flex items-center justify-center flex-wrap gap-x-3 gap-y-2"
        >
          {['Flash', 'Newsletter', 'All Sides', 'Worldwide', 'Aftermath', 'Pocket'].map((mode, i) => (
            <motion.span
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: SPRING, delay: 1.6 + i * 0.08 }}
              className="font-display italic"
              style={{
                color: '#2a225e',
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '-0.012em',
                fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
                textShadow: '0 1px 8px rgba(255,255,255,0.85)',
              }}
            >
              {mode}
              {i < 5 && <span aria-hidden style={{ marginLeft: 12, color: '#c44a2e', opacity: 0.7 }}>·</span>}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* ── Wordmark — top-left, anchored against the sky ── */}
      <div className="absolute top-10 left-10 z-10">
        <Wordmark size="md" />
      </div>

      {/* ── Editorial signature — bottom-left ──────── */}
      <div className="absolute bottom-10 left-10 z-10 flex items-baseline gap-2.5">
        <span
          aria-hidden
          className="block"
          style={{ width: 18, height: 1.5, background: '#c44a2e' }}
        />
        <p
          className="font-sans"
          style={{
            color:         '#2a225e',
            opacity:       0.6,
            fontSize:      10.5,
            fontWeight:    800,
            letterSpacing: '0.22em',
          }}
        >
          TODAY ON THE WIRE
        </p>
        <span
          className="ml-2 block w-1 h-1 rounded-full"
          style={{
            background: '#c44a2e',
            animation:  'shimmer 2.4s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────
   Eye icon for password show/hide
───────────────────────────────────────────────── */
function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────
   AuthShell — light, two-column, editorial
───────────────────────────────────────────────── */
interface AuthShellProps {
  variant: AuthVariant;
}

export function AuthShell({ variant }: AuthShellProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);

  // Wire to the server action matching this variant.
  // On success, signIn() inside the action redirects (the action never
  // returns), so we only reach `state.error` for failures.
  const action = variant === 'signup' ? signupAction : signinAction;
  const [state, formAction, isPending] = useActionState<AuthActionState, FormData>(
    action,
    null,
  );

  const c = CONTENT[variant];
  const errorMessage =
    state && 'ok' in state && state.ok === false ? state.error : null;

  return (
    <div
      className="min-h-dvh flex flex-col md:flex-row bg-white"
      style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}
    >

      {/* LEFT — sky scene */}
      <aside className="relative md:w-[60%] lg:w-[58%] min-h-[480px] md:min-h-dvh">
        <EditorialScene />
      </aside>

      {/* RIGHT — form */}
      <main className="relative flex-1 flex items-center justify-center px-6 py-14 md:py-20 md:px-12 lg:px-16">

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: SPRING }}
          className="w-full max-w-[420px]"
        >

          {(
            <>
              {/* Kicker */}
              <div className="flex items-center gap-3 mb-5">
                <span
                  className="block"
                  style={{ width: 22, height: 2, background: '#c44a2e' }}
                  aria-hidden
                />
                <p
                  style={{
                    color:         '#7a756e',
                    fontSize:      10.5,
                    fontWeight:    700,
                    letterSpacing: '0.22em',
                  }}
                >
                  {c.kicker}
                </p>
              </div>

              {/* Headline */}
              <h1
                className="font-display text-[#1a1815] mb-4"
                style={{
                  fontSize:      'clamp(2.25rem, 4.5vw, 3.25rem)',
                  fontWeight:    600,
                  lineHeight:    1.0,
                  letterSpacing: '-0.028em',
                  fontVariationSettings: "'opsz' 144, 'SOFT' 50",
                }}
              >
                {c.headline}
              </h1>

              <p
                className="text-[#4f4b46] mb-10"
                style={{ fontSize: 15, lineHeight: 1.55 }}
              >
                {c.subhead}
              </p>

              {/* Form */}
              <form action={formAction} className="space-y-5">

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-2"
                    style={{
                      color:         '#7a756e',
                      fontSize:      10.5,
                      fontWeight:    700,
                      letterSpacing: '0.18em',
                    }}
                  >
                    EMAIL ADDRESS
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    className="w-full h-12 px-4 bg-white text-[#1a1815] outline-none transition-all"
                    style={{
                      border:     '1px solid #d8d3cc',
                      fontSize:   15,
                      caretColor: '#c44a2e',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#1f234a';
                      e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(31, 35, 74, 0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#d8d3cc';
                      e.currentTarget.style.boxShadow   = 'none';
                    }}
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label
                      htmlFor="password"
                      style={{
                        color:         '#7a756e',
                        fontSize:      10.5,
                        fontWeight:    700,
                        letterSpacing: '0.18em',
                      }}
                    >
                      PASSWORD
                    </label>
                    {variant === 'signin' && (
                      <Link
                        href="/forgot-password"
                        className="text-[#1a1815] hover:text-[#0f1339] transition-colors"
                        style={{
                          fontSize:   12,
                          fontWeight: 600,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                      >
                        Forgot?
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPw ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder={variant === 'signup' ? 'At least 8 characters' : 'Your password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={variant === 'signup' ? 'new-password' : 'current-password'}
                      className="w-full h-12 pl-4 pr-12 bg-white text-[#1a1815] outline-none transition-all"
                      style={{
                        border:     '1px solid #d8d3cc',
                        fontSize:   15,
                        caretColor: '#c44a2e',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#1f234a';
                        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(31, 35, 74, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = '#d8d3cc';
                        e.currentTarget.style.boxShadow   = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-7 h-7 text-[#7a756e] hover:text-[#1a1815] transition-colors"
                    >
                      <EyeIcon open={showPw} />
                    </button>
                  </div>
                  {variant === 'signup' && (
                    <p
                      className="mt-2"
                      style={{ color: '#7a756e', fontSize: 11.5 }}
                    >
                      Use 8 or more characters with letters and numbers.
                    </p>
                  )}
                </div>

                {/* Error banner — shown when the server action returns ok: false */}
                {errorMessage && (
                  <div
                    role="alert"
                    aria-live="polite"
                    className="px-4 py-3 mt-1"
                    style={{
                      background:  '#fdf1ec',
                      border:      '1px solid #e8b8a8',
                      color:       '#7a2a18',
                      fontSize:    13,
                      lineHeight:  1.5,
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 bg-[#1f234a] text-white hover:bg-[#0f1339] transition-colors mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{
                    fontSize:      14,
                    fontWeight:    700,
                    letterSpacing: '0.01em',
                  }}
                >
                  {isPending
                    ? (variant === 'signup' ? 'Creating account…' : 'Signing in…')
                    : c.submitLabel}
                </button>

                {variant === 'signup' && (
                  <p
                    className="text-center mt-3"
                    style={{ color: '#7a756e', fontSize: 11.5, lineHeight: 1.5 }}
                  >
                    By creating an account, you agree to our{' '}
                    <Link href="/legal/terms" className="text-[#1a1815] underline underline-offset-2 hover:text-[#0f1339]">Terms</Link>
                    {' '}and{' '}
                    <Link href="/legal/privacy" className="text-[#1a1815] underline underline-offset-2 hover:text-[#0f1339]">Privacy Policy</Link>.
                  </p>
                )}
              </form>

              {/* Switch link */}
              <div
                className="mt-12 pt-6 flex items-baseline justify-between gap-4"
                style={{ borderTop: '1px solid #e8e5e0' }}
              >
                <span style={{ color: '#7a756e', fontSize: 13 }}>
                  {c.switchPrompt}
                </span>
                <Link
                  href={c.switchHref}
                  className="text-[#1a1815] hover:text-[#0f1339] transition-colors inline-flex items-center gap-1"
                  style={{ fontSize: 13, fontWeight: 700 }}
                >
                  {c.switchLabel} <span aria-hidden>→</span>
                </Link>
              </div>

              {/* Footer micro-meta */}
              <div
                className="mt-10 flex items-center gap-4"
                style={{
                  fontFamily:    'var(--font-mono), monospace',
                  fontSize:      10,
                  letterSpacing: '0.18em',
                  color:         '#9a9590',
                }}
              >
                <Link href="/legal/privacy" className="hover:text-[#1a1815] transition-colors">PRIVACY</Link>
                <span>·</span>
                <Link href="/legal/terms"   className="hover:text-[#1a1815] transition-colors">TERMS</Link>
                <span>·</span>
                <Link href="/contact"       className="hover:text-[#1a1815] transition-colors">CONTACT</Link>
              </div>
            </>
          )}
          {/* Success-state UI removed: on signIn() the server action redirects
              to /onboarding (signup) or /today (signin). We never render a
              success card here — redirect handles the visual transition. */}

        </motion.div>
      </main>

    </div>
  );
}

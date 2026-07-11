'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import {
  saveOnboardingProgress,
  completeOnboarding,
  type OnboardingProgress,
  type OnboardingFinal,
} from '@/app/onboarding/actions';

const SPRING = [0.16, 1, 0.3, 1] as const;

/* ═════════════════════════════════════════════════
   DATA — taxonomies + option catalogues
═════════════════════════════════════════════════ */

interface Topic { key: string; label: string; color: string; bg: string; }

const TOPICS: Topic[] = [
  { key: 'world',    label: 'World',     color: '#2d5c8a', bg: '#dce6f3' },
  { key: 'politics', label: 'Politics',  color: '#a03a20', bg: '#fce0d2' },
  { key: 'justice',  label: 'Justice',   color: '#4a5530', bg: '#dde3cc' },
  { key: 'defense',  label: 'Defense',   color: '#4a4f5c', bg: '#dde0e6' },
  { key: 'business', label: 'Business',  color: '#0f5b6e', bg: '#cde2e7' },
  { key: 'markets',  label: 'Markets',   color: '#2e5e3e', bg: '#d6e8dc' },
  { key: 'startups', label: 'Startups',  color: '#5a7c1a', bg: '#e0e8c8' },
  { key: 'crypto',   label: 'Crypto',    color: '#e07c25', bg: '#f8dec0' },
  { key: 'tech',     label: 'Tech',      color: '#3a3633', bg: '#ebe7e0' },
  { key: 'ai',       label: 'AI',        color: '#6b3cb5', bg: '#dcd2f0' },
  { key: 'science',  label: 'Science',   color: '#264e78', bg: '#d6e2f0' },
  { key: 'space',    label: 'Space',     color: '#1d4a3e', bg: '#cfdcd6' },
  { key: 'health',   label: 'Health',    color: '#9e2a4f', bg: '#f7d4dd' },
  { key: 'climate',  label: 'Climate',   color: '#2e7c45', bg: '#cae3d0' },
  { key: 'energy',   label: 'Energy',    color: '#a67918', bg: '#f3e3c2' },
  { key: 'education',label: 'Education', color: '#1a2c4a', bg: '#cfd5e0' },
  { key: 'housing',  label: 'Housing',   color: '#9a4825', bg: '#f0d6c4' },
  { key: 'cities',   label: 'Cities',    color: '#5a544c', bg: '#dcd8d2' },
  { key: 'travel',   label: 'Travel',    color: '#c46839', bg: '#f5dac6' },
  { key: 'food',     label: 'Food',      color: '#c25e1a', bg: '#f7d8be' },
  { key: 'culture',  label: 'Culture',   color: '#4d3a85', bg: '#e1d8f0' },
  { key: 'arts',     label: 'Arts',      color: '#8b1f56', bg: '#f0d0e0' },
  { key: 'film',     label: 'Film & TV', color: '#7a1f1f', bg: '#f0d0d0' },
  { key: 'music',    label: 'Music',     color: '#5147ae', bg: '#d4d0e8' },
  { key: 'books',    label: 'Books',     color: '#7a5a26', bg: '#e8dcc6' },
  { key: 'style',    label: 'Style',     color: '#b8456c', bg: '#f4d4dc' },
  { key: 'sport',    label: 'Sport',     color: '#6a4c19', bg: '#f4e2c0' },
  { key: 'opinion',  label: 'Opinion',   color: '#5c3a1f', bg: '#e8d8c8' },
];

type ReaderIntent = 'quick_morning' | 'deep_read' | 'breaking_only' | 'across_sides' | 'weekend_reader';
const READER_INTENTS: { key: ReaderIntent; label: string; detail: string }[] = [
  { key: 'quick_morning',  label: 'Quick scan in the morning',      detail: 'Newsletter + Flash, before the day starts.' },
  { key: 'deep_read',      label: 'One deep read with my coffee',   detail: 'Worldwide + the Long Read.' },
  { key: 'breaking_only',  label: 'Stay current on breaking news',  detail: 'Flash + push, when it matters.' },
  { key: 'across_sides',   label: 'Read across viewpoints',         detail: 'All Sides — the same story, six angles.' },
  { key: 'weekend_reader', label: 'Sunday-paper reader',            detail: 'Aftermath — the slow consequences.' },
];

type DeliveryWindow = 'morning' | 'lunch' | 'evening' | 'bedtime';
const DELIVERY_WINDOWS: { key: DeliveryWindow; label: string; detail: string }[] = [
  { key: 'morning', label: 'Morning',  detail: 'Before 9 am' },
  { key: 'lunch',   label: 'Lunch',    detail: 'Midday break' },
  { key: 'evening', label: 'Evening',  detail: 'After work' },
  { key: 'bedtime', label: 'Bedtime',  detail: 'Late, in bed' },
];

type DeliveryFreq = 'daily_only' | 'daily_plus_breaking' | 'breaking_only' | 'web_only';
const DELIVERY_FREQS: { key: DeliveryFreq; label: string; detail: string }[] = [
  { key: 'daily_only',           label: 'Daily edition only',     detail: "Once a day. No interruptions." },
  { key: 'daily_plus_breaking',  label: 'Daily + breaking',       detail: 'A push when something big happens.' },
  { key: 'breaking_only',        label: 'Just breaking news',     detail: "Don't email me; alert me when it matters." },
  { key: 'web_only',             label: "I'll come find it",      detail: 'Web only. No outbound from us.' },
];

type VoiceKey = 'wire' | 'newsroom' | 'magazine' | 'briefing' | 'voice';
const VOICES: { key: VoiceKey; label: string; tagline: string; sample: React.ReactNode }[] = [
  { key: 'wire', label: 'Wire', tagline: 'Terse, factual. Reuters, AP.',
    sample: <>Russia launched 47 drones at Ukraine&rsquo;s grid overnight. Three intercepted. Eight substations down. Repairs underway.</> },
  { key: 'newsroom', label: 'Newsroom', tagline: 'Clear and structured. BBC, Guardian.',
    sample: <>Russia launched a wave of drone strikes against Ukraine&rsquo;s energy infrastructure on Thursday, damaging multiple substations and triggering rolling blackouts across five eastern regions, officials said.</> },
  { key: 'magazine', label: 'Magazine', tagline: 'Literary, contextual. The Atlantic, New Yorker.',
    sample: <>It was the third blackout of the week. In Kharkiv, the lights flickered out at 4:12 a.m., and Iryna Petrenko reached, by now without thinking, for the candles in the drawer beside her bed.</> },
  { key: 'briefing', label: 'Briefing', tagline: 'Bullet points, scannable. Axios, Vox.',
    sample: <><strong>WHAT:</strong> Russia hit Ukraine&rsquo;s grid overnight.<br/><strong>NUMBERS:</strong> 47 drones, 3 intercepted, 8 substations down.<br/><strong>WHY IT MATTERS:</strong> Rolling blackouts in 5 regions.</> },
  { key: 'voice', label: 'Voice', tagline: 'Personal, conversational. Substack, blogs.',
    sample: <>Okay, this Russia-Ukraine grid story is escalating fast &mdash; and I want to walk through what we actually know, because some of the early reporting is overshooting the evidence.</> },
];

type IntentKey = 'better_habit' | 'less_doomscroll' | 'follow_stories' | 'no_slant' | 'curious';
const SIGNUP_INTENTS: { key: IntentKey; label: string; detail: string }[] = [
  { key: 'better_habit',    label: 'I want a better daily news habit',   detail: 'Less scrolling, more reading.' },
  { key: 'less_doomscroll', label: "I'm tired of doomscrolling",         detail: 'A bounded edition, not an infinite feed.' },
  { key: 'follow_stories',  label: 'I follow specific stories deeply',   detail: 'Threads, sources, context.' },
  { key: 'no_slant',        label: 'I want news without political slant',detail: 'All Sides built in.' },
  { key: 'curious',         label: 'Just curious — exploring',           detail: 'No commitment.' },
];

// Top regions for v1. Primary dropdown shows all; secondary is chip-grid.
const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },        { code: 'AU', name: 'Australia' },
  { code: 'IN', name: 'India' },         { code: 'PK', name: 'Pakistan' },
  { code: 'BD', name: 'Bangladesh' },    { code: 'LK', name: 'Sri Lanka' },
  { code: 'CN', name: 'China' },         { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },   { code: 'SG', name: 'Singapore' },
  { code: 'ID', name: 'Indonesia' },     { code: 'PH', name: 'Philippines' },
  { code: 'VN', name: 'Vietnam' },       { code: 'TH', name: 'Thailand' },
  { code: 'DE', name: 'Germany' },       { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },         { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },   { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },        { code: 'IE', name: 'Ireland' },
  { code: 'BR', name: 'Brazil' },        { code: 'MX', name: 'Mexico' },
  { code: 'AR', name: 'Argentina' },     { code: 'CL', name: 'Chile' },
  { code: 'ZA', name: 'South Africa' },  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },       { code: 'EG', name: 'Egypt' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'IL', name: 'Israel' },        { code: 'TR', name: 'Turkey' },
  { code: 'RU', name: 'Russia' },        { code: 'UA', name: 'Ukraine' },
];

const TOTAL_QUESTIONS = 8;

const KICKER_BY_STEP: Record<number, string> = {
  0: 'A LETTER FROM THE EDITOR',
  1: 'YOUR DESK',
  2: 'YOUR ROUTINE',
  3: 'YOUR HOUR',
  4: 'YOUR REACH',
  5: 'A TASTE TEST',
  6: 'YOUR ADDRESS',
  7: 'YOUR VOICE',
  8: 'YOUR REASON',
  9: "TODAY'S EDITION",
};

const BYLINE_BY_STEP: Record<number, string> = {
  0: 'By Rig Wire Editorial',
  1: 'Sections that surface first',
  2: 'How you want to use the paper',
  3: 'When the daily edition lands',
  4: 'How often we should reach you',
  5: 'Five real headlines, your pick',
  6: 'Where the wire reaches you',
  7: 'How you like your news written',
  8: 'Why you came to Rig Wire',
  9: 'Your reading is configured',
};

/* ═════════════════════════════════════════════════
   TYPES
═════════════════════════════════════════════════ */

interface SeedArticle {
  id: string;
  headline: string;
  dek: string;
  source_label: string;
  topic_key: string;
  length_bucket: 'flash' | 'worldwide';
  region_code: string;
  time_horizon: 'breaking' | 'aftermath' | 'evergreen';
  tone: string;
  body_excerpt: string | null;
}

interface InitialAnswers {
  topics: string[];
  reader_intents: string[];
  delivery_window: string | null;
  delivery_frequency: string | null;
  seed_picks: string[];
  seed_skipped: string[];
  primary_region: string | null;
  secondary_regions: string[];
  voice_preference: string | null;
  signup_intent: string | null;
}

interface State {
  topics:             string[];
  reader_intents:     ReaderIntent[];
  delivery_window:    DeliveryWindow | null;
  delivery_frequency: DeliveryFreq | null;
  seed_picks:         string[];          // 5 of 12
  primary_region:     string | null;
  secondary_regions:  string[];
  voice_preference:   VoiceKey | null;
  signup_intent:      IntentKey | null;
}

const EMPTY_STATE: State = {
  topics: [], reader_intents: [],
  delivery_window: null, delivery_frequency: null,
  seed_picks: [],
  primary_region: null, secondary_regions: [],
  voice_preference: null, signup_intent: null,
};

interface Props {
  seedArticles:   SeedArticle[];
  initialAnswers: InitialAnswers | null;
}

/* ═════════════════════════════════════════════════
   MASTHEAD
═════════════════════════════════════════════════ */
function Masthead() {
  return (
    <header className="border-b" style={{ borderColor: '#1a1815' }}>
      <div className="mx-auto max-w-[820px] px-6 md:px-10">
        <div className="flex items-center justify-center py-6">
          <Wordmark size="lg" />
        </div>
        <div
          className="py-2 text-center"
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10, letterSpacing: '0.3em',
            color: '#7a756e', borderTop: '1px solid #d8d3cc',
          }}
        >
          INDEPENDENT WIRE SERVICE · EST. 2025
        </div>
      </div>
    </header>
  );
}

function ProgressBar({ step }: { step: number }) {
  const pct = step === 0 ? 0 : step > TOTAL_QUESTIONS ? 100 : (step / TOTAL_QUESTIONS) * 100;
  return (
    <div className="relative" style={{ height: 2, background: '#f0ede8' }}>
      <motion.div
        className="absolute top-0 left-0 h-full"
        style={{ background: '#c44a2e' }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: SPRING }}
      />
    </div>
  );
}

/* ═════════════════════════════════════════════════
   ARTICLE WRAPPER — split (left text / right options) or center
═════════════════════════════════════════════════ */
function Article({
  step, headline, body, children, layout = 'split',
}: {
  step: number;
  headline: React.ReactNode;
  body?: React.ReactNode;
  children: React.ReactNode;
  layout?: 'split' | 'center';
}) {
  const Kicker = (
    <div className={`flex items-baseline ${layout === 'center' ? 'justify-center' : ''} mb-7`}>
      <span aria-hidden style={{ display: 'inline-block', width: 22, height: 1.5, background: '#c44a2e', marginRight: 14 }} />
      <p style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 700, letterSpacing: '0.26em', color: '#1a1815' }}>
        {KICKER_BY_STEP[step]}
      </p>
    </div>
  );

  const Headline = (
    <h1
      className={`font-display ${layout === 'center' ? 'text-center' : ''} mb-4`}
      style={{
        color: '#0f0e0c',
        fontSize: layout === 'center' ? 'clamp(2.5rem, 6vw, 4.5rem)' : 'clamp(2rem, 3.6vw, 3rem)',
        fontWeight: 600, lineHeight: 1.02, letterSpacing: '-0.026em',
        fontVariationSettings: "'opsz' 144, 'SOFT' 30",
        textWrap: 'balance' as 'balance',
      }}
    >
      {headline}
    </h1>
  );

  const Byline = (
    <p className={`${layout === 'center' ? 'text-center' : ''} mb-3 italic`}
      style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: '#7a756e', fontSize: 14, fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
      {BYLINE_BY_STEP[step]}
    </p>
  );

  const Rule = (
    <div className={`${layout === 'center' ? 'flex justify-center' : ''} mb-7`}>
      <span style={{ display: 'block', width: 40, height: 1, background: '#d8d3cc' }} />
    </div>
  );

  const Body = body && (
    <p className={`${layout === 'center' ? 'text-center mx-auto' : ''} mb-2`}
      style={{ fontFamily: 'var(--font-jakarta), sans-serif', color: '#4f4b46', fontSize: 15.5, lineHeight: 1.65, maxWidth: layout === 'center' ? 520 : undefined }}>
      {body}
    </p>
  );

  if (layout === 'center') {
    return (
      <article className="mx-auto max-w-[1080px] px-6 md:px-10 py-14 md:py-20">
        {Kicker}{Headline}{Byline}{Rule}
        {Body && <div className="mb-10">{Body}</div>}
        <div>{children}</div>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-[1180px] px-6 md:px-10 lg:px-14 py-14 md:py-20">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-12 lg:gap-20 items-start">
        <div className="max-w-[480px] lg:sticky lg:top-12">
          {Kicker}{Headline}{Byline}{Rule}{Body}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </article>
  );
}

/* ═════════════════════════════════════════════════
   ANSWER ELEMENTS
═════════════════════════════════════════════════ */

function TopicChip({ topic, selected, onClick }: { topic: Topic; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.95 }}
      whileHover={selected ? {} : { y: -1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className="inline-flex items-center gap-2.5 px-4 py-3 transition-all relative"
      style={{
        background: selected ? topic.color : '#ffffff',
        color: selected ? '#ffffff' : topic.color,
        border: `1.5px solid ${selected ? topic.color : topic.color + '40'}`,
        fontFamily: 'var(--font-jakarta), sans-serif',
        fontSize: 14, fontWeight: 700, letterSpacing: '-0.005em',
        boxShadow: selected ? `0 4px 12px ${topic.color}25` : 'none',
      }}
    >
      <span aria-hidden className="block rounded-full flex-shrink-0"
        style={{ width: 7, height: 7, background: selected ? '#ffffff' : topic.color }} />
      {topic.label}
    </motion.button>
  );
}

function ChoiceRow({
  label, detail, selected, onClick, index,
}: { label: string; detail: string; selected: boolean; onClick: () => void; index: number }) {
  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.995 }}
      whileHover={selected ? {} : { x: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className="text-left transition-colors w-full flex items-center gap-5 px-5 py-4.5 group relative"
      style={{
        background: selected ? '#0f0e0c' : '#ffffff',
        color: selected ? '#ffffff' : '#1a1815',
        border: `1px solid ${selected ? '#0f0e0c' : '#d8d3cc'}`,
        paddingTop: 18, paddingBottom: 18,
      }}
    >
      <span className="flex-shrink-0"
        style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', fontWeight: 700, opacity: selected ? 0.55 : 0.4, width: 28 }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1">
        <p className="font-display"
          style={{ fontSize: 'clamp(1.0625rem, 1.5vw, 1.25rem)', fontWeight: 600, letterSpacing: '-0.014em', lineHeight: 1.15, fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          {label}
        </p>
        <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, opacity: selected ? 0.7 : 0.6, lineHeight: 1.4, marginTop: 2 }}>
          {detail}
        </p>
      </div>
      <span className="flex-shrink-0 inline-flex items-center justify-center transition-all"
        style={{ width: 22, height: 22, background: selected ? '#c44a2e' : 'transparent', border: `1.5px solid ${selected ? '#c44a2e' : '#d8d3cc'}`, borderRadius: '50%', color: '#ffffff', fontSize: 11, fontWeight: 800 }}
        aria-hidden>
        {selected ? '✓' : ''}
      </span>
    </motion.button>
  );
}

function SeedCard({ article, selected, onClick }: { article: SeedArticle; selected: boolean; onClick: () => void }) {
  const lengthLabel = article.length_bucket === 'flash' ? '60 SEC' : '14 MIN';
  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.985 }}
      whileHover={selected ? {} : { y: -2 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="text-left transition-all flex flex-col h-full"
      style={{
        background: selected ? '#0f0e0c' : '#ffffff',
        color: selected ? '#ffffff' : '#1a1815',
        border: `1px solid ${selected ? '#c44a2e' : '#d8d3cc'}`,
        padding: 22,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: selected ? '#f3e2d9' : '#a03a20' }}>
          {article.source_label.toUpperCase()}
        </span>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, opacity: 0.7 }}>
          {lengthLabel}
        </span>
      </div>
      <h3 className="font-display mb-2"
        style={{
          color: selected ? '#ffffff' : '#1a1815',
          fontSize: '1.0625rem', fontWeight: 600,
          lineHeight: 1.2, letterSpacing: '-0.012em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 40",
          textWrap: 'balance' as 'balance',
        }}>
        {article.headline}
      </h3>
      <p style={{
        fontFamily: 'var(--font-jakarta), sans-serif',
        fontSize: 13, lineHeight: 1.45,
        color: selected ? '#f3e2d9' : '#4f4b46',
        opacity: selected ? 0.92 : 0.75,
      }}>
        {article.dek}
      </p>
      <div className="mt-auto pt-4 flex items-center justify-end">
        <span className="inline-flex items-center justify-center"
          style={{ width: 22, height: 22, background: selected ? '#c44a2e' : 'transparent', border: `1.5px solid ${selected ? '#c44a2e' : '#d8d3cc'}`, borderRadius: '50%', color: '#ffffff', fontSize: 11, fontWeight: 800 }}
          aria-hidden>
          {selected ? '✓' : ''}
        </span>
      </div>
    </motion.button>
  );
}

function VoiceCard({
  voice, selected, onClick, index,
}: { voice: typeof VOICES[number]; selected: boolean; onClick: () => void; index: number }) {
  return (
    <motion.button
      type="button" onClick={onClick}
      whileTap={{ scale: 0.995 }}
      whileHover={selected ? {} : { x: 4 }}
      transition={{ type: 'spring', stiffness: 400, damping: 24 }}
      className="text-left transition-colors w-full flex flex-col gap-3 px-6 py-5"
      style={{
        background: selected ? '#0f0e0c' : '#ffffff',
        color: selected ? '#ffffff' : '#1a1815',
        border: `1px solid ${selected ? '#0f0e0c' : '#d8d3cc'}`,
      }}
    >
      <div className="flex items-baseline gap-4">
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', fontWeight: 700, opacity: selected ? 0.55 : 0.4 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="font-display" style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.014em', fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}>
          {voice.label}
        </span>
        <span style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, opacity: selected ? 0.75 : 0.55 }}>
          {voice.tagline}
        </span>
        <span className="ml-auto inline-flex items-center justify-center"
          style={{ width: 22, height: 22, background: selected ? '#c44a2e' : 'transparent', border: `1.5px solid ${selected ? '#c44a2e' : '#d8d3cc'}`, borderRadius: '50%', color: '#ffffff', fontSize: 11, fontWeight: 800 }} aria-hidden>
          {selected ? '✓' : ''}
        </span>
      </div>
      <p className="italic"
        style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif',
          fontSize: 14.5, lineHeight: 1.55,
          color: selected ? '#f3e2d9' : '#4f4b46',
          fontVariationSettings: "'opsz' 96, 'SOFT' 80",
          borderLeft: `2px solid ${selected ? '#c44a2e' : '#d8d3cc'}`,
          paddingLeft: 14,
        }}>
        {voice.sample}
      </p>
    </motion.button>
  );
}

/* ═════════════════════════════════════════════════
   MAIN FLOW
═════════════════════════════════════════════════ */

export function OnboardingFlow({ seedArticles, initialAnswers }: Props) {
  const [step, setStep]     = useState(0);
  const [state, setState]   = useState<State>(() => hydrateState(initialAnswers));
  const [isPending, startTransition] = useTransition();
  const [error, setError]   = useState<string | null>(null);

  // Capture locale + timezone silently on mount.
  const [silents] = useState<{ locale: string; timezone: string }>(() => {
    if (typeof window === 'undefined') return { locale: 'en', timezone: 'UTC' };
    const locale = (navigator.language || 'en').slice(0, 20);
    let timezone = 'UTC';
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; }
    catch { /* leave default */ }
    return { locale, timezone };
  });

  // Default primary region from browser locale (e.g. 'en-GB' → 'GB').
  useEffect(() => {
    if (state.primary_region) return;
    const parts = silents.locale.split('-');
    const code = parts[1]?.toUpperCase();
    if (code && COUNTRIES.some((c) => c.code === code)) {
      setState((s) => ({ ...s, primary_region: code }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canContinue = useMemo(() => stepIsComplete(step, state), [step, state]);

  const saveAndAdvance = () => {
    setError(null);
    startTransition(async () => {
      const payload = buildProgressPayload(step, state, silents);
      const res = await saveOnboardingProgress(payload);
      if (!('ok' in res) || !res.ok) {
        setError(('error' in res && res.error) || 'Could not save progress.');
        return;
      }
      setStep((s) => s + 1);
    });
  };

  const submitComplete = () => {
    setError(null);
    const seedSkipped = seedArticles.map((a) => a.id).filter((id) => !state.seed_picks.includes(id));
    const final: OnboardingFinal = {
      topics:             state.topics,
      reader_intents:     state.reader_intents,
      delivery_window:    state.delivery_window!,
      delivery_frequency: state.delivery_frequency!,
      seed_picks:         state.seed_picks,
      seed_skipped:       seedSkipped,
      primary_region:     state.primary_region!,
      secondary_regions:  state.secondary_regions,
      voice_preference:   state.voice_preference!,
      signup_intent:      state.signup_intent!,
      locale:             silents.locale,
      timezone:           silents.timezone,
    };
    startTransition(async () => {
      const res = await completeOnboarding(final);
      // completeOnboarding redirects on success; if we reach here, it failed.
      if (res && 'error' in res) setError(res.error);
    });
  };

  return (
    <div className="min-h-screen" style={{ background: '#fdfaf5' }}>
      <Masthead />
      <ProgressBar step={step} />

      <main className="relative overflow-hidden">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: SPRING }}
        >
            {/* STEP 0 — splash */}
            {step === 0 && (
              <Article
                step={0} layout="center"
                headline={<>Welcome to <em style={{ fontStyle: 'italic' }}>Rig Wire.</em></>}
                body={<>A brief letter from the editor before we begin. Eight quick answers to set up your reading — which sections appear first, when we deliver, and how it should read.</>}
              >
                <div className="flex justify-center">
                  <button type="button" onClick={() => setStep(1)}
                    className="inline-flex items-center gap-3 h-13 px-8 py-3.5 bg-[#1f234a] text-white font-sans font-bold hover:bg-[#0f1339] transition-colors"
                    style={{ fontSize: 14, letterSpacing: '0.01em' }}>
                    <span>Begin</span><span aria-hidden>→</span>
                  </button>
                </div>
              </Article>
            )}

            {/* STEP 1 — Q1 topics */}
            {step === 1 && (
              <Article step={1}
                headline={<>The sections you want to <em style={{ fontStyle: 'italic' }}>read first.</em></>}
                body={<>Pick three to eight. These bubble to the top of every edition. You can always change this later.</>}
              >
                <div>
                  <p style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: '#7a756e', marginBottom: 16 }}>
                    {state.topics.length === 0 ? 'PICK 3 OR MORE' : `${state.topics.length} SELECTED`}
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {TOPICS.map((t) => (
                      <TopicChip key={t.key} topic={t}
                        selected={state.topics.includes(t.key)}
                        onClick={() => setState((s) => ({
                          ...s,
                          topics: s.topics.includes(t.key)
                            ? s.topics.filter((k) => k !== t.key)
                            : (s.topics.length < 8 ? [...s.topics, t.key] : s.topics),
                        }))}
                      />
                    ))}
                  </div>
                </div>
              </Article>
            )}

            {/* STEP 2 — Q2 reader intents */}
            {step === 2 && (
              <Article step={2}
                headline={<>How you want to <em style={{ fontStyle: 'italic' }}>use the paper.</em></>}
                body={<>Pick anything that sounds like you. We use this to choose which of the six modes to surface first.</>}
              >
                <div className="flex flex-col gap-3">
                  {READER_INTENTS.map((r, i) => (
                    <ChoiceRow key={r.key} index={i} label={r.label} detail={r.detail}
                      selected={state.reader_intents.includes(r.key)}
                      onClick={() => setState((s) => ({
                        ...s,
                        reader_intents: s.reader_intents.includes(r.key)
                          ? s.reader_intents.filter((k) => k !== r.key)
                          : [...s.reader_intents, r.key],
                      }))}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 3 — Q3 delivery window */}
            {step === 3 && (
              <Article step={3}
                headline={<>When the <em style={{ fontStyle: 'italic' }}>edition lands.</em></>}
                body={<>The Newsletter and the daily Digest are scheduled to your time of day. Pick one.</>}
              >
                <div className="flex flex-col gap-3">
                  {DELIVERY_WINDOWS.map((w, i) => (
                    <ChoiceRow key={w.key} index={i} label={w.label} detail={w.detail}
                      selected={state.delivery_window === w.key}
                      onClick={() => setState((s) => ({ ...s, delivery_window: w.key }))}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 4 — Q4 delivery frequency */}
            {step === 4 && (
              <Article step={4}
                headline={<>How often we should <em style={{ fontStyle: 'italic' }}>reach you.</em></>}
                body={<>This controls every outbound channel. You can flip individual channels in settings later.</>}
              >
                <div className="flex flex-col gap-3">
                  {DELIVERY_FREQS.map((f, i) => (
                    <ChoiceRow key={f.key} index={i} label={f.label} detail={f.detail}
                      selected={state.delivery_frequency === f.key}
                      onClick={() => setState((s) => ({ ...s, delivery_frequency: f.key }))}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 5 — Q5 seed picks */}
            {step === 5 && (
              <Article step={5} layout="center"
                headline={<>Pick the five you would <em style={{ fontStyle: 'italic' }}>read first.</em></>}
                body={<>Twelve real headlines, all carefully chosen. Your picks teach the wire what to surface for you.</>}
              >
                <p className="text-center mb-8" style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: '#7a756e' }}>
                  {state.seed_picks.length} OF 5 SELECTED
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {seedArticles.map((a) => (
                    <SeedCard key={a.id} article={a}
                      selected={state.seed_picks.includes(a.id)}
                      onClick={() => setState((s) => {
                        const has = s.seed_picks.includes(a.id);
                        if (has) return { ...s, seed_picks: s.seed_picks.filter((id) => id !== a.id) };
                        if (s.seed_picks.length >= 5) return s;
                        return { ...s, seed_picks: [...s.seed_picks, a.id] };
                      })}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 6 — Q6 region */}
            {step === 6 && (
              <Article step={6}
                headline={<>Where the wire <em style={{ fontStyle: 'italic' }}>reaches you.</em></>}
                body={<>Where you read from anchors the All Sides spectrum and Worldwide curation. You can add more places to follow underneath.</>}
              >
                <div className="flex flex-col gap-7">
                  <div>
                    <p style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: '#7a756e', marginBottom: 10 }}>
                      WHERE YOU&apos;RE READING FROM
                    </p>
                    <select
                      value={state.primary_region ?? ''}
                      onChange={(e) => setState((s) => ({ ...s, primary_region: e.target.value || null }))}
                      className="w-full px-4 py-3"
                      style={{
                        fontFamily: 'var(--font-jakarta), sans-serif',
                        fontSize: 16, fontWeight: 600,
                        background: '#ffffff', color: '#1a1815',
                        border: '1px solid #d8d3cc',
                        appearance: 'none',
                      }}
                    >
                      <option value="">Choose a country…</option>
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <p style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: '#7a756e', marginBottom: 10 }}>
                      OTHER PLACES YOU FOLLOW (OPTIONAL)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRIES.filter((c) => c.code !== state.primary_region).slice(0, 24).map((c) => {
                        const on = state.secondary_regions.includes(c.code);
                        return (
                          <button key={c.code} type="button"
                            onClick={() => setState((s) => ({
                              ...s,
                              secondary_regions: on
                                ? s.secondary_regions.filter((k) => k !== c.code)
                                : [...s.secondary_regions, c.code],
                            }))}
                            className="px-3 py-2"
                            style={{
                              fontFamily: 'var(--font-jakarta), sans-serif',
                              fontSize: 13, fontWeight: 600,
                              background: on ? '#0f0e0c' : '#ffffff',
                              color: on ? '#ffffff' : '#1a1815',
                              border: `1px solid ${on ? '#0f0e0c' : '#d8d3cc'}`,
                            }}>
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </Article>
            )}

            {/* STEP 7 — Q7 voice preference */}
            {step === 7 && (
              <Article step={7} layout="center"
                headline={<>How you like your news <em style={{ fontStyle: 'italic' }}>written.</em></>}
                body={<>The same news story, five voices. Pick the one you&rsquo;d read.</>}
              >
                <div className="flex flex-col gap-3 max-w-[820px] mx-auto">
                  {VOICES.map((v, i) => (
                    <VoiceCard key={v.key} voice={v} index={i}
                      selected={state.voice_preference === v.key}
                      onClick={() => setState((s) => ({ ...s, voice_preference: v.key }))}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 8 — Q8 signup intent */}
            {step === 8 && (
              <Article step={8}
                headline={<>What <em style={{ fontStyle: 'italic' }}>brought you</em> here?</>}
                body={<>One question for us. It shapes what you see in week one — and nothing about the news.</>}
              >
                <div className="flex flex-col gap-3">
                  {SIGNUP_INTENTS.map((s, i) => (
                    <ChoiceRow key={s.key} index={i} label={s.label} detail={s.detail}
                      selected={state.signup_intent === s.key}
                      onClick={() => setState((st) => ({ ...st, signup_intent: s.key }))}
                    />
                  ))}
                </div>
              </Article>
            )}

            {/* STEP 9 — summary + complete */}
            {step === 9 && (
              <Article step={9} layout="center"
                headline={<>Your reading is <em style={{ fontStyle: 'italic' }}>configured.</em></>}
                body={<>We&rsquo;ll save this and take you to today&rsquo;s edition.</>}
              >
                <div className="max-w-[520px] mx-auto mb-10 flex flex-col gap-3">
                  {summaryRows(state, silents).map((row) => (
                    <div key={row.label} className="flex justify-between items-baseline pb-2.5"
                      style={{ borderBottom: '1px solid #ece8e0' }}>
                      <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, letterSpacing: '0.22em', color: '#7a756e' }}>
                        {row.label}
                      </span>
                      <span className="text-right" style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', color: '#1a1815', fontSize: 14.5, fontWeight: 500, letterSpacing: '-0.012em', fontVariationSettings: "'opsz' 144, 'SOFT' 60", maxWidth: 320 }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center">
                  <button type="button" onClick={submitComplete} disabled={isPending}
                    className="inline-flex items-center gap-3 h-12 px-8 py-3.5 bg-[#1f234a] text-white font-sans font-bold hover:bg-[#0f1339] transition-colors disabled:opacity-40"
                    style={{ fontSize: 14, letterSpacing: '0.01em' }}>
                    <span>{isPending ? 'Finalising…' : "Read today's edition"}</span><span aria-hidden>→</span>
                  </button>
                </div>
              </Article>
            )}
        </motion.div>
      </main>

      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-4 py-2.5 z-30"
          style={{ background: '#fdf1ec', border: '1px solid #e8b8a8', color: '#7a2a18',
                   fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Bottom footer — only on question pages */}
      {step > 0 && step <= TOTAL_QUESTIONS && (
        <footer className="relative z-10" style={{ borderTop: '1px solid #d8d3cc' }}>
          <div className="mx-auto max-w-[1180px] px-6 md:px-10 h-[72px] flex items-center justify-between">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="font-sans text-[13px] font-semibold text-[#7a756e] hover:text-[#1a1815] transition-colors inline-flex items-center gap-1.5">
              <span aria-hidden>←</span> Back
            </button>
            <button type="button" onClick={saveAndAdvance} disabled={!canContinue || isPending}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#1f234a] text-white font-sans text-[13px] font-bold hover:bg-[#0f1339] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ letterSpacing: '0.01em' }}>
              <span>{isPending ? 'Saving…' : 'Continue'}</span><span aria-hidden>→</span>
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════
   HELPERS
═════════════════════════════════════════════════ */

function hydrateState(initial: InitialAnswers | null): State {
  if (!initial) return EMPTY_STATE;
  return {
    topics:             initial.topics ?? [],
    reader_intents:     (initial.reader_intents ?? []).filter(isReaderIntent),
    delivery_window:    isDeliveryWindow(initial.delivery_window) ? initial.delivery_window : null,
    delivery_frequency: isDeliveryFreq(initial.delivery_frequency) ? initial.delivery_frequency : null,
    seed_picks:         initial.seed_picks ?? [],
    primary_region:     initial.primary_region,
    secondary_regions:  initial.secondary_regions ?? [],
    voice_preference:   isVoice(initial.voice_preference) ? initial.voice_preference : null,
    signup_intent:      isIntent(initial.signup_intent) ? initial.signup_intent : null,
  };
}

function isReaderIntent(x: unknown): x is ReaderIntent {
  return typeof x === 'string' && ['quick_morning','deep_read','breaking_only','across_sides','weekend_reader'].includes(x);
}
function isDeliveryWindow(x: unknown): x is DeliveryWindow {
  return typeof x === 'string' && ['morning','lunch','evening','bedtime'].includes(x);
}
function isDeliveryFreq(x: unknown): x is DeliveryFreq {
  return typeof x === 'string' && ['daily_only','daily_plus_breaking','breaking_only','web_only'].includes(x);
}
function isVoice(x: unknown): x is VoiceKey {
  return typeof x === 'string' && ['wire','newsroom','magazine','briefing','voice'].includes(x);
}
function isIntent(x: unknown): x is IntentKey {
  return typeof x === 'string' && ['better_habit','less_doomscroll','follow_stories','no_slant','curious'].includes(x);
}

function stepIsComplete(step: number, s: State): boolean {
  switch (step) {
    case 1: return s.topics.length >= 3;
    case 2: return s.reader_intents.length > 0;
    case 3: return s.delivery_window !== null;
    case 4: return s.delivery_frequency !== null;
    case 5: return s.seed_picks.length === 5;
    case 6: return s.primary_region !== null;
    case 7: return s.voice_preference !== null;
    case 8: return s.signup_intent !== null;
    default: return true;
  }
}

/** Build the partial payload to save after each step. */
function buildProgressPayload(
  step: number, s: State, silents: { locale: string; timezone: string },
): OnboardingProgress {
  const base = { locale: silents.locale, timezone: silents.timezone };
  switch (step) {
    case 1: return { ...base, topics: s.topics };
    case 2: return { ...base, reader_intents: s.reader_intents };
    case 3: return { ...base, delivery_window: s.delivery_window ?? undefined };
    case 4: return { ...base, delivery_frequency: s.delivery_frequency ?? undefined };
    case 5: return { ...base, seed_picks: s.seed_picks };
    case 6: return { ...base, primary_region: s.primary_region ?? undefined, secondary_regions: s.secondary_regions };
    case 7: return { ...base, voice_preference: s.voice_preference ?? undefined };
    case 8: return { ...base, signup_intent: s.signup_intent ?? undefined };
    default: return base;
  }
}

function summaryRows(s: State, silents: { locale: string; timezone: string }) {
  const topicLabels  = s.topics.map((k) => TOPICS.find((t) => t.key === k)?.label ?? k).join(', ');
  const intentLabels = s.reader_intents.map((k) => READER_INTENTS.find((r) => r.key === k)?.label ?? k).join(' · ');
  const win          = DELIVERY_WINDOWS.find((w) => w.key === s.delivery_window)?.label ?? '—';
  const freq         = DELIVERY_FREQS.find((f) => f.key === s.delivery_frequency)?.label ?? '—';
  const voice        = VOICES.find((v) => v.key === s.voice_preference)?.label ?? '—';
  const intent       = SIGNUP_INTENTS.find((i) => i.key === s.signup_intent)?.label ?? '—';
  const primary      = COUNTRIES.find((c) => c.code === s.primary_region)?.name ?? '—';
  const secondary    = s.secondary_regions
    .map((k) => COUNTRIES.find((c) => c.code === k)?.name ?? k)
    .join(', ');

  return [
    { label: 'TOPICS',     value: topicLabels || '—' },
    { label: 'READING',    value: intentLabels || '—' },
    { label: 'WHEN',       value: win },
    { label: 'CADENCE',    value: freq },
    { label: 'PICKS',      value: `${s.seed_picks.length} of 12` },
    { label: 'FROM',       value: primary },
    { label: 'ALSO',       value: secondary || '—' },
    { label: 'VOICE',      value: voice },
    { label: 'WHY',        value: intent },
    { label: 'TIME ZONE',  value: silents.timezone },
  ];
}

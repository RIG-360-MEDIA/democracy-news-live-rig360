'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Wordmark } from '@/components/brand/wordmark';
import {
  TOPICS, TOPIC_GROUPS, TONES, SLOTS,
  pickArchetype, storiesFor,
  type Tone, type Slot,
} from './digest-data';
import { GmailPreview } from './gmail-preview';

/* ═════════════════════════════════════════════════════════════════
   THE DIGEST — onboarding flow that builds a personalised reader
   identity, then previews the resulting newsletter inside a
   Gmail-style chrome. Cream editorial canvas, Fraunces serif.
═════════════════════════════════════════════════════════════════ */

const CREAM  = '#f7f1e1';
const PAPER  = '#efe6cf';
const INK    = '#15130f';
const SUB    = '#3a3633';
const MUTED  = '#7a756e';
const FAINT  = '#a8a39c';
const RULE   = '#dbcfac';
const ACCENT = '#2e5e3e';     /* The Digest's deep forest green */
const ACCENT2 = '#4d8a5a';
const SPRING = [0.16, 1, 0.3, 1] as const;

type Step = 'intro' | 'topics' | 'avoid' | 'tone' | 'time' | 'email' | 'result';

export function DigestPage() {
  const [step,       setStep]       = useState<Step>('intro');
  const [topics,     setTopics]     = useState<Set<string>>(new Set());
  const [avoid,      setAvoid]      = useState<Set<string>>(new Set());
  const [toneId,     setToneId]     = useState<string>('editor');
  const [slotId,     setSlotId]     = useState<string>('morning');
  const [name,       setName]       = useState<string>('');
  const [email,      setEmail]      = useState<string>('');

  const archetype = useMemo(() => pickArchetype(topics, toneId), [topics, toneId]);
  const stories   = useMemo(() => storiesFor(topics, 5), [topics]);
  const selectedTone = TONES.find((t) => t.id === toneId)!;
  const selectedSlot = SLOTS.find((s) => s.id === slotId)!;

  const STEPS: Step[] = ['intro', 'topics', 'avoid', 'tone', 'time', 'email', 'result'];
  const stepIdx = STEPS.indexOf(step);
  const progress = (stepIdx / (STEPS.length - 1)) * 100;

  function next() { setStep(STEPS[Math.min(stepIdx + 1, STEPS.length - 1)]); }
  function back() { setStep(STEPS[Math.max(stepIdx - 1, 0)]); }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  return (
    <div style={{
      background: CREAM, color: INK, minHeight: '100dvh',
      fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
      position: 'relative', overflow: 'hidden',
    }}>
      <PaperGrain />

      {/* Progress strip at the very top */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ height: 2, background: RULE }}>
        <motion.div
          animate={{ width: `${progress}%` }} transition={{ duration: 0.6, ease: SPRING }}
          style={{ height: '100%', background: ACCENT }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 px-5 md:px-10 lg:px-14 pt-6 pb-3 flex items-center justify-between">
        <Link href="/today" className="hover:opacity-80 transition-opacity"><Wordmark size="md" href={null} /></Link>
        <span style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif', fontStyle: 'italic',
          color: SUB, fontSize: 15, fontVariationSettings: "'opsz' 24, 'SOFT' 100",
        }}>
          Newsletter &middot; five stories, five minutes, yours
        </span>
        <Link href="/today" className="hover:opacity-75 transition-opacity inline-flex items-center gap-2" style={{
          fontFamily: 'var(--font-fraunces), Georgia, serif', fontStyle: 'italic',
          color: SUB, fontSize: 14,
        }}>
          Close <span style={{ fontSize: 16 }}>&times;</span>
        </Link>
      </header>

      <main className="relative z-10 px-5 md:px-10 lg:px-14 py-8 pb-24">
        <AnimatePresence mode="wait">
          {step === 'intro'   && <IntroStep   key="intro"   onStart={next} />}
          {step === 'topics'  && <TopicsStep  key="topics"  selected={topics} onToggle={(id) => toggle(topics, setTopics, id)} onNext={next} onBack={back} />}
          {step === 'avoid'   && <AvoidStep   key="avoid"   selected={avoid}  excluded={topics} onToggle={(id) => toggle(avoid, setAvoid, id)} onNext={next} onBack={back} />}
          {step === 'tone'    && <ToneStep    key="tone"    selectedId={toneId} onSelect={setToneId} onNext={next} onBack={back} />}
          {step === 'time'    && <TimeStep    key="time"    selectedId={slotId} onSelect={setSlotId} onNext={next} onBack={back} />}
          {step === 'email'   && <EmailStep   key="email"   name={name} email={email} onName={setName} onEmail={setEmail} onNext={next} onBack={back} />}
          {step === 'result'  && (
            <ResultStep
              key="result"
              archetype={archetype}
              topics={topics}
              avoid={avoid}
              tone={selectedTone}
              slot={selectedSlot}
              email={email || 'you@example.com'}
              name={name || 'Reader'}
              stories={stories}
              onRestart={() => setStep('intro')}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 0 — INTRO
═════════════════════════════════════════════════════════════════ */
function IntroStep({ onStart }: { onStart: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.6, ease: SPRING }}
      className="mx-auto grid lg:[grid-template-columns:1.2fr_1fr] gap-10 lg:gap-16 items-center pt-4 lg:pt-16" style={{ maxWidth: 1280 }}
    >
      <div>
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: ACCENT,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
          display: 'inline-block', borderBottom: `1px solid ${ACCENT}55`, paddingBottom: 4, marginBottom: 24,
        }}>Newsletter &middot; 5 min mode</span>
        <h1 className="font-display" style={{
          color: INK, fontSize: 'clamp(2.75rem, 6.5vw, 6rem)', fontWeight: 500, lineHeight: 0.96,
          letterSpacing: '-0.034em', fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
          fontStyle: 'italic', marginBottom: 24, textWrap: 'balance',
        }}>
          Build your morning.
        </h1>
        <p className="font-display" style={{
          color: SUB, fontSize: 'clamp(1.125rem, 1.5vw, 1.4rem)', lineHeight: 1.5,
          fontVariationSettings: "'opsz' 144, 'SOFT' 50", marginBottom: 32, maxWidth: 540,
        }}>
          Five stories. Five minutes. Read on the train, drunk with the coffee, finished before the inbox opens.
          Tell us what you read for, and we&rsquo;ll build the email.
        </p>
        <ul className="mb-10 space-y-3" style={{ color: SUB, fontSize: 15.5, lineHeight: 1.5 }}>
          {[
            'You pick the topics you read for, and the ones you’d rather skip.',
            'You pick the voice — Editor, Reporter, Critic, or Generalist.',
            'We send it to your inbox at the hour you choose, every morning.',
          ].map((line, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="font-display italic flex-shrink-0" style={{
                color: ACCENT, fontSize: 22, fontWeight: 500, lineHeight: 1,
                fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
              }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
        <button onClick={onStart} className="group inline-flex items-center gap-3 hover:gap-4 transition-all"
          style={{
            padding: '14px 28px', background: INK, color: CREAM, borderRadius: 999,
            fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, fontWeight: 800,
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
          Build my Digest <span style={{ fontSize: 16 }}>&rarr;</span>
        </button>
        <p className="mt-4 italic" style={{ color: MUTED, fontSize: 13 }}>
          90 seconds. Free. Unsubscribe in one click.
        </p>
      </div>

      <EnvelopePreview />
    </motion.section>
  );
}

/* Decorative envelope mock — gives the intro a visual anchor.
   The front envelope is a real layout element (sets the parent's
   height through its content); the back two are decorative offsets. */
function EnvelopePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, rotate: -1 }}
      animate={{ opacity: 1, y: 0,  rotate: -1.2 }}
      transition={{ duration: 0.8, ease: SPRING, delay: 0.15 }}
      className="relative mx-auto w-full"
      style={{ maxWidth: 420 }}
    >
      {/* Back-two decorative cards (absolute, sit behind the real front one).
          Hidden on small screens to keep the layout uncluttered. */}
      <div aria-hidden className="hidden sm:block absolute" style={{
        inset: 0, transform: 'translate(16px, 20px) rotate(3deg)',
        background: '#e6dfc1', border: `1px solid ${RULE}`, borderRadius: 6,
        boxShadow: '0 4px 12px -4px rgba(20,18,14,0.08)',
      }} />
      <div aria-hidden className="hidden sm:block absolute" style={{
        inset: 0, transform: 'translate(8px, 10px) rotate(1.5deg)',
        background: '#f3eccf', border: `1px solid ${RULE}`, borderRadius: 6,
        boxShadow: '0 4px 12px -4px rgba(20,18,14,0.08)',
      }} />

      {/* FRONT envelope — actual content, owns the height */}
      <div className="relative flex flex-col" style={{
        background: '#fffbed', border: `1px solid ${RULE}`, borderRadius: 6,
        padding: '24px 22px',
        boxShadow: '0 24px 50px -16px rgba(46,94,62,0.25), 0 8px 18px -6px rgba(20,18,14,0.10)',
        minHeight: 420,
      }}>
        <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${RULE}` }}>
          <div className="flex items-center gap-2.5">
            <span style={{
              width: 30, height: 30, background: ACCENT, color: '#fff',
              fontFamily: 'var(--font-fraunces), serif', fontSize: 16, fontWeight: 600, fontStyle: 'italic',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999,
            }}>D</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: INK }}>Newsletter</span>
          </div>
          <span style={{
            fontFamily: 'var(--font-mono), monospace', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.2em', color: MUTED,
          }}>SAT 23 MAY</span>
        </div>
        <p className="font-display italic" style={{
          color: INK, fontSize: 22, fontWeight: 500, lineHeight: 1.15, letterSpacing: '-0.022em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1", marginBottom: 16, textWrap: 'balance',
        }}>Your five things, this morning</p>
        <ul className="space-y-2.5 flex-1">
          {['India crosses Japan to become the world’s third-largest economy',
            'OpenAI loses landmark New York Times copyright case',
            'Arctic sea ice hits lowest May extent on record',
            'Apple unveils on-device AI search at WWDC',
            'Five things you might have missed yesterday'].map((t, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="font-display italic flex-shrink-0" style={{
                color: ACCENT, fontSize: 12, fontWeight: 700, marginTop: 1, minWidth: 18,
                fontVariationSettings: "'opsz' 24, 'SOFT' 100, 'WONK' 1",
              }}>0{i + 1}</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.4, color: SUB }}>{t}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 italic text-center" style={{
          color: MUTED, fontSize: 10.5, borderTop: `1px solid ${RULE}`, paddingTop: 10,
          fontFamily: 'var(--font-fraunces), serif', fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        }}>
          Rig Wire &middot; built for {'{your name}'}
        </p>
      </div>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 1 — TOPICS
═════════════════════════════════════════════════════════════════ */
function TopicsStep({ selected, onToggle, onNext, onBack }: {
  selected: Set<string>; onToggle: (id: string) => void; onNext: () => void; onBack: () => void;
}) {
  const groups = Object.keys(TOPIC_GROUPS) as Array<keyof typeof TOPIC_GROUPS>;
  return (
    <StepWrap onNext={onNext} onBack={onBack} canNext={selected.size >= 2}
      stepNumber="01" title="What do you read for?" pitch="Pick the topics that get five minutes of your morning. Two minimum, anywhere up to all sixteen."
      nextLabel={`Continue with ${selected.size} ${selected.size === 1 ? 'topic' : 'topics'}`}
    >
      {groups.map((g) => (
        <div key={g} className="mb-10">
          <div className="flex items-baseline gap-4 mb-4" style={{ borderBottom: `1px solid ${RULE}`, paddingBottom: 6 }}>
            <h3 className="font-display italic" style={{
              color: INK, fontSize: 'clamp(1.25rem, 1.7vw, 1.5rem)', fontWeight: 500, letterSpacing: '-0.018em',
              fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
            }}>{TOPIC_GROUPS[g].label}</h3>
            <span style={{ color: MUTED, fontSize: 13.5, fontStyle: 'italic',
              fontFamily: 'var(--font-fraunces), serif', fontVariationSettings: "'opsz' 14, 'SOFT' 100" }}>
              {TOPIC_GROUPS[g].tagline}
            </span>
          </div>
          <div className="grid gap-3 sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr_1fr]">
            {TOPICS.filter((t) => t.group === g).map((t) => (
              <TopicChip key={t.id} topic={t} selected={selected.has(t.id)} onClick={() => onToggle(t.id)} variant="want" />
            ))}
          </div>
        </div>
      ))}
    </StepWrap>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 2 — AVOID
═════════════════════════════════════════════════════════════════ */
function AvoidStep({ selected, excluded, onToggle, onNext, onBack }: {
  selected: Set<string>; excluded: Set<string>; onToggle: (id: string) => void; onNext: () => void; onBack: () => void;
}) {
  /* Don't show topics they already SELECTED in step 1 */
  const visible = TOPICS.filter((t) => !excluded.has(t.id));
  return (
    <StepWrap onNext={onNext} onBack={onBack} canNext={true}
      stepNumber="02" title="Anything you’d rather not see?" pitch="Optional. Pick the topics we’ll quietly leave out of your digest. Nothing wrong with skipping cricket."
      nextLabel={selected.size > 0 ? `Skip ${selected.size}, continue` : 'Skip nothing, continue'}
    >
      <div className="grid gap-3 sm:[grid-template-columns:1fr_1fr] lg:[grid-template-columns:1fr_1fr_1fr_1fr]">
        {visible.map((t) => (
          <TopicChip key={t.id} topic={t} selected={selected.has(t.id)} onClick={() => onToggle(t.id)} variant="avoid" />
        ))}
      </div>
    </StepWrap>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 3 — TONE
═════════════════════════════════════════════════════════════════ */
function ToneStep({ selectedId, onSelect, onNext, onBack }: {
  selectedId: string; onSelect: (id: string) => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <StepWrap onNext={onNext} onBack={onBack} canNext={true}
      stepNumber="03" title="Pick the voice." pitch="Four ways to write the same story. Choose the one you’d read first."
      nextLabel="That’s my voice"
    >
      <div className="grid gap-5 md:[grid-template-columns:1fr_1fr]">
        {TONES.map((t) => (
          <ToneCard key={t.id} tone={t} selected={selectedId === t.id} onClick={() => onSelect(t.id)} />
        ))}
      </div>
    </StepWrap>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 4 — TIME
═════════════════════════════════════════════════════════════════ */
function TimeStep({ selectedId, onSelect, onNext, onBack }: {
  selectedId: string; onSelect: (id: string) => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <StepWrap onNext={onNext} onBack={onBack} canNext={true}
      stepNumber="04" title="When should it arrive?" pitch="Pick a delivery slot. You can change it later from the email."
      nextLabel="Set delivery time"
    >
      <div className="grid gap-4 md:[grid-template-columns:1fr_1fr_1fr]">
        {SLOTS.map((s) => (
          <SlotCard key={s.id} slot={s} selected={selectedId === s.id} onClick={() => onSelect(s.id)} />
        ))}
      </div>
    </StepWrap>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 5 — EMAIL & NAME
═════════════════════════════════════════════════════════════════ */
function EmailStep({ name, email, onName, onEmail, onNext, onBack }: {
  name: string; email: string; onName: (s: string) => void; onEmail: (s: string) => void;
  onNext: () => void; onBack: () => void;
}) {
  const valid = email.includes('@') && email.includes('.');
  return (
    <StepWrap onNext={onNext} onBack={onBack} canNext={valid}
      stepNumber="05" title="Where should we send it?" pitch="Two things, then we’ll show you what it looks like in your inbox."
      nextLabel="See my Digest"
    >
      <div className="max-w-xl">
        <FormField label="What should we call you?" hint="Optional. Just for the greeting.">
          <input
            type="text" value={name} onChange={(e) => onName(e.target.value)}
            placeholder="Riya, Marcus, Anand…" autoComplete="given-name"
            style={inputStyle}
          />
        </FormField>
        <FormField label="Your email" hint="We won’t share it. Unsubscribe in one click from the footer of every email.">
          <input
            type="email" value={email} onChange={(e) => onEmail(e.target.value)}
            placeholder="you@example.com" autoComplete="email"
            style={inputStyle}
          />
        </FormField>
      </div>
    </StepWrap>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px',
  background: 'rgba(255,251,237,0.7)', border: `1px solid ${RULE}`,
  borderRadius: 6, fontSize: 17,
  fontFamily: 'var(--font-fraunces), serif', color: INK,
  fontStyle: 'italic', fontVariationSettings: "'opsz' 24, 'SOFT' 100",
};

function FormField({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <label className="block mb-2" style={{
        fontFamily: 'var(--font-mono), monospace', color: SUB,
        fontSize: 11, fontWeight: 800, letterSpacing: '0.20em', textTransform: 'uppercase',
      }}>{label}</label>
      {children}
      {hint && (
        <p className="mt-2 italic" style={{
          color: MUTED, fontSize: 13, lineHeight: 1.45,
          fontFamily: 'var(--font-fraunces), serif', fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        }}>
          {hint}
        </p>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   STEP 6 — RESULT (identity card + Gmail preview)
═════════════════════════════════════════════════════════════════ */
function ResultStep(props: {
  archetype: ReturnType<typeof pickArchetype>;
  topics: Set<string>; avoid: Set<string>; tone: Tone; slot: Slot;
  email: string; name: string;
  stories: ReturnType<typeof storiesFor>;
  onRestart: () => void;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.6, ease: SPRING }}
      className="mx-auto" style={{ maxWidth: 1280 }}
    >
      {/* Big italic banner */}
      <div className="text-center mb-12">
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: ACCENT,
          fontSize: 11, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
        }}>You are</span>
        <h1 className="font-display italic mt-3" style={{
          color: INK, fontSize: 'clamp(3rem, 7vw, 6rem)', fontWeight: 500, lineHeight: 0.96,
          letterSpacing: '-0.034em', fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>
          {props.archetype.name}
        </h1>
        <p className="font-display italic mt-3" style={{
          color: SUB, fontSize: 'clamp(1.125rem, 1.5vw, 1.4rem)', lineHeight: 1.5,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100", maxWidth: 680, margin: '12px auto 0',
        }}>
          {props.archetype.prose}
        </p>
      </div>

      {/* Identity card + Gmail preview side-by-side */}
      <div className="grid gap-8 lg:gap-12 lg:[grid-template-columns:1fr_1.6fr]">
        <IdentityCard {...props} />
        <GmailPreview
          name={props.name}
          email={props.email}
          archetypeName={props.archetype.name}
          toneLabel={props.tone.label}
          slot={props.slot}
          stories={props.stories}
        />
      </div>

      {/* Confirm + restart */}
      <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
        <button className="hover:opacity-90 transition-opacity" style={{
          padding: '14px 28px', background: ACCENT, color: '#fff', borderRadius: 999,
          fontFamily: 'var(--font-mono), monospace', fontSize: 12.5, fontWeight: 800,
          letterSpacing: '0.18em', textTransform: 'uppercase',
        }}>
          Confirm &amp; subscribe &rarr;
        </button>
        <button onClick={props.onRestart} className="hover:opacity-75 transition-opacity" style={{
          fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic',
          color: SUB, fontSize: 15, padding: '14px 12px',
          fontVariationSettings: "'opsz' 24, 'SOFT' 100",
        }}>
          &larr; Start over
        </button>
      </div>
    </motion.section>
  );
}

function IdentityCard({ archetype, topics, avoid, tone, slot, email, name }: {
  archetype: ReturnType<typeof pickArchetype>;
  topics: Set<string>; avoid: Set<string>; tone: Tone; slot: Slot; email: string; name: string;
}) {
  return (
    <article className="relative" style={{
      background: '#fffbed', border: `1px solid ${RULE}`, borderRadius: 6,
      padding: '32px 28px', boxShadow: '0 24px 50px -16px rgba(46,94,62,0.18), 0 8px 18px -6px rgba(20,18,14,0.08)',
    }}>
      {/* Stamp-style header */}
      <div className="flex items-baseline justify-between mb-5 pb-4" style={{ borderBottom: `1px solid ${RULE}` }}>
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: ACCENT,
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.32em', textTransform: 'uppercase',
        }}>Reader Identity Card</span>
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: MUTED,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.20em',
        }}>NO. {Math.floor(Math.random() * 9000 + 1000)}</span>
      </div>
      <h2 className="font-display italic" style={{
        color: INK, fontSize: 36, fontWeight: 500, lineHeight: 1.02, letterSpacing: '-0.022em',
        fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1", marginBottom: 6,
      }}>{archetype.name}</h2>
      <p style={{
        fontFamily: 'var(--font-mono), monospace', color: MUTED, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.20em', textTransform: 'uppercase', marginBottom: 22,
      }}>{archetype.subtitle}</p>

      <Row label="Reading for" value={Array.from(topics).map(id => TOPICS.find(t => t.id === id)?.label).filter(Boolean).join(' · ') || 'Everything'} />
      {avoid.size > 0 && (
        <Row label="Skipping" value={Array.from(avoid).map(id => TOPICS.find(t => t.id === id)?.label).filter(Boolean).join(' · ')} />
      )}
      <Row label="In the voice of" value={tone.label} />
      <Row label="Delivered at" value={`${slot.time} · ${slot.label.toLowerCase()}`} />
      <Row label="Sent to" value={email} mono />
      {name && <Row label="Addressed to" value={name} />}

      {/* Little italic footer line */}
      <p className="italic text-center mt-7 pt-5" style={{
        color: MUTED, fontSize: 13, lineHeight: 1.45,
        fontFamily: 'var(--font-fraunces), serif',
        fontVariationSettings: "'opsz' 14, 'SOFT' 100",
        borderTop: `1px solid ${RULE}`,
      }}>
        Your first Digest arrives tomorrow at {slot.time}.
      </p>
    </article>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 py-2.5" style={{ borderBottom: `1px solid ${RULE}66` }}>
      <span className="flex-shrink-0" style={{
        fontFamily: 'var(--font-mono), monospace', color: MUTED,
        fontSize: 9.5, fontWeight: 800, letterSpacing: '0.20em', textTransform: 'uppercase', minWidth: 120,
      }}>{label}</span>
      <span className="flex-1" style={{
        fontFamily: mono ? 'var(--font-mono), monospace' : 'var(--font-fraunces), serif',
        color: INK, fontSize: mono ? 13.5 : 16, lineHeight: 1.4,
        fontStyle: mono ? 'normal' : 'italic', fontWeight: mono ? 700 : 400,
        fontVariationSettings: mono ? undefined : "'opsz' 24, 'SOFT' 100",
      }}>{value}</span>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════
   SHARED — STEP WRAP, CHIPS, CARDS
═════════════════════════════════════════════════════════════════ */
function StepWrap({ children, stepNumber, title, pitch, onNext, onBack, canNext, nextLabel }: {
  children: React.ReactNode; stepNumber: string; title: string; pitch: string;
  onNext: () => void; onBack: () => void; canNext: boolean; nextLabel: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.5, ease: SPRING }}
      className="mx-auto" style={{ maxWidth: 1080 }}
    >
      <div className="flex items-baseline gap-5 mb-3">
        <span className="font-display italic" style={{
          color: ACCENT, fontSize: 'clamp(1.5rem, 2.4vw, 2rem)', fontWeight: 500, lineHeight: 1,
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>{stepNumber}</span>
        <h2 className="font-display" style={{
          color: INK, fontSize: 'clamp(1.75rem, 3.4vw, 2.875rem)', fontWeight: 500, lineHeight: 1.06,
          letterSpacing: '-0.026em', fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
          fontStyle: 'italic', textWrap: 'balance',
        }}>{title}</h2>
      </div>
      <p className="font-display italic mb-10" style={{
        color: SUB, fontSize: 'clamp(1rem, 1.25vw, 1.1875rem)', lineHeight: 1.5, maxWidth: 720,
        fontVariationSettings: "'opsz' 144, 'SOFT' 100", marginLeft: 'clamp(2.25rem, 3.4vw + 0.5rem, 3.5rem)',
      }}>{pitch}</p>

      <div className="mb-12">{children}</div>

      <div className="flex items-center justify-between gap-4 flex-wrap pt-6" style={{ borderTop: `1px solid ${RULE}` }}>
        <button onClick={onBack} className="hover:opacity-75 transition-opacity inline-flex items-center gap-2" style={{
          fontFamily: 'var(--font-fraunces), serif', fontStyle: 'italic',
          color: SUB, fontSize: 15,
          fontVariationSettings: "'opsz' 24, 'SOFT' 100",
        }}>
          &larr; Back
        </button>
        <button onClick={onNext} disabled={!canNext} className="hover:opacity-90 transition-opacity disabled:opacity-40" style={{
          padding: '12px 24px', background: canNext ? INK : '#9d9890', color: CREAM, borderRadius: 999,
          fontFamily: 'var(--font-mono), monospace', fontSize: 12, fontWeight: 800,
          letterSpacing: '0.18em', textTransform: 'uppercase',
          cursor: canNext ? 'pointer' : 'not-allowed',
        }}>
          {nextLabel} &rarr;
        </button>
      </div>
    </motion.section>
  );
}

function TopicChip({ topic, selected, onClick, variant }: {
  topic: typeof TOPICS[number]; selected: boolean; onClick: () => void; variant: 'want' | 'avoid';
}) {
  const accentForVariant = variant === 'want' ? ACCENT : '#9a3838';
  return (
    <button onClick={onClick} className="text-left hover:opacity-95 transition-all" style={{
      padding: '14px 16px', borderRadius: 8,
      background: selected ? '#fffbed' : 'transparent',
      border: `1px solid ${selected ? accentForVariant : RULE}`,
      boxShadow: selected ? `0 6px 16px -8px ${accentForVariant}55, inset 0 0 0 1px ${accentForVariant}` : 'none',
      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display italic" style={{
          color: INK, fontSize: 18, fontWeight: 500, lineHeight: 1.1, letterSpacing: '-0.018em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>{topic.label}</span>
        <span aria-hidden style={{
          width: 18, height: 18, borderRadius: 999,
          border: `1.5px solid ${selected ? accentForVariant : RULE}`,
          background: selected ? accentForVariant : 'transparent',
          color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>
          {selected ? (variant === 'want' ? '✓' : '✕') : ''}
        </span>
      </div>
      <span style={{ color: MUTED, fontSize: 12.5, lineHeight: 1.35 }}>{topic.tagline}</span>
    </button>
  );
}

function ToneCard({ tone, selected, onClick }: { tone: Tone; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left hover:opacity-95 transition-all" style={{
      padding: '24px 24px', borderRadius: 10,
      background: selected ? '#fffbed' : 'rgba(255,251,237,0.4)',
      border: `1px solid ${selected ? ACCENT : RULE}`,
      boxShadow: selected ? `0 12px 28px -10px ${ACCENT}66, inset 0 0 0 1px ${ACCENT}` : 'none',
      cursor: 'pointer',
    }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="font-display italic" style={{
          color: INK, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1",
        }}>{tone.label}</h3>
        <span style={{
          width: 22, height: 22, borderRadius: 999,
          border: `2px solid ${selected ? ACCENT : RULE}`,
          background: selected ? ACCENT : 'transparent',
          color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800,
        }}>{selected ? '✓' : ''}</span>
      </div>
      <p className="italic mb-4" style={{
        color: SUB, fontSize: 14.5, lineHeight: 1.4,
        fontFamily: 'var(--font-fraunces), serif',
        fontVariationSettings: "'opsz' 14, 'SOFT' 100",
      }}>{tone.byline}</p>
      <p style={{ color: SUB, fontSize: 13, lineHeight: 1.45, marginBottom: 14 }}>{tone.pitch}</p>
      {/* Sample */}
      <div className="pt-4" style={{ borderTop: `1px solid ${RULE}99` }}>
        <span style={{
          fontFamily: 'var(--font-mono), monospace', color: MUTED,
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.20em', textTransform: 'uppercase', display: 'block', marginBottom: 6,
        }}>Sample headline</span>
        <p className="font-display" style={{
          color: INK, fontSize: 17, fontWeight: 500, lineHeight: 1.22, letterSpacing: '-0.014em',
          fontVariationSettings: "'opsz' 144, 'SOFT' 50",
          marginBottom: 4, textWrap: 'balance',
        }}>{tone.sample}</p>
        <p className="italic" style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.4,
          fontFamily: 'var(--font-fraunces), serif',
          fontVariationSettings: "'opsz' 14, 'SOFT' 100" }}>{tone.sampleSub}</p>
      </div>
    </button>
  );
}

function SlotCard({ slot, selected, onClick }: { slot: Slot; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left hover:opacity-95 transition-all" style={{
      padding: '24px 22px', borderRadius: 10,
      background: selected ? '#fffbed' : 'rgba(255,251,237,0.4)',
      border: `1px solid ${selected ? ACCENT : RULE}`,
      boxShadow: selected ? `0 12px 28px -10px ${ACCENT}66, inset 0 0 0 1px ${ACCENT}` : 'none',
      cursor: 'pointer',
    }}>
      <p className="font-display italic" style={{
        color: ACCENT, fontSize: 32, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.022em',
        fontVariationSettings: "'opsz' 144, 'SOFT' 100, 'WONK' 1", marginBottom: 8,
      }}>{slot.time}</p>
      <p className="font-display" style={{
        color: INK, fontSize: 18, fontWeight: 500, lineHeight: 1.2,
        fontVariationSettings: "'opsz' 144, 'SOFT' 50", marginBottom: 4,
      }}>{slot.label}</p>
      <p className="italic" style={{ color: MUTED, fontSize: 13, lineHeight: 1.4,
        fontFamily: 'var(--font-fraunces), serif',
        fontVariationSettings: "'opsz' 14, 'SOFT' 100" }}>{slot.tagline}</p>
    </button>
  );
}

/* ═════════════════════════════════════════════════════════════════
   PAPER GRAIN — texture overlay
═════════════════════════════════════════════════════════════════ */
function PaperGrain() {
  return (
    <div aria-hidden className="fixed inset-0 pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.92' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      opacity: 0.04, mixBlendMode: 'multiply', zIndex: 1,
    }} />
  );
}

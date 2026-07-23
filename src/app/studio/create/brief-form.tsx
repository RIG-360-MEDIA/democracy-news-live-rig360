'use client';

// "From a topic" (Door B) — the editor hands the machine a brief and a set of
// dials, and it gathers evidence and drafts. This form only *starts* a job via
// the proxy route POST /api/studio/draft; the resulting job joins My Drafts and
// the polling hook tracks it to ready. Never imports the server-only client.

import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { useToast } from '@/components/studio/ui';
import { DEFAULT_DIALS, jobStatusSchema, LENGTH_PRESETS } from '@/lib/dispatch/types';
import { MANUAL_TOPICS } from '@/lib/studio/topics';

import type { JobStatus } from '@/lib/dispatch/types';

interface BriefFormProps {
  /** Called with the freshly-created job so it can join the tracked drafts. */
  onCreated: (job: JobStatus) => void;
}

interface TimeWindow {
  label: string;
  hours: number;
}

const TIME_WINDOWS: ReadonlyArray<TimeWindow> = [
  { label: 'Last 6 hours', hours: 6 },
  { label: 'Last 12 hours', hours: 12 },
  { label: 'Last 24 hours', hours: 24 },
  { label: 'Last 48 hours', hours: 48 },
  { label: 'Last 3 days', hours: 72 },
  { label: 'Last week', hours: 168 },
];

const REGIONS: ReadonlyArray<string> = [
  'Worldwide',
  'Africa',
  'Americas',
  'Asia',
  'Europe',
  'Middle East',
  'Oceania',
];

const LINE_HEIGHT_PX = 22;
const MAX_LINES = 100;
const LENGTH_MIN = 300;
const LENGTH_MAX = 4000;
const ANY = '';

function clampLength(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_DIALS.length_target;
  return Math.min(LENGTH_MAX, Math.max(LENGTH_MIN, Math.round(n)));
}

const labelCls = 'mb-1 block font-mono text-ui-sm uppercase tracking-wider text-studio-muted';
const fieldCls =
  'w-full border border-studio-rule bg-studio-paper px-3 py-2 font-sans text-ui-md text-studio-ink';

export default function BriefForm({ onCreated }: BriefFormProps) {
  const toast = useToast();

  const [input, setInput] = useState('');
  const [timeWindowH, setTimeWindowH] = useState<number>(24);
  const [region, setRegion] = useState<string>(ANY);
  const [section, setSection] = useState<string>(ANY);
  const [lengthTarget, setLengthTarget] = useState<number>(DEFAULT_DIALS.length_target);
  const [creativity, setCreativity] = useState<number>(DEFAULT_DIALS.creativity);
  const [moxy, setMoxy] = useState<number>(DEFAULT_DIALS.moxy);
  const [busy, setBusy] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the brief textarea from one line up to MAX_LINES, then scroll.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, LINE_HEIGHT_PX * MAX_LINES)}px`;
  }, [input]);

  const gather = useCallback(async () => {
    const text = input.trim();
    if (!text) {
      toast.show('Write a brief first — even one line.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        input_text: text,
        dials: {
          creativity,
          moxy,
          length_target: clampLength(lengthTarget),
          spot_check: true,
        },
        time_window_h: timeWindowH,
      };
      if (region !== ANY) payload.region = region;
      if (section !== ANY) payload.section = section;

      const res = await fetch('/api/studio/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await res.json();
      if (!res.ok) {
        const err = (body as { error?: { message?: string } }).error;
        toast.show(`Couldn’t start the draft: ${err?.message ?? res.status}`, 'error');
        return;
      }
      const parsed = jobStatusSchema.safeParse((body as { data?: unknown }).data);
      if (!parsed.success) {
        toast.show('The draft started but returned an unexpected shape.', 'error');
        return;
      }
      onCreated(parsed.data);
      setInput('');
      toast.show('Gathering sources — your draft is in My Drafts.');
    } catch {
      toast.show('Network error starting the draft.', 'error');
    } finally {
      setBusy(false);
    }
  }, [input, creativity, moxy, lengthTarget, timeWindowH, region, section, onCreated, toast]);

  return (
    <div className="border border-studio-rule bg-studio-paper p-5">
      <label htmlFor="brief" className={labelCls}>
        Brief
      </label>
      <textarea
        id="brief"
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={1}
        placeholder="Ukraine grain-corridor talks resume in Istanbul…"
        className={`${fieldCls} resize-none leading-[22px]`}
      />
      <p className="mt-1 font-sans text-ui-sm text-studio-muted">
        One line or a full editorial brief — angle, must-includes, constraints all honored.
      </p>

      {/* Knobs — time window, region, section */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="tw" className={labelCls}>
            Time window
          </label>
          <select
            id="tw"
            value={timeWindowH}
            onChange={(e) => setTimeWindowH(Number(e.target.value))}
            className={fieldCls}
          >
            {TIME_WINDOWS.map((w) => (
              <option key={w.hours} value={w.hours}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="region" className={labelCls}>
            Region
          </label>
          <select id="region" value={region} onChange={(e) => setRegion(e.target.value)} className={fieldCls}>
            <option value={ANY}>Any region</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="section" className={labelCls}>
            Section
          </label>
          <select id="section" value={section} onChange={(e) => setSection(e.target.value)} className={fieldCls}>
            <option value={ANY}>Any section</option>
            {MANUAL_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Word target */}
      <div className="mt-5">
        <span className={labelCls}>Word target</span>
        <div className="flex flex-wrap items-center gap-2">
          {LENGTH_PRESETS.map((preset) => {
            const active = lengthTarget === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setLengthTarget(preset)}
                aria-pressed={active}
                className={[
                  'border px-4 py-2 font-mono text-ui-sm transition-colors',
                  active
                    ? 'border-studio-ink text-studio-ink'
                    : 'border-studio-rule text-studio-muted hover:text-studio-ink',
                ].join(' ')}
              >
                {preset}
              </button>
            );
          })}
          <input
            type="number"
            min={LENGTH_MIN}
            max={LENGTH_MAX}
            step={100}
            value={lengthTarget}
            onChange={(e) => setLengthTarget(Number(e.target.value))}
            onBlur={() => setLengthTarget((n) => clampLength(n))}
            aria-label="Custom word target"
            className="w-28 border border-studio-rule bg-studio-paper px-3 py-2 font-mono text-ui-sm text-studio-ink"
          />
          <span className="font-sans text-ui-sm text-studio-muted">words</span>
        </div>
      </div>

      {/* Creativity + moxy */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="creativity" className={labelCls}>
            Creativity <span className="font-normal text-studio-ink">{creativity}</span>
          </label>
          <input
            id="creativity"
            type="range"
            min={0}
            max={10}
            value={creativity}
            onChange={(e) => setCreativity(Number(e.target.value))}
            className="w-full accent-studio-ink"
          />
        </div>
        <div>
          <label htmlFor="moxy" className={labelCls}>
            Moxy <span className="font-normal text-studio-ink">{moxy}</span>
          </label>
          <input
            id="moxy"
            type="range"
            min={0}
            max={10}
            value={moxy}
            onChange={(e) => setMoxy(Number(e.target.value))}
            className="w-full accent-studio-ink"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={gather}
        disabled={busy}
        className="mt-6 border border-studio-accent bg-studio-accent px-6 py-2 font-sans text-ui-md font-semibold text-studio-paper transition-opacity disabled:opacity-60"
      >
        {busy ? 'Gathering…' : 'Gather'}
      </button>
    </div>
  );
}

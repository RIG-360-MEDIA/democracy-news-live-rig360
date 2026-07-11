'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { RankingWeights } from '@/lib/studio/types';

// The ten reader-facing sections. Topic weights default to 1 when unset.
const SECTIONS = [
  'POLITICS',
  'SPORTS',
  'SECURITY',
  'ENVIRONMENT',
  'HEALTH',
  'BUSINESS',
  'FINANCE',
  'LEGAL',
  'TECHNOLOGY',
  'SOCIETY',
] as const;

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface RankingClientProps {
  weights: RankingWeights;
  /** Only admins may change feed-wide weights; editors see a read-only view. */
  canWrite: boolean;
}

export function RankingClient({ weights, canWrite }: RankingClientProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<SaveState>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const [recencyHalflifeH, setRecency] = useState(weights.recencyHalflifeH);
  const [sourceWeight, setSource] = useState(weights.sourceWeight);
  const [velocityWeight, setVelocity] = useState(weights.velocityWeight);
  const [topicWeights, setTopicWeights] = useState<Record<string, number>>(() => {
    const seeded: Record<string, number> = {};
    for (const s of SECTIONS) seeded[s] = weights.topicWeights[s] ?? 1;
    return seeded;
  });

  function setTopic(section: string, value: number) {
    setState('idle');
    setTopicWeights((prev) => ({ ...prev, [section]: value }));
  }

  async function save() {
    if (!canWrite) return; // admin-only; the API enforces this too.
    setState('saving');
    setMessage(null);
    try {
      const r = await fetch('/api/studio/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicWeights, recencyHalflifeH, sourceWeight, velocityWeight }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setState('error');
        setMessage(j?.error?.message ?? `Save failed (${r.status})`);
        return;
      }
      setState('saved');
      start(() => router.refresh());
    } catch (e: unknown) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Save failed');
    }
  }

  const card: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e6e6e6',
    borderRadius: 9,
    padding: '16px 18px',
    marginBottom: 14,
  };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, color: '#333' };
  const hint: React.CSSProperties = { fontSize: 11, color: '#888' };
  const numInput: React.CSSProperties = {
    width: 64,
    padding: '5px 8px',
    border: '1px solid #ddd',
    borderRadius: 6,
    fontSize: 13,
    fontFamily: 'var(--font-mono), monospace',
    textAlign: 'right',
  };
  const btn: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    padding: '9px 18px',
    borderRadius: 7,
    border: '1px solid #1b4b91',
    background: '#1b4b91',
    color: '#fff',
    cursor: 'pointer',
  };

  const slider = (
    title: string,
    sub: string,
    value: number,
    min: number,
    max: number,
    step: number,
    onChange: (v: number) => void,
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={label}>{title}</span>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          style={numInput}
          disabled={!canWrite}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) {
              setState('idle');
              onChange(n);
            }
          }}
        />
      </div>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={!canWrite}
        style={{ width: '100%', accentColor: '#1b4b91' }}
        onChange={(e) => {
          setState('idle');
          onChange(Number(e.target.value));
        }}
      />
      <div style={hint}>{sub}</div>
    </div>
  );

  return (
    <div>
      <div style={card}>
        {slider('Recency half-life', 'Hours until a story’s freshness score halves. Lower = fresher feed.', recencyHalflifeH, 1, 72, 1, setRecency)}
        {slider('Source weight', 'How much independent-source breadth lifts a story.', sourceWeight, 0, 3, 0.1, setSource)}
        {slider('Velocity weight', 'How much a fast-growing cluster is rewarded.', velocityWeight, 0, 3, 0.1, setVelocity)}
      </div>

      <div style={card}>
        <div style={{ ...label, marginBottom: 4 }}>Section weights</div>
        <div style={{ ...hint, marginBottom: 12 }}>Multiplier per section (0–2). 1.0 is neutral; below 1 demotes, above 1 promotes.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px 20px' }}>
          {SECTIONS.map((s) => {
            const value = topicWeights[s] ?? 1;
            return (
              <div key={s}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.03em', color: '#444' }}>{s}</span>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, color: '#888' }}>{value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  value={value}
                  min={0}
                  max={2}
                  step={0.05}
                  disabled={!canWrite}
                  style={{ width: '100%', accentColor: value === 1 ? '#999' : '#1b4b91' }}
                  onChange={(e) => setTopic(s, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          style={{ ...btn, opacity: !canWrite || state === 'saving' || pending ? 0.6 : 1, cursor: canWrite ? 'pointer' : 'not-allowed' }}
          disabled={!canWrite || state === 'saving' || pending}
          onClick={save}
        >
          {state === 'saving' ? 'Saving…' : 'Save weights'}
        </button>
        {state === 'saved' && <span style={{ fontSize: 12.5, color: '#2e7d32', fontWeight: 700 }}>✓ Saved</span>}
        {state === 'error' && <span style={{ fontSize: 12.5, color: '#a8141a', fontWeight: 700 }}>{message ?? 'Save failed'}</span>}
        <span style={{ fontSize: 11.5, color: '#888', marginLeft: 'auto' }}>Applied to ranking on the next feed build.</span>
      </div>
    </div>
  );
}

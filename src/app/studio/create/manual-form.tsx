'use client';

// Manual authoring form (Door A) — an editor hand-writes a story that bypasses
// the generator. Extracted near-verbatim from the original create-client so its
// behaviour and POST /api/studio/create contract are unchanged; the Create
// screen now hosts it behind the Manual|From-a-topic toggle.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { MANUAL_TOPICS } from '@/lib/studio/topics';

interface FormState {
  headline: string;
  dek: string;
  body: string;
  topic: string;
  country: string;
  image_url: string;
  importance: string;
}

const EMPTY: FormState = {
  headline: '',
  dek: '',
  body: '',
  topic: 'OTHER',
  country: '',
  image_url: '',
  importance: '40',
};

export default function ManualForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setErr(null);
    if (!form.headline.trim()) {
      setErr('Headline is required.');
      return;
    }
    if (!form.body.trim()) {
      setErr('Body is required.');
      return;
    }
    setBusy(true);
    try {
      const r = await fetch('/api/studio/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headline: form.headline,
          dek: form.dek,
          body: form.body,
          topic: form.topic,
          country: form.country,
          image_url: form.image_url,
          importance: Number(form.importance),
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setErr('Create failed: ' + (j?.error?.message ?? r.status));
      } else {
        setForm(EMPTY);
        start(() => router.refresh());
      }
    } finally {
      setBusy(false);
    }
  }

  const label: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.03em',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 5,
    display: 'block',
  };

  const field: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    border: '1px solid #ddd',
    borderRadius: 7,
    fontSize: 13,
    background: '#fff',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, background: '#fff', padding: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <label style={label}>Headline</label>
        <input style={field} value={form.headline} onChange={(e) => set('headline', e.target.value)} placeholder="The story headline" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Dek</label>
        <input style={field} value={form.dek} onChange={(e) => set('dek', e.target.value)} placeholder="Optional standfirst / subheading" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={label}>Body (markdown)</label>
        <textarea
          style={{ ...field, minHeight: 200, resize: 'vertical', lineHeight: 1.5 }}
          value={form.body}
          onChange={(e) => set('body', e.target.value)}
          placeholder="Write the story in markdown…"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={label}>Topic</label>
          <select style={field} value={form.topic} onChange={(e) => set('topic', e.target.value)}>
            {MANUAL_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={label}>Country</label>
          <input
            style={field}
            value={form.country}
            onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))}
            placeholder="US"
            maxLength={2}
          />
        </div>
        <div>
          <label style={label}>Importance</label>
          <input style={field} type="number" value={form.importance} onChange={(e) => set('importance', e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={label}>Image URL</label>
        <input style={field} value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
      </div>

      {err && <p style={{ color: '#a8141a', fontSize: 12.5, marginBottom: 12 }}>{err}</p>}

      <button
        onClick={submit}
        disabled={busy || pending}
        style={{
          fontSize: 13,
          fontWeight: 700,
          padding: '10px 20px',
          borderRadius: 7,
          border: '1px solid #a8141a',
          background: busy || pending ? '#c66' : '#a8141a',
          color: '#fff',
          cursor: busy || pending ? 'default' : 'pointer',
        }}
      >
        {busy ? 'Publishing…' : 'Publish story'}
      </button>
    </div>
  );
}

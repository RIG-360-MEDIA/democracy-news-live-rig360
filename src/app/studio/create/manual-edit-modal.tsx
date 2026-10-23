'use client';

// Full-screen editor for a manual story from "Recently created" (like Watch & decide on the Videos page): the body
// gets a big writing area on the left, every other field sits on the right with a live image preview. Save sends only
// what changed to PATCH /api/studio/manual/[id] (audited; a live story updates on the site at once). Esc / Cancel
// close it - after a confirm when there are unsaved changes.

import { useEffect, useState } from 'react';

import { MANUAL_TOPICS } from '@/lib/studio/topics';

export interface ManualEditFields {
  headline: string;
  dek: string;
  authors: string;
  body: string;
  topic: string;
  country: string;
  image_url: string;
  importance: string;
}

const RED = '#a8141a';

export default function ManualEditModal({ id, initial, live, onClose, onSaved }: {
  id: string;
  initial: ManualEditFields;
  live: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<ManualEditFields>(initial);
  const [busy, setBusy] = useState<null | 'save'>(null);
  const [err, setErr] = useState<string | null>(null);
  const dirty = (Object.keys(initial) as Array<keyof ManualEditFields>).some((k) => f[k] !== initial[k]);

  function close() {
    if (dirty && !window.confirm('Close without saving your changes?')) return;
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';                     // the page behind does not scroll
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  });

  const set = (k: keyof ManualEditFields, v: string) => setF((x) => ({ ...x, [k]: v }));

  async function save() {
    setErr(null);
    if (!f.headline.trim() || !f.body.trim()) {
      setErr('Headline and body are required.');
      return;
    }
    const changed: Record<string, unknown> = {};
    for (const k of Object.keys(initial) as Array<keyof ManualEditFields>) {
      if (f[k] !== initial[k]) changed[k] = k === 'importance' ? Number(f[k]) : f[k];
    }
    if (Object.keys(changed).length === 0) {
      onClose();
      return;
    }
    setBusy('save');
    try {
      const r = await fetch(`/api/studio/manual/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changed),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) throw new Error(j?.error?.message ?? String(r.status));
      onSaved();
    } catch (e) {
      setErr('Save failed: ' + (e instanceof Error ? e.message : 'error'));
    } finally {
      setBusy(null);
    }
  }

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, letterSpacing: '.04em', color: '#666', textTransform: 'uppercase', marginBottom: 5, display: 'block' };
  const field: React.CSSProperties = { width: '100%', padding: '9px 12px', border: '1px solid #ddd', borderRadius: 7, fontSize: 13.5, background: '#fff', fontFamily: 'inherit' };
  const pill = (bg: string, fg = '#fff'): React.CSSProperties => ({ padding: '11px 22px', borderRadius: 999, border: 0, background: bg, color: fg, fontSize: 13.5, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 });

  return (
    <div role="dialog" aria-modal="true" aria-label="Edit story" onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(10,12,18,0.82)', backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ margin: '28px auto 0', width: 'min(1240px, 94vw)', flex: 1, minHeight: 0, background: '#faf8f4', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 30px 80px -20px rgba(0,0,0,0.6)' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderBottom: '1px solid #eee' }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: live ? '#2e7d32' : '#8a6d1a' }}>
            {live ? 'LIVE ON THE SITE - saving updates it at once' : 'NOT ON THE SITE'}
          </span>
          <span style={{ flex: 1 }} />
          {dirty && <span style={{ fontSize: 12, color: '#8a6d1a' }}>Unsaved changes</span>}
          <button type="button" aria-label="Close" onClick={close} style={{ border: 0, background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#555' }}>×</button>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(300px, 1fr)', gap: 22, padding: 22, overflow: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <label style={label}>Headline</label>
            <input style={{ ...field, fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 22, fontWeight: 600, marginBottom: 14 }}
              value={f.headline} onChange={(e) => set('headline', e.target.value)} />
            <label style={label}>Strap</label>
            <input style={{ ...field, fontStyle: 'italic', marginBottom: 14 }} value={f.dek} onChange={(e) => set('dek', e.target.value)}
              placeholder="Optional one-line summary under the headline" />
            <label style={label}>Body</label>
            <textarea style={{ ...field, flex: 1, minHeight: 360, resize: 'none', lineHeight: 1.65, fontSize: 14.5, fontFamily: 'var(--font-fraunces), Georgia, serif' }}
              value={f.body} onChange={(e) => set('body', e.target.value)}
              placeholder="Leave an empty line between paragraphs. A section heading goes on its own line: ## What happens next" />
          </div>

          <div>
            <label style={label}>Authors</label>
            <input style={{ ...field, marginBottom: 14 }} value={f.authors} onChange={(e) => set('authors', e.target.value)}
              placeholder="Empty = Democracy News Live Desk" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div>
                <label style={label}>Topic</label>
                <select style={field} value={f.topic} onChange={(e) => set('topic', e.target.value)}>
                  {MANUAL_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={label}>Country</label>
                <input style={field} value={f.country} maxLength={2} placeholder="IN"
                  onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))} />
              </div>
            </div>
            <label style={label}>Importance (0-100)</label>
            <input style={{ ...field, marginBottom: 14 }} type="number" min={0} max={100} value={f.importance}
              onChange={(e) => set('importance', e.target.value)} />
            <label style={label}>Image</label>
            <input style={{ ...field, marginBottom: 8 }} value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
            {/^https?:\/\//.test(f.image_url) && (
              // eslint-disable-next-line @next/next/no-img-element -- editor preview of an arbitrary URL
              <img src={f.image_url} alt="" style={{ display: 'block', marginTop: 12, width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
            )}
            <p style={{ fontSize: 11.5, color: '#888', marginTop: 8 }}>Shown 16:9 on the story page and on cards (the centre of the picture).</p>
          </div>
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderTop: '1px solid #eee' }}>
          {err && <span role="alert" style={{ color: RED, fontSize: 12.5 }}>{err}</span>}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={close} style={pill('#ece9e2', '#333')}>Cancel</button>
          <button type="button" disabled={busy !== null} onClick={() => void save()} style={pill(RED)}>
            {busy === 'save' ? 'Saving…' : live ? 'Save - update on the site' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}

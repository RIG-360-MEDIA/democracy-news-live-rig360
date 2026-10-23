'use client';

// "Drafts" on the Create page: one row per saved draft (never on the site). Clicking a row opens the full-screen
// editor (Save draft / Publish - a published draft leaves this list); Delete on the right removes the draft after a
// confirm (DELETE /api/studio/manual/[id]: editors may delete drafts). ?draft=<id> opens that draft on load.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ManualEditModal from './manual-edit-modal';

export interface DraftRow {
  id: string;
  headline: string;
  dek: string;
  authors: string;
  body: string;
  topic: string;
  country: string;
  imageUrl: string;
  importance: number;
  updatedAt: string;
}

function ago(iso: string): string {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ManualDraftsList({ drafts, openId }: { drafts: DraftRow[]; openId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(openId && drafts.some((d) => d.id === openId) ? openId : null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const current = drafts.find((d) => d.id === open);

  function close(refresh: boolean) {
    setOpen(null);
    if (openId) router.replace('/studio/create', { scroll: false });   // drop ?draft= from the address
    if (refresh) router.refresh();                                     // a published draft moves to Recently created
  }

  async function remove(d: DraftRow) {
    if (!window.confirm(`Delete the draft "${d.headline}"? This cannot be undone from here.`)) return;
    setBusy(d.id);
    setErr(null);
    const r = await fetch(`/api/studio/manual/${d.id}`, { method: 'DELETE' }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setBusy(null);
    if (!r?.ok || !j?.ok) {
      setErr(`Could not delete "${d.headline}": ${j?.error?.message ?? 'network error'}`);
      return;
    }
    router.refresh();
  }

  if (drafts.length === 0) {
    return <p style={{ color: '#999', fontSize: 13 }}>No drafts. Use "Save draft" to keep a story here until it is ready.</p>;
  }

  return (
    <div>
      {err && <p role="alert" style={{ color: '#a8141a', fontSize: 12.5, marginBottom: 8 }}>{err}</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #eee', borderRadius: 8, background: '#fff' }}>
        {drafts.map((d, i) => (
          <li key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderTop: i ? '1px solid #f0eee9' : 'none' }}>
            <button type="button" onClick={() => setOpen(d.id)} title="Open this draft"
              style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 0, padding: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: '#8a6d1a', background: '#fff4d6', padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>DRAFT</span>
                <span style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, fontWeight: 600, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.headline}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {[d.authors && `By ${d.authors}`, d.dek, `${d.topic}${d.country ? ` · ${d.country}` : ''}`,
                  d.body.trim() ? `${d.body.trim().split(/\s+/).length} words` : 'no body yet', `saved ${ago(d.updatedAt)}`]
                  .filter(Boolean).join('  ·  ')}
              </div>
            </button>
            <button type="button" onClick={() => void remove(d)} disabled={busy === d.id}
              style={{ flexShrink: 0, fontSize: 12, fontWeight: 600, padding: '6px 12px', border: '1px solid #f0c4c2', borderRadius: 6, background: '#fff', color: '#a8141a', cursor: 'pointer' }}>
              {busy === d.id ? 'Deleting…' : 'Delete'}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <ManualEditModal
          key={current.id}
          id={current.id}
          live={false}
          draft
          initial={{ headline: current.headline, dek: current.dek, authors: current.authors, body: current.body, topic: current.topic,
                     country: current.country, image_url: current.imageUrl, importance: String(current.importance) }}
          onClose={() => close(false)}
          onSaved={() => close(true)}
        />
      )}
    </div>
  );
}

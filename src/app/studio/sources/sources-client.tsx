'use client';

import { useTransition } from 'react';

import { updateSourceLean } from './actions';

// Inline (do NOT import from lib/editorial/sources — that pulls the server-only db client into the bundle).
const LEANS = ['', 'left', 'lean-left', 'center', 'lean-right', 'right', 'state', 'unknown'];
type Row = { id: string; name: string; domain: string; lean: string | null; active: boolean; country: string | null };

export default function SourcesClient({ rows }: { rows: Row[] }) {
  const [isPending, start] = useTransition();
  return (
    <div style={{ overflowX: 'auto', opacity: isPending ? 0.6 : 1, transition: 'opacity .15s' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, background: '#fff', border: '1px solid #ececea', borderRadius: 8 }}>
        <thead>
          <tr style={{ textAlign: 'left', color: '#888', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            <th style={{ padding: '9px 10px' }}>Source</th>
            <th style={{ padding: '9px 10px' }}>Domain</th>
            <th style={{ padding: '9px 10px' }}>Country</th>
            <th style={{ padding: '9px 10px' }}>Lean</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #f0f0ee', color: r.active ? '#1a1a1a' : '#aaa' }}>
              <td style={{ padding: '9px 10px', fontWeight: 700 }}>{r.name}</td>
              <td style={{ padding: '9px 10px', color: '#888' }}>{r.domain}</td>
              <td style={{ padding: '9px 10px', color: '#888' }}>{r.country ?? '—'}</td>
              <td style={{ padding: '9px 10px' }}>
                <select
                  defaultValue={r.lean ?? ''}
                  onChange={(e) => { const v = e.target.value; start(() => updateSourceLean(r.id, v)); }}
                  style={{ fontSize: 12, padding: '3px 6px', borderRadius: 5, border: '1px solid #d8d8d6',
                    fontWeight: r.lean ? 700 : 400, color: r.lean ? '#1a1a1a' : '#bbb', background: '#fff' }}
                >
                  {LEANS.map((l) => <option key={l} value={l}>{l || '— unset —'}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

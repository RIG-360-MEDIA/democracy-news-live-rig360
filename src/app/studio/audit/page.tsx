// Editorial CMS — Audit: append-only log of every editorial action (epic 002).
import { sql } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface Row {
  id: number;
  story_id: string | null;
  editor_id: string;
  action: string;
  at: string | Date;
}

const COLOR: Record<string, string> = {
  kill: '#a8141a', revive: '#2e7d32', pin: '#1b4b91', boost: '#1b4b91',
  suppress: '#8a6d1a', lock: '#a8141a', unlock: '#666', edit: '#1b4b91',
};

export default async function Audit() {
  const rows = (await sql`
    SELECT id, story_id, editor_id, action, at
    FROM rigwire.editorial_audit ORDER BY at DESC LIMIT 150
  `) as unknown as Row[];

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600, marginBottom: 6 }}>Audit log</h1>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16 }}>
        Every override, in order. This is also the signal for how often editors correct the machine.
      </p>
      {rows.length === 0 ? (
        <p style={{ color: '#999' }}>No editorial actions yet.</p>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
          {rows.map((r) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '150px 90px 1fr', gap: 12, padding: '9px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 12.5 }}>
              <span style={{ fontFamily: 'var(--font-mono), monospace', color: '#999' }}>{new Date(r.at).toLocaleString()}</span>
              <span style={{ fontWeight: 800, color: COLOR[r.action] ?? '#333', textTransform: 'uppercase', fontSize: 11 }}>{r.action}</span>
              <span style={{ color: '#555' }}>
                {r.editor_id}
                {r.story_id && <span style={{ color: '#aaa', fontFamily: 'var(--font-mono), monospace' }}> · {r.story_id.slice(0, 8)}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

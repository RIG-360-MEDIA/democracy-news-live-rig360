// Editorial CMS — Ranking knobs (E5): topic weights, recency, source & velocity.
// Feed-wide config → editing is admin-only (E7); plain editors see it read-only.
import { getWeights } from '@/lib/studio/weights';
import { requireEditor } from '@/lib/studio/session';

import { RankingClient } from './ranking-client';

export const dynamic = 'force-dynamic';

export default async function Ranking() {
  const guard = await requireEditor();
  const canWrite = guard.ok && guard.editor.isAdmin;
  const weights = await getWeights();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>Ranking knobs</h1>
        <span style={{ fontSize: 12, color: '#888' }}>
          last edited by <b style={{ color: '#111' }}>{weights.updatedBy}</b>
        </span>
      </div>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16 }}>
        The weights the machine ranks by. Nudge them; the feed picks the new values up on its next build.
      </p>
      {!canWrite && (
        <div
          style={{
            fontSize: 12.5,
            color: '#7a1e22',
            background: '#fbecec',
            border: '1px solid #f0cccd',
            borderRadius: 7,
            padding: '9px 12px',
            marginBottom: 16,
          }}
        >
          Read-only — ranking weights are feed-wide configuration. Ask an admin to change them.
        </div>
      )}
      <RankingClient weights={weights} canWrite={canWrite} />
    </div>
  );
}

// Editorial CMS — Ranking knobs (E5): topic weights, recency, source & velocity.
// Feed-wide config → the whole surface is admin-only (F8).
import { guardPage } from '@/lib/studio/guard';
import { getWeights } from '@/lib/studio/weights';

import { RankingClient } from './ranking-client';

export const dynamic = 'force-dynamic';

export default async function Ranking() {
  await guardPage('admin');
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
      <RankingClient weights={weights} canWrite />
    </div>
  );
}

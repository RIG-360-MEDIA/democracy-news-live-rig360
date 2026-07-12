// STEP 3 — Merge review: the AI's same-event verdicts (analytics.merge_verdicts), so an editor can
// sanity-check what the machine folded together. Auth-gated by the studio layout.
import { recentMerges } from '@/lib/editorial/merges';

export const dynamic = 'force-dynamic';

export default async function MergesPage() {
  const merges = await recentMerges(120);
  const sameN = merges.filter((m) => m.same).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Merge review</h1>
        <p style={{ fontSize: 12.5, color: '#666', margin: '4px 0 0' }}>
          {merges.length} recent AI verdicts · {sameN} judged SAME event · {merges.length - sameN} kept apart. Every decision is reversible via the story_dedup map.
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12.5, background: '#fff', border: '1px solid #ececea', borderRadius: 8 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#888', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em' }}>
              <th style={{ padding: '9px 10px' }}>Story A</th>
              <th style={{ padding: '9px 10px' }}>Story B</th>
              <th style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>Cos</th>
              <th style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>Verdict</th>
              <th style={{ padding: '9px 10px' }}>Reason</th>
            </tr>
          </thead>
          <tbody>
            {merges.map((m, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f0f0ee' }}>
                <td style={{ padding: '9px 10px', maxWidth: 300 }}>{m.headlineA}</td>
                <td style={{ padding: '9px 10px', maxWidth: 300 }}>{m.headlineB}</td>
                <td style={{ padding: '9px 10px', fontVariantNumeric: 'tabular-nums', color: '#666' }}>{m.cos.toFixed(3)}</td>
                <td style={{ padding: '9px 10px', whiteSpace: 'nowrap' }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: '#fff',
                    background: m.same ? '#2e7d51' : '#8a8f98', borderRadius: 4, padding: '2px 6px' }}>
                    {m.same ? 'same' : 'apart'} {(m.confidence * 100).toFixed(0)}%
                  </span>
                  {m.same && m.folded && <span title="folded in story_dedup" style={{ marginLeft: 5, fontSize: 10.5, color: '#2e7d51' }}>● folded</span>}
                </td>
                <td style={{ padding: '9px 10px', color: '#666' }}>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// STEP 3 — Story Lens: one merged event seen three ways (timeline / bias / perspectives),
// computed from the PRESERVED cluster fragments. Auth-gated by the studio layout.
import { storyLens, type Lean } from '@/lib/editorial/story-lens';

export const dynamic = 'force-dynamic';

const LEAN_COLOR: Record<Lean, string> = {
  left: '#2f6fed', center: '#8a8f98', right: '#e0555b', state: '#b8860b', unknown: '#cfcfcf',
};
const LEAN_LABEL: Record<Lean, string> = {
  left: 'Left', center: 'Center', right: 'Right', state: 'State', unknown: 'Unknown',
};

function Chip({ lean }: { lean: Lean }) {
  return (
    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase',
      color: lean === 'unknown' ? '#666' : '#fff', background: LEAN_COLOR[lean], borderRadius: 4, padding: '2px 6px' }}>
      {LEAN_LABEL[lean]}
    </span>
  );
}

export default async function LensPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { timeline, bias, perspectives } = await storyLens(id);
  const order: Lean[] = ['left', 'center', 'right', 'state', 'unknown'];
  const pct = (n: number) => (bias.total ? Math.round((n / bias.total) * 100) : 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-bricolage), sans-serif', fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Story Lens</h1>
        <p style={{ fontSize: 12.5, color: '#666', margin: '4px 0 0' }}>
          {perspectives.length} outlets · {bias.total} articles · one event across all merged fragments · <code style={{ fontSize: 11 }}>{id.slice(0, 8)}</code>
        </p>
      </div>

      {/* BIAS SPLIT */}
      <section>
        <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Coverage by lean</h2>
        <div style={{ display: 'flex', height: 26, borderRadius: 6, overflow: 'hidden', border: '1px solid #e3e3e1' }}>
          {order.filter((l) => bias[l] > 0).map((l) => (
            <div key={l} title={`${LEAN_LABEL[l]}: ${bias[l]} (${pct(bias[l])}%)`}
              style={{ width: `${pct(bias[l])}%`, background: LEAN_COLOR[l], display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: l === 'unknown' ? '#555' : '#fff', fontSize: 11, fontWeight: 800 }}>
              {pct(bias[l]) >= 8 ? `${pct(bias[l])}%` : ''}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          {order.map((l) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#444' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: LEAN_COLOR[l] }} /> {LEAN_LABEL[l]} <b>{bias[l]}</b>
            </span>
          ))}
        </div>
      </section>

      <div style={{ display: 'grid', gap: 26, gridTemplateColumns: '1fr 1fr' }}>
        {/* PERSPECTIVES */}
        <section>
          <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Perspectives ({perspectives.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {perspectives.map((p, i) => (
              <li key={i} style={{ background: '#fff', border: '1px solid #ececea', borderRadius: 8, padding: '9px 11px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <Chip lean={p.lean} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{p.source}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#999' }}>{p.articleCount} art.</span>
                </div>
                <a href={p.sampleUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#444', textDecoration: 'none', lineHeight: 1.3 }}>{p.sampleTitle}</a>
              </li>
            ))}
          </ul>
        </section>

        {/* TIMELINE */}
        <section>
          <h2 style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', color: '#888', margin: '0 0 8px' }}>Timeline ({timeline.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, borderLeft: '2px solid #e3e3e1', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {timeline.map((t, i) => (
              <li key={i} style={{ position: 'relative', paddingLeft: 14 }}>
                <span style={{ position: 'absolute', left: -5, top: 4, width: 8, height: 8, borderRadius: '50%', background: LEAN_COLOR[t.lean] }} />
                <div style={{ fontSize: 10.5, color: '#999', fontVariantNumeric: 'tabular-nums' }}>
                  {t.at ? new Date(t.at).toISOString().slice(0, 16).replace('T', ' ') : 'undated'} · {t.source}
                </div>
                <a href={t.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#1a1a1a', textDecoration: 'none', lineHeight: 1.3 }}>{t.title}</a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

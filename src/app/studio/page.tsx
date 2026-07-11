// Editorial CMS — Desk: the live feed as the editor sees it, with override chips (epic 002).
import { getDeskFeed } from '@/lib/studio/feed';

import { DeskClient } from './desk-client';

export const dynamic = 'force-dynamic';

export default async function Desk() {
  const stories = await getDeskFeed(120);
  const n = (state: string) => stories.filter((s) => s.state === state).length;

  const stat = (count: number, label: string, color = '#111') => (
    <span style={{ fontSize: 12, color: '#666' }}>
      <b style={{ color, fontSize: 15 }}>{count}</b> {label}
    </span>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>Review</h1>
        <div style={{ display: 'flex', gap: 16 }}>
          {stat(n('held'), 'need your OK', '#8a6d1a')}
          {stat(n('live'), 'live', '#2e7d32')}
          {stat(n('top'), 'top', '#1b4b91')}
          {stat(n('hidden'), 'hidden', '#a8141a')}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16 }}>
        Everything the machine wrote in the last 48h. Approve what readers see, pick the top story, hide the rest.
      </p>
      <DeskClient stories={stories} />
    </div>
  );
}

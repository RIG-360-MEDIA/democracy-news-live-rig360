// Editorial CMS — Coming-up queue (E4): ranked-but-not-yet-promoted stories the editor watches.
import { getQueue } from '@/lib/studio/queue';

import { QueueClient } from './queue-client';

export const dynamic = 'force-dynamic';

export default async function Queue() {
  const items = await getQueue(50);
  const generated = items.filter((i) => i.generated).length;
  const pending = items.length - generated;

  const stat = (n: number, label: string, color = '#111') => (
    <span style={{ fontSize: 12, color: '#666' }}>
      <b style={{ color, fontSize: 15 }}>{n}</b> {label}
    </span>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 26, fontWeight: 600 }}>
          Coming-up Queue
        </h1>
        <div style={{ display: 'flex', gap: 16 }}>
          {stat(items.length, 'surfaceable', '#111')}
          {stat(generated, 'generated', '#2e7d32')}
          {stat(pending, 'pending', '#8a6d1a')}
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: '#888', marginBottom: 16 }}>
        Ranked, not yet in Top Stories — surfaceable clusters from the last 24h. Promote one to pin it up front.
      </p>
      <QueueClient items={items} />
    </div>
  );
}

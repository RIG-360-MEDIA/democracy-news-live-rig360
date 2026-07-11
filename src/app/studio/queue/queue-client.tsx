'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { CmsCard, CmsCardGrid } from '@/components/studio/cms-card';
import type { QueueItem } from '@/lib/studio/queue';
import { countryName } from '@/lib/worldwide/country';

export function QueueClient({ items }: { items: QueueItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function promote(storyId: string): Promise<void> {
    setBusy(storyId);
    try {
      const r = await fetch('/api/studio/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, kind: 'pin', rank: 1 }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        alert('Promote failed: ' + (j?.error?.message ?? r.status));
      } else {
        start(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter((i) => i.title.toLowerCase().includes(needle) || i.topic.toLowerCase().includes(needle) || i.country.toLowerCase().includes(needle))
    : items;

  const promoteBtn: React.CSSProperties = {
    width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    fontSize: 12.5, fontWeight: 700, padding: '9px 6px', borderRadius: 8,
    border: '1px solid #c9dcf5', background: '#fff', color: '#1b4b91', cursor: 'pointer',
  };

  return (
    <div>
      <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13.5, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>
        Coming up next — substantial stories the machine has clustered but not yet promoted.
        <b> Promote</b> one to pin it to the top of the reader feed.
      </p>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search titles, topics, countries…"
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 9, marginBottom: 20, fontSize: 13.5 }}
      />
      <div style={{ opacity: pending ? 0.55 : 1, transition: 'opacity .15s' }}>
        <CmsCardGrid>
          {shown.map((i) => (
            <CmsCard
              key={i.storyId}
              href={`/studio/story/${i.storyId}`}
              image={i.image}
              kicker={`${i.topic} · ${countryName(i.country) || i.country} · ${i.articleCount} articles · ${i.sources} sources`}
              headline={i.title}
              badge={i.generated ? { label: 'READY', bg: '#e8f5e9', fg: '#2e7d32' } : { label: 'PENDING GEN', bg: '#fff4d6', fg: '#8a6d1a' }}
              footer={
                <button style={promoteBtn} disabled={busy !== null} onClick={() => promote(i.storyId)}>
                  📌 Promote to top
                </button>
              }
            />
          ))}
        </CmsCardGrid>
      </div>
      {shown.length === 0 && <p style={{ color: '#999', padding: 40, textAlign: 'center' }}>No stories in the queue.</p>}
    </div>
  );
}

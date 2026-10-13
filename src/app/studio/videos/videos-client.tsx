'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { PlaylistVideo } from '@/lib/youtube/client';

const EXPIRE_H = 36;
const card: React.CSSProperties = { border: '1px solid #e4e0d8', borderRadius: 10, background: '#fff', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const btn = (fg: string, border: string): React.CSSProperties => ({
  flex: 1, fontSize: 12.5, fontWeight: 700, padding: '9px 6px', borderRadius: 8, border: `1px solid ${border}`, background: '#fff', color: fg, cursor: 'pointer',
});

function age(iso: string): { text: string; urgent: boolean } {
  const h = (Date.now() - Date.parse(iso)) / 3_600_000;
  const left = EXPIRE_H - h;
  return { text: h < 1 ? `${Math.max(1, Math.round(h * 60))} min ago` : `${Math.floor(h)} h ago · expires in ${Math.max(0, Math.ceil(left))} h`, urgent: left < 6 };
}

function VideoCard({ v, children }: { v: PlaylistVideo; children?: React.ReactNode }) {
  const [desc, setDesc] = useState(false);
  return (
    <div style={card}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', background: '#000' }}>
        <iframe title={v.title} src={`https://www.youtube-nocookie.com/embed/${v.videoId}?rel=0&modestbranding=1`}
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      </div>
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#a8141a' }}>{v.kicker}</span>
        <b style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 16, lineHeight: 1.2 }}>{v.title}</b>
        <span style={{ fontSize: 12, color: '#666', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {v.storyId ? <a href={`/long-read/${v.storyId}`} target="_blank" rel="noreferrer" style={{ color: '#1b4b91' }}>Story page ↗</a> : <span>No story link in the description</span>}
          <a href={`https://www.youtube.com/watch?v=${v.videoId}`} target="_blank" rel="noreferrer" style={{ color: '#1b4b91' }}>YouTube ↗</a>
          <button type="button" onClick={() => setDesc(!desc)} style={{ border: 0, background: 'none', padding: 0, color: '#1b4b91', cursor: 'pointer', fontSize: 12 }}>
            {desc ? 'Hide' : 'Show'} description
          </button>
        </span>
        {desc && <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 12, color: '#444', background: '#faf8f4', padding: 8, borderRadius: 6, margin: 0 }}>{v.description}</pre>}
        {children}
      </div>
    </div>
  );
}

export function VideosClient({ pending, published }: { pending: PlaylistVideo[]; published: PlaylistVideo[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  async function act(videoId: string, kind: 'approve' | 'reject', body?: unknown): Promise<void> {
    setBusy(videoId);
    try {
      const r = await fetch(`/api/studio/videos/${videoId}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) alert(`${kind === 'approve' ? 'Approve' : 'Reject'} failed: ${j?.error?.message ?? r.status}`);
      else {
        setRejecting(null);
        setReason('');
        start(() => router.refresh());
      }
    } finally {
      setBusy(null);
    }
  }

  const grid: React.CSSProperties = { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', marginBottom: 28 };
  return (
    <div>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#8a6d1a', margin: '6px 0 10px' }}>Awaiting approval</h2>
      {pending.length === 0 && <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Nothing waiting. New videos arrive here after each evening&apos;s run.</p>}
      <div style={grid}>
        {pending.map((v) => {
          const a = age(v.addedAt);
          return (
            <VideoCard key={v.videoId} v={v}>
              <span style={{ fontSize: 11.5, color: a.urgent ? '#a8141a' : '#888' }}>Uploaded {a.text}</span>
              {rejecting === v.videoId ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto' }}>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} autoFocus
                    placeholder="Why reject? (kept in the audit log)" style={{ fontSize: 12.5, padding: 8, borderRadius: 6, border: '1px solid #ddd' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={busy === v.videoId || !reason.trim()} onClick={() => act(v.videoId, 'reject', { reason })} style={btn('#a8141a', '#f0c9c9')}>
                      {busy === v.videoId ? 'Deleting…' : 'Delete from YouTube'}
                    </button>
                    <button type="button" onClick={() => { setRejecting(null); setReason(''); }} style={btn('#555', '#ddd')}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                  <button type="button" disabled={busy === v.videoId} onClick={() => act(v.videoId, 'approve')} style={btn('#2e7d32', '#cfe5d0')}>
                    {busy === v.videoId ? 'Approving…' : 'Approve'}
                  </button>
                  <button type="button" disabled={busy === v.videoId} onClick={() => setRejecting(v.videoId)} style={btn('#a8141a', '#f0c9c9')}>Reject</button>
                </div>
              )}
            </VideoCard>
          );
        })}
      </div>
      <h2 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#2e7d32', margin: '6px 0 10px' }}>Published recently</h2>
      {published.length === 0 && <p style={{ fontSize: 13, color: '#888' }}>None yet.</p>}
      <div style={grid}>{published.map((v) => <VideoCard key={v.videoId} v={v} />)}</div>
    </div>
  );
}

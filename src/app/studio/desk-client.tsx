'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import type { DeskState, DeskStory } from '@/lib/studio/types';

// One pill per true state — what readers actually get right now.
const STATE: Record<DeskState, { bg: string; fg: string; label: string }> = {
  top: { bg: '#e6f0ff', fg: '#1b4b91', label: '📌 TOP STORY' },
  live: { bg: '#e8f5e9', fg: '#2e7d32', label: '● LIVE' },
  held: { bg: '#fff4d6', fg: '#8a6d1a', label: '● NEEDS YOUR OK' },
  hidden: { bg: '#ececec', fg: '#777777', label: '● HIDDEN' },
};

const TABS: { key: DeskState | 'all'; label: string; hint?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'held', label: 'Needs approval', hint: 'The machine held these back — publish the ones you want readers to see.' },
  { key: 'live', label: 'Live' },
  { key: 'top', label: 'Top' },
  { key: 'hidden', label: 'Hidden' },
];

export function DeskClient({ stories }: { stories: DeskStory[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<DeskState | 'all'>('all');
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);

  // Every action confirms its real effect — no more silent clicks.
  async function act(storyId: string, kind: string, note: string, extra: Record<string, unknown> = {}): Promise<void> {
    setBusy(storyId + kind);
    try {
      const r = await fetch('/api/studio/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, kind, ...extra }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => null);
        setToast({ text: 'Could not do that: ' + (j?.error?.message ?? r.status), bad: true });
      } else {
        setToast({ text: note });
        start(() => router.refresh());
      }
    } catch {
      setToast({ text: 'Network error — nothing changed.', bad: true });
    } finally {
      setBusy(null);
      window.clearTimeout((act as unknown as { _t?: number })._t);
      (act as unknown as { _t?: number })._t = window.setTimeout(() => setToast(null), 4500);
    }
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: stories.length, top: 0, live: 0, held: 0, hidden: 0 };
    for (const s of stories) c[s.state]++;
    return c;
  }, [stories]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return stories.filter((s) => {
      if (tab !== 'all' && s.state !== tab) return false;
      if (!needle) return true;
      return (
        s.headline.toLowerCase().includes(needle) ||
        s.topic.toLowerCase().includes(needle) ||
        s.country.toLowerCase().includes(needle)
      );
    });
  }, [stories, tab, q]);

  return (
    <div>
      {/* ── One-line guidance ── */}
      <p style={{ fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13.5, color: '#555', margin: '0 0 16px', lineHeight: 1.55 }}>
        The machine wrote these. Each card shows its status. <b style={{ color: '#8a6d1a' }}>Publish</b> the ones under
        “Needs approval” to put them live, <b style={{ color: '#1b4b91' }}>Make top story</b> to lead the front page, or
        <b style={{ color: '#a8141a' }}> Unpublish</b> to hide. Readers see changes on their next refresh.
      </p>

      {/* ── Triage tabs ── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {TABS.map((t) => {
          const active = tab === t.key;
          const n = counts[t.key] ?? 0;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.hint}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 13px', borderRadius: 999,
                border: `1px solid ${active ? '#111' : '#e0e0e0'}`, background: active ? '#111' : '#fff',
                color: active ? '#fff' : '#333', cursor: 'pointer',
                fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12.5, fontWeight: 700,
              }}
            >
              {t.label}
              <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, opacity: 0.7 }}>{n}</span>
            </button>
          );
        })}
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search headlines, topics, countries…"
        style={{ width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 9, marginBottom: 20, fontSize: 13.5 }}
      />

      {/* ── News-card grid ── */}
      <div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        style={{ gap: 20, opacity: pending ? 0.55 : 1, transition: 'opacity .15s' }}
      >
        {shown.map((s) => (
          <DeskCard key={s.storyId} s={s} busy={busy !== null} act={act} />
        ))}
      </div>
      {shown.length === 0 && <p style={{ color: '#999', padding: 40, textAlign: 'center' }}>No stories here.</p>}

      {/* ── Confirmation toast ── */}
      {toast && (
        <div
          role="status"
          style={{
            position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 50,
            background: toast.bad ? '#a8141a' : '#111', color: '#fff', padding: '11px 18px', borderRadius: 999,
            fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 13, fontWeight: 600,
            boxShadow: '0 6px 24px rgba(0,0,0,0.25)', maxWidth: '90vw',
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}

type Act = (id: string, kind: string, note: string, extra?: Record<string, unknown>) => void;

function DeskCard({ s, busy, act }: { s: DeskStory; busy: boolean; act: Act }) {
  const st = STATE[s.state];
  const onSite = s.state === 'live' || s.state === 'top';
  const isTop = s.state === 'top';
  const dimmed = s.state === 'hidden';
  const href = `/studio/story/${s.storyId}`;

  const primary: React.CSSProperties = {
    flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
    fontSize: 12, fontWeight: 700, padding: '9px 6px', borderRadius: 8, border: '1px solid #e2e2e2',
    background: '#fff', color: '#222', cursor: 'pointer', textDecoration: 'none', whiteSpace: 'nowrap',
  };
  const mini: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer', color: '#8a8a8a', fontSize: 11.5, fontWeight: 600, padding: '2px 4px',
  };

  return (
    <div style={{ border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Thumbnail + status */}
      <Link href={href} style={{ display: 'block', position: 'relative' }} aria-label={s.headline}>
        <img
          src={s.image ?? '/cards/long-read.png'}
          alt=""
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', background: '#eee', display: 'block', opacity: dimmed ? 0.5 : 1 }}
          onError={(e) => { const t = e.currentTarget; if (t.dataset.fb) return; t.dataset.fb = '1'; t.src = '/cards/long-read.png'; }}
        />
        <span style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'var(--font-mono), monospace', fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', color: st.fg, background: st.bg, padding: '3px 8px', borderRadius: 5, boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}>
          {st.label}
        </span>
        {s.humanLocked && (
          <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, background: 'rgba(255,255,255,0.9)', padding: '3px 6px', borderRadius: 5 }} title="Locked — the generator won't overwrite your edits">🔒</span>
        )}
      </Link>

      {/* Body */}
      <div style={{ padding: '13px 14px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, fontWeight: 700, letterSpacing: '.06em', color: '#1b4b91', textTransform: 'uppercase', marginBottom: 7 }}>
          {s.topic} · {s.country} · {s.wordCount}w{s.edited ? ' · ✎ edited' : ''}
        </div>
        <Link href={href} style={{ textDecoration: 'none' }}>
          <h3 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 17, fontWeight: 600, lineHeight: 1.2, color: dimmed ? '#999' : '#111', textDecoration: dimmed ? 'line-through' : 'none', margin: 0, textWrap: 'balance' }}>
            {s.headline}
          </h3>
        </Link>

        {/* Actions — three plain choices */}
        <div style={{ marginTop: 'auto', paddingTop: 14 }}>
          <div style={{ display: 'flex', gap: 7 }}>
            {onSite ? (
              <button
                style={{ ...primary, borderColor: '#f0c9c7', color: '#a8141a' }}
                disabled={busy}
                title="Hide this story from readers"
                onClick={() => act(s.storyId, 'unpublish', 'Hidden from readers.')}
              >
                Unpublish
              </button>
            ) : (
              <button
                style={{ ...primary, borderColor: '#cbe3cc', color: '#2e7d32' }}
                disabled={busy}
                title={s.state === 'held' ? 'Approve and put this on the site' : 'Put this back on the site'}
                onClick={() => act(s.storyId, 'publish', '✓ Published — readers see it on the next refresh.')}
              >
                ✓ Publish
              </button>
            )}

            {isTop ? (
              <button
                style={{ ...primary, borderColor: '#c9dcf5', color: '#1b4b91' }}
                disabled={busy}
                title="Return to normal ranking (stays published)"
                onClick={() => act(s.storyId, 'unpin', 'Removed from top — back to normal ranking (still published).')}
              >
                Remove from top
              </button>
            ) : (
              <button
                style={{ ...primary, borderColor: '#c9dcf5', color: '#1b4b91' }}
                disabled={busy}
                title="Make this the #1 story readers see (publishes it too)"
                onClick={() => act(s.storyId, 'pin', '★ Now the top story — it leads the front page.', { rank: 1 })}
              >
                ★ Make top story
              </button>
            )}

            <Link href={href} style={{ ...primary, flex: '0 0 auto' }} title="Edit headline, text, section">
              ✎ Edit
            </Link>
          </div>

          {/* Advanced — rarely needed */}
          <div style={{ display: 'flex', gap: 12, marginTop: 9, justifyContent: 'center', borderTop: '1px solid #f2f2f2', paddingTop: 9 }}>
            <button
              style={mini}
              disabled={busy}
              title={s.humanLocked ? 'Allow the machine to update this again' : 'Freeze — the machine won’t overwrite it'}
              onClick={() => act(s.storyId, 'lock', s.humanLocked ? 'Unlocked — the machine can update it again.' : 'Locked — the machine won’t overwrite it.', { locked: !s.humanLocked })}
            >
              {s.humanLocked ? '🔓 Unlock' : '🔒 Lock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

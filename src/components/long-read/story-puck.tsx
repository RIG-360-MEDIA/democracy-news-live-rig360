'use client';

// The per-story control puck shown on hover in curate mode. Writes to the editorial override
// layer (automation proposes / editor disposes) and optimistically refreshes the page so the
// hard placement / removal is reflected immediately. Phase 1 actions: make top headline, edit, remove.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const chip: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 30, height: 30, borderRadius: 7, border: 'none', cursor: 'pointer',
  fontSize: 15, lineHeight: 1, background: 'rgba(13,10,8,0.92)', color: '#fff', textDecoration: 'none',
};

export function StoryPuck({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(kind: string, extra: Record<string, unknown>, e: React.MouseEvent): Promise<void> {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      await fetch('/api/studio/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, kind, ...extra }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ position: 'absolute', top: -14, right: -6, display: 'flex', gap: 4, padding: 4, borderRadius: 10, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(4px)', boxShadow: '0 3px 12px rgba(0,0,0,0.2)', zIndex: 30, pointerEvents: busy ? 'none' : 'auto' }}
      onClick={(e) => e.preventDefault()}
    >
      <button title="Make top headline" aria-label="Make top headline" style={chip} onClick={(e) => act('pin', { rank: 1 }, e)}>★</button>
      <Link href={`/studio/story/${storyId}`} title="Edit story" aria-label="Edit story" style={chip} onClick={(e) => e.stopPropagation()}>✎</Link>
      <button title="Remove from feed" aria-label="Remove from feed" style={{ ...chip, background: 'rgba(168,20,26,0.94)' }} onClick={(e) => act('kill', {}, e)}>✕</button>
    </span>
  );
}

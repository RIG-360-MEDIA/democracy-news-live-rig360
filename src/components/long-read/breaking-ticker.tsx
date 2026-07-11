'use client';

import { useEffect, useState } from 'react';

import type { TickerItem } from '@/app/api/ticker/route';

// Live breaking strip — freshest articles, refreshed every 45s, seamless marquee.
export function BreakingTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/ticker', { cache: 'no-store' });
        const j = await r.json();
        if (alive && j?.ok && Array.isArray(j.data)) setItems(j.data as TickerItem[]);
      } catch {
        /* keep the last good set on a hiccup */
      }
    };
    load();
    const id = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (items.length === 0) return null;
  const loop = [...items, ...items]; // duplicated so the scroll wraps seamlessly

  return (
    <div style={{ borderTop: '1px solid var(--rw-rule)', borderBottom: '2px solid var(--rw-ink)', background: 'var(--rw-bg)', display: 'flex', alignItems: 'stretch', overflow: 'hidden', height: 46 }}>
      {/* Fixed BREAKING flag */}
      <span className="dnl-breaking-flag" style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--rw-red)', color: '#fff', padding: '0 18px', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 12, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        <span className="dnl-pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
        Breaking
      </span>
      {/* Scrolling viewport with soft edge-fade */}
      <div
        style={{
          overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)',
          maskImage: 'linear-gradient(to right, transparent, #000 4%, #000 96%, transparent)',
        }}
      >
        <div className="dnl-ticker-track" style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
          {loop.map((it, i) => (
            <span key={`${it.id}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '0 32px', fontFamily: 'var(--font-jakarta), sans-serif', fontSize: 15.5 }}>
              {/* red accent tick replaces the slash separator */}
              <span style={{ width: 3, height: 17, borderRadius: 2, background: 'var(--rw-red)', display: 'inline-block', flex: '0 0 auto' }} />
              <span style={{ color: 'var(--rw-ink)', fontWeight: 600, letterSpacing: '-0.004em' }}>{it.title}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

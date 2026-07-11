'use client';

import Link from 'next/link';

export function CurateBar({ editor }: { editor: string }) {
  return (
    <div
      style={{
        position: 'sticky', top: 0, zIndex: 60, display: 'flex', alignItems: 'center', gap: 16,
        padding: '9px 20px', background: '#0d0a08', color: '#fff',
        fontFamily: 'var(--font-jakarta), system-ui, sans-serif', fontSize: 12.5,
      }}
    >
      <span style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: 11 }}>
        Curate
      </span>
      <span style={{ opacity: 0.72 }}>
        Hover any story → <b style={{ color: '#fff' }}>★</b> make top headline · <b style={{ color: '#fff' }}>✎</b> edit · <b style={{ color: '#fff' }}>✕</b> remove
      </span>
      <span style={{ marginLeft: 'auto', opacity: 0.6, fontFamily: 'var(--font-mono), monospace', fontSize: 11 }}>{editor}</span>
      <Link href="/studio" style={{ color: '#e0837d', textDecoration: 'none', fontWeight: 700 }}>← Studio</Link>
    </div>
  );
}

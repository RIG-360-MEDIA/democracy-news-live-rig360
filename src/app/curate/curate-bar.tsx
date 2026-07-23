'use client';

import Link from 'next/link';

import { SegmentedToggle } from '@/components/studio/ui';

export type CurateView = 'reader' | 'editor';

interface CurateBarProps {
  editor: string;
  view: CurateView;
  onViewChange: (view: CurateView) => void;
  onOpenSections: () => void;
}

const VIEW_OPTIONS = [
  { key: 'reader' as const, label: 'Reader view' },
  { key: 'editor' as const, label: 'Editor view' },
];

export function CurateBar({ editor, view, onViewChange, onOpenSections }: CurateBarProps) {
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

      <SegmentedToggle options={VIEW_OPTIONS} value={view} onChange={onViewChange} ariaLabel="Curate view" />

      {view === 'editor' && (
        <span style={{ opacity: 0.72 }}>
          Drag stories to reorder · drop onto <b style={{ color: '#fff' }}>Lead #1</b> · click a headline or thumbnail to edit
        </span>
      )}

      <button
        type="button"
        onClick={onOpenSections}
        disabled={view !== 'editor'}
        style={{
          marginLeft: 'auto', background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.35)',
          padding: '4px 10px', fontSize: 12, cursor: view === 'editor' ? 'pointer' : 'default',
          opacity: view === 'editor' ? 1 : 0.4,
        }}
      >
        Sections
      </button>

      <span style={{ opacity: 0.6, fontFamily: 'var(--font-mono), monospace', fontSize: 11 }}>{editor}</span>
      <Link href="/studio" style={{ color: '#e0837d', textDecoration: 'none', fontWeight: 700 }}>← Studio</Link>
    </div>
  );
}

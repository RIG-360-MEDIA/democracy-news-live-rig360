import Link from 'next/link';

import { apiScope } from '@/lib/worldwide/to-view';

import { SCOPE_OPTIONS, isWorldScope } from './worldwide-scope-data';

/* ═════════════════════════════════════════════════════════════════
   SCOPE TOGGLE — World / nation switch as a compact dropdown (native
   <details>, no JS). Server-driven: each item links to
   /long-read?scope=<key> and the page re-renders scoped. Region is by
   SUBJECT (worldwide-build-spec §2). Lives inline in the top bar so it
   costs no vertical band.
═════════════════════════════════════════════════════════════════ */

const ACCENT = 'var(--rw-accent)';
const INK = 'var(--rw-ink)';
const RULE = 'var(--rw-rule)';

interface ScopeFilterProps {
  /** the active API scope ('world' | 'IN' | ...) as returned by getFrontPage */
  activeKey: string;
}

export function ScopeFilter({ activeKey }: ScopeFilterProps) {
  const active = SCOPE_OPTIONS.find((opt) => apiScope(opt.key) === activeKey) ?? SCOPE_OPTIONS[0];
  return (
    <details className="scope-toggle relative" style={{ fontFamily: 'var(--font-jakarta), sans-serif' }}>
      <summary
        className="inline-flex items-center gap-1.5 cursor-pointer select-none hover:opacity-70"
        style={{ listStyle: 'none', color: INK, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.06em' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
        </svg>
        <span style={{ textTransform: 'uppercase' }}>{active.label}</span>
        <span aria-hidden style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </summary>
      <nav
        aria-label="Edition scope"
        className="absolute left-0 mt-2 py-1 z-20"
        style={{ background: 'var(--rw-bg)', border: `1px solid ${RULE}`, borderRadius: 8, minWidth: 180, boxShadow: '0 8px 28px rgba(0,0,0,0.10)' }}
      >
        {SCOPE_OPTIONS.map((opt) => {
          const isActive = apiScope(opt.key) === activeKey;
          const href = isWorldScope(opt.key) ? '/long-read' : `/long-read?scope=${opt.key}`;
          return (
            <Link
              key={opt.key}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="block hover:bg-black/[0.04] transition-colors"
              style={{
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? ACCENT : 'var(--rw-body)',
              }}
            >
              {opt.label}
            </Link>
          );
        })}
      </nav>
    </details>
  );
}

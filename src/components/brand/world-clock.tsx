'use client';

import { useEffect, useState } from 'react';

// One glowing pill that flips through the zones — cycles UTC → LONDON → NEW YORK → DELHI, ticking every second.
const ZONES: { label: string; tz: string }[] = [
  { label: 'UTC', tz: 'UTC' },
  { label: 'LONDON', tz: 'Europe/London' },
  { label: 'NEW YORK', tz: 'America/New_York' },
  { label: 'DELHI', tz: 'Asia/Kolkata' },
];

function fmt(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(d);
}

export function WorldClock({ style }: { style?: React.CSSProperties }) {
  const [now, setNow] = useState<Date | null>(null); // null until mounted → no hydration mismatch
  const [zi, setZi] = useState(0);

  useEffect(() => {
    setNow(new Date());
    const tick = setInterval(() => setNow(new Date()), 1000);
    const flip = setInterval(() => setZi((z) => (z + 1) % ZONES.length), 3500);
    return () => {
      clearInterval(tick);
      clearInterval(flip);
    };
  }, []);

  const z = ZONES[zi];
  const [h, m, s] = (now ? fmt(now, z.tz) : '--:--:--').split(':');

  return (
    <div
      suppressHydrationWarning
      style={{
        perspective: 600, display: 'inline-flex', alignItems: 'stretch', overflow: 'hidden',
        border: `1.5px solid var(--rw-ink)`, borderRadius: 3, ...style,
      }}
    >
      {/* Solid red "flag" cell — matches the BREAKING flag / Live wordmark */}
      <span style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--rw-red)', padding: '0 8px' }}>
        <span className="dnl-pulse" aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
      </span>
      {/* keyed by zone → remounts on flip so the CSS flip plays; seconds tick without remounting */}
      <div key={zi} className="dnl-flip" style={{ display: 'inline-flex', alignItems: 'baseline', gap: 9, padding: '4px 12px', transformStyle: 'preserve-3d' }}>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: 'var(--rw-ink)', minWidth: 62, flex: '0 0 auto' }}>
          {z.label}
        </span>
        <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 16, fontWeight: 800, color: 'var(--rw-ink)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em' }}>
          {h}
          <span className="dnl-blink" style={{ color: 'var(--rw-red)' }}>:</span>
          {m}
          <span className="dnl-blink" style={{ color: 'var(--rw-red)' }}>:</span>
          <span style={{ color: 'var(--rw-red)' }}>{s}</span>
        </span>
      </div>
    </div>
  );
}

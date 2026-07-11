import Link from 'next/link';

interface WordmarkProps {
  size?:      'sm' | 'md' | 'lg' | 'xl';
  href?:      string | null;
  className?: string;
  /** Colour of the "Rig" word. Defaults to coal-black; the reader passes a
      theme var so the wordmark stays visible in dark mode. */
  rigColor?:  string;
}

/* Bricolage Grotesque, max Black weight.
   FIRE wordmark — bright vermilion at the top fading through deep
   crimson to charred near-black at the bottom of each letter, like
   flames burning down into coal. Both words share the same gradient
   so the whole name reads as one continuous fire. A soft red glow
   drop-shadow around the letters adds an ember halo. */

const SIZES = {
  sm: 22,
  md: 36,
  lg: 52,
  xl: 78,
} as const;

/* Two-tone editorial — coal-black "Rig" + deep arterial red "Wire".
   The fire is in the colour pairing itself, not in a flame illustration.
   Solid colours, no gradients — clean, dignified, masthead-grade.
     Rig  → coal black (with a hair of warmth)
     Wire → deep editorial red, like WSJ / Economist red */
const RIG_COLOR  = '#0d0a08';   /* warm coal black */
const WIRE_COLOR = '#a8141a';   /* deep editorial red */

export function Wordmark({
  size      = 'md',
  href      = '/',
  className = '',
  rigColor  = RIG_COLOR,
}: WordmarkProps) {
  const fontSize = SIZES[size];

  const baseStyle: React.CSSProperties = {
    fontFamily:    'var(--font-bricolage), system-ui, -apple-system, sans-serif',
    fontSize,
    fontWeight:    800,
    letterSpacing: '-0.035em',
    lineHeight:    0.95,
    fontVariationSettings: "'wdth' 100, 'opsz' 96",
  };

  const inner = (
    <span
      className={`whitespace-nowrap inline-block ${className}`}
      style={{ lineHeight: 0.95 }}
    >
      <span style={{ ...baseStyle, color: rigColor  }}>Rig</span>
      {' '}
      <span style={{ ...baseStyle, color: WIRE_COLOR }}>Wire</span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link
      href={href}
      className="inline-flex group hover:opacity-85 transition-opacity"
      aria-label="Rig Wire — home"
    >
      {inner}
    </Link>
  );
}

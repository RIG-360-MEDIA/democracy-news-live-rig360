import type { TrustTier } from '@/lib/dispatch/types';

// Source trust-tier badge. Mirrors the Door B trust tiers (1|2|3):
//   T1 solid  — highest-trust source, filled ink
//   T2 outline — mid trust, ink border
//   T3 hollow  — lowest trust, muted hairline
// Studio tokens only; no accent (trust is not an alarm state).

export interface TrustBadgeProps {
  tier: TrustTier;
  className?: string;
}

const STYLES: Record<TrustTier, string> = {
  1: 'border-studio-ink bg-studio-ink text-studio-paper',
  2: 'border-studio-ink text-studio-ink',
  3: 'border-studio-rule text-studio-muted',
};

export default function TrustBadge({ tier, className }: TrustBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center border px-1.5 font-mono text-ui-sm font-semibold uppercase tracking-wider',
        STYLES[tier],
        className ?? '',
      ].join(' ')}
      title={`Trust tier ${tier}`}
    >
      T{tier}
    </span>
  );
}

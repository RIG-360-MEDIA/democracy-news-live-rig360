'use client';

// Segmented control / tab bar for RigWire Studio (Create's Manual|Topic,
// Newsroom's Next-up|Live|Held). Quiet rectangular segments, hairline rules,
// dark-red underline on the active segment. Generic over the option key.

export interface SegmentedOption<K extends string> {
  key: K;
  label: string;
  count?: number;
}

export interface SegmentedToggleProps<K extends string> {
  options: ReadonlyArray<SegmentedOption<K>>;
  value: K;
  onChange: (key: K) => void;
  /** Accessible label for the tablist. */
  ariaLabel?: string;
  className?: string;
}

export default function SegmentedToggle<K extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: SegmentedToggleProps<K>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-stretch border border-studio-rule bg-studio-paper ${className ?? ''}`}
    >
      {options.map((opt, i) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={[
              'font-sans text-ui-sm font-semibold px-4 py-2 transition-colors',
              i > 0 ? 'border-l border-studio-rule' : '',
              active
                ? 'text-studio-ink border-b-2 border-b-studio-accent'
                : 'text-studio-muted hover:text-studio-ink border-b-2 border-b-transparent',
            ].join(' ')}
          >
            {opt.label}
            {typeof opt.count === 'number' && (
              <span className="ml-2 font-mono text-ui-sm text-studio-muted">{opt.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Big dark-red serif numeral for Newsroom "Next up" positions (1 / 2 / 3).
// Fraunces display, the single studio accent. Purely decorative — the position
// is conveyed textually by the surrounding row, so this is aria-hidden.

export interface QueueNumeralProps {
  value: number;
  /** Tailwind display-size utility (default d-lg). */
  size?: string;
  className?: string;
}

export default function QueueNumeral({
  value,
  size = 'text-d-lg',
  className,
}: QueueNumeralProps) {
  return (
    <span
      aria-hidden
      className={[
        'font-display font-semibold tabular-nums text-studio-accent',
        size,
        className ?? '',
      ].join(' ')}
    >
      {value}
    </span>
  );
}

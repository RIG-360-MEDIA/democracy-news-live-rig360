// Small status pill for Studio. States span the Door B job lifecycle plus the
// desk's reader-facing states. Studio tokens only; the dark-red accent is
// reserved for live/urgent/destructive (live, failed) — everything else is
// quiet ink/muted on hairline rules.

export type StatusState =
  | 'queued'
  | 'gathering'
  | 'drafting'
  | 'verifying'
  | 'ready'
  | 'failed'
  | 'live'
  | 'held'
  | 'published';

export interface StatusChipProps {
  state: StatusState;
  /** Override the default label text (defaults to the state name). */
  label?: string;
  className?: string;
}

// Quiet by default (muted text, hairline border). Accent only where the design
// language allows it. `ready`/`published`/`live` read as "done" via solid ink.
const STYLES: Record<StatusState, string> = {
  queued: 'border-studio-rule text-studio-muted',
  gathering: 'border-studio-rule text-studio-muted',
  drafting: 'border-studio-rule text-studio-muted',
  verifying: 'border-studio-rule text-studio-muted',
  held: 'border-studio-muted text-studio-ink',
  ready: 'border-studio-ink bg-studio-ink text-studio-paper',
  published: 'border-studio-ink bg-studio-ink text-studio-paper',
  live: 'border-studio-accent bg-studio-accent text-studio-paper',
  failed: 'border-studio-accent text-studio-accent',
};

const DEFAULT_LABEL: Record<StatusState, string> = {
  queued: 'Queued',
  gathering: 'Gathering',
  drafting: 'Drafting',
  verifying: 'Verifying',
  ready: 'Ready',
  failed: 'Failed',
  live: 'Live',
  held: 'Held',
  published: 'Published',
};

export default function StatusChip({ state, label, className }: StatusChipProps) {
  return (
    <span
      className={[
        'inline-flex items-center border px-2 py-0.5 font-mono text-ui-sm uppercase tracking-wider',
        STYLES[state],
        className ?? '',
      ].join(' ')}
    >
      {label ?? DEFAULT_LABEL[state]}
    </span>
  );
}

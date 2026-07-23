// Editorial CMS — Audit row detail: a tiny inline field-level differ (no external
// dep) and the Door B flag-resolution record. Plain ledger styling: mono, hairline
// rows, the dark-red accent reserved for removed values, a quiet green for adds.
import { Fragment } from 'react';

import type { DoorBPublishRecord } from '@/lib/studio/audit';
import type { EditorialOverride } from '@/lib/studio/types';

const MAX_VALUE_CHARS = 200;

// Adds render in a quiet ledger green. There is no studio-green token (accent is
// reserved for removals/destructive), so this single arbitrary value is the add colour.
const ADD_CLASS = 'text-[#1b6b2e]';

const DIFF_FIELDS: ReadonlyArray<{ key: keyof EditorialOverride; label: string }> = [
  { key: 'action', label: 'action' },
  { key: 'pinnedRank', label: 'pinned rank' },
  { key: 'importanceDelta', label: 'importance' },
  { key: 'sectionOverride', label: 'section' },
  { key: 'humanLocked', label: 'locked' },
  { key: 'editedHeadline', label: 'headline' },
  { key: 'editedDek', label: 'dek' },
  { key: 'editedBody', label: 'body' },
  { key: 'editedTags', label: 'tags' },
  { key: 'editedImage', label: 'image' },
  { key: 'reason', label: 'reason' },
];

/** Render a scalar/array/boolean field value as one compact, truncated string. */
function scalar(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  const s = String(v);
  return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}…` : s;
}

/** Deep value used inside the flag record, where entries may be objects/arrays. */
function scalarDeep(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > MAX_VALUE_CHARS ? `${s.slice(0, MAX_VALUE_CHARS)}…` : s;
  }
  return scalar(v);
}

function present(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function eq(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

interface OverrideDiffProps {
  before: EditorialOverride | null;
  after: EditorialOverride | null;
}

/** Field-level before/after diff. Only changed fields are shown. */
export function OverrideDiff({ before, after }: OverrideDiffProps) {
  const changed = DIFF_FIELDS.filter((f) => !eq(before?.[f.key], after?.[f.key]));

  if (changed.length === 0) {
    return <p className="font-mono text-ui-sm text-studio-muted">No field-level changes recorded.</p>;
  }

  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 font-mono text-ui-sm">
      {changed.map((f) => {
        const oldV = before?.[f.key];
        const newV = after?.[f.key];
        const hadOld = present(oldV);
        const hasNew = present(newV);
        return (
          <Fragment key={String(f.key)}>
            <dt className="uppercase tracking-wider text-studio-muted">{f.label}</dt>
            <dd className="flex flex-wrap items-baseline gap-x-2 break-words">
              {hadOld && <span className="text-studio-accent line-through">{scalar(oldV)}</span>}
              {hadOld && hasNew && <span className="text-studio-muted">→</span>}
              {hasNew && <span className={ADD_CLASS}>{scalar(newV)}</span>}
              {!hadOld && !hasNew && <span className="text-studio-muted">cleared</span>}
            </dd>
          </Fragment>
        );
      })}
    </dl>
  );
}

/** Render the Door B flag-resolution summary, whatever shape it takes. */
function FlagSummary({ value }: { value: unknown }) {
  if (!present(value)) {
    return <span className="text-studio-muted">none recorded</span>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="flex flex-col gap-0.5">
        {value.map((v, i) => (
          <li key={i}>{scalarDeep(v)}</li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object' && value !== null) {
    return (
      <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1">
        {Object.entries(value).map(([k, v]) => (
          <Fragment key={k}>
            <dt className="uppercase tracking-wider text-studio-muted">{k}</dt>
            <dd className="break-words text-studio-ink">{scalarDeep(v)}</dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  return <span className="text-studio-ink">{scalar(value)}</span>;
}

interface DoorBRecordProps {
  after: DoorBPublishRecord | null;
}

/** Door B publish rows: show the job/version and the flag-resolution record. */
export function DoorBRecord({ after }: DoorBRecordProps) {
  if (!after) {
    return <p className="font-mono text-ui-sm text-studio-muted">No publish record captured.</p>;
  }
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-4 gap-y-1.5 font-mono text-ui-sm">
      <dt className="uppercase tracking-wider text-studio-muted">job</dt>
      <dd className="break-words text-studio-ink">{scalar(after.job_id)}</dd>
      <dt className="uppercase tracking-wider text-studio-muted">version</dt>
      <dd className="text-studio-ink">{scalar(after.version)}</dd>
      <dt className="uppercase tracking-wider text-studio-muted">flags</dt>
      <dd className="break-words text-studio-ink">
        <FlagSummary value={after.flags_summary} />
      </dd>
    </dl>
  );
}

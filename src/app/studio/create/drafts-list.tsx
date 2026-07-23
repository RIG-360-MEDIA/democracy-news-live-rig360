'use client';

// "My Drafts" — the editor's own Door B jobs, freshest first. Each row shows a
// status chip, the current phase detail, and when it last moved; a ready draft
// links through to the review screen. Presentational: the polling hook owns the
// data, this just renders it.

import Link from 'next/link';

import { StatusChip } from '@/components/studio/ui';
import { fmtStamp } from '@/lib/studio/time';

import type { StatusState } from '@/components/studio/ui';
import type { JobState, JobStatus } from '@/lib/dispatch/types';

interface StateView {
  chip: StatusState;
  label: string;
}

// The wire has more granular states than the shared chip; collapse them onto the
// chip's vocabulary while keeping a precise label.
const STATE_VIEW: Record<JobState, StateView> = {
  queued: { chip: 'queued', label: 'Queued' },
  planning: { chip: 'queued', label: 'Planning' },
  gathering: { chip: 'gathering', label: 'Gathering' },
  ranking: { chip: 'gathering', label: 'Ranking' },
  drafting: { chip: 'drafting', label: 'Drafting' },
  verifying: { chip: 'verifying', label: 'Verifying' },
  repairing: { chip: 'verifying', label: 'Repairing' },
  images: { chip: 'drafting', label: 'Images' },
  ready: { chip: 'ready', label: 'Ready' },
  failed: { chip: 'failed', label: 'Failed' },
  cancelled: { chip: 'failed', label: 'Cancelled' },
  published: { chip: 'published', label: 'Published' },
};

interface DraftsListProps {
  jobs: ReadonlyArray<JobStatus>;
}

function Row({ job }: { job: JobStatus }) {
  const view = STATE_VIEW[job.state];
  const headline = job.headline?.trim() || 'Untitled draft';
  const detail = job.phase_detail?.trim();

  return (
    <div className="flex items-center gap-4 border-b border-studio-rule py-3 last:border-b-0">
      <StatusChip state={view.chip} label={view.label} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-sans text-ui-md font-semibold text-studio-ink">{headline}</div>
        {detail && <div className="truncate font-sans text-ui-sm text-studio-muted">{detail}</div>}
      </div>
      <span className="shrink-0 font-mono text-ui-sm text-studio-muted">{fmtStamp(job.updated_at)}</span>
    </div>
  );
}

export default function DraftsList({ jobs }: DraftsListProps) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 font-mono text-ui-sm uppercase tracking-wider text-studio-muted">My Drafts</h2>
      {jobs.length === 0 ? (
        <p className="border border-studio-rule px-4 py-6 text-center font-sans text-ui-md text-studio-muted">
          No drafts yet — start one from a topic above.
        </p>
      ) : (
        <div className="border border-studio-rule">
          {jobs.map((job) =>
            job.state === 'ready' ? (
              <Link
                key={job.job_id}
                href={`/studio/draft/${job.job_id}`}
                className="block px-4 no-underline transition-colors hover:bg-studio-rule/40"
              >
                <Row job={job} />
              </Link>
            ) : (
              <div key={job.job_id} className="px-4">
                <Row job={job} />
              </div>
            ),
          )}
        </div>
      )}
    </section>
  );
}

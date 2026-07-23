'use client';

// Poll Door B draft jobs while any are still working. Fetches the proxy route
// GET /api/studio/draft?ids=<active> every 5s, decays to 15s after two minutes,
// pauses while the tab is hidden, and stops once every tracked job is terminal.
// Client-only: never imports the server-only dispatch client.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { jobStatusSchema } from '@/lib/dispatch/types';

import type { JobState, JobStatus } from '@/lib/dispatch/types';

const FAST_MS = 5_000;
const SLOW_MS = 15_000;
const DECAY_AFTER_MS = 120_000;

const TERMINAL: ReadonlyArray<JobState> = ['ready', 'failed', 'published', 'cancelled'];

function isTerminal(state: JobState): boolean {
  return TERMINAL.includes(state);
}

export interface DraftPolling {
  jobs: ReadonlyArray<JobStatus>;
  /** Add a freshly-created job to the tracked set and (re)start polling. */
  addJob: (job: JobStatus) => void;
}

/** Track draft jobs and keep their statuses fresh until all are terminal. */
export function useDraftPolling(initial: ReadonlyArray<JobStatus>): DraftPolling {
  const [jobs, setJobs] = useState<ReadonlyArray<JobStatus>>(initial);
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;

  const startedAt = useRef<number>(Date.now());

  const addJob = useCallback((job: JobStatus) => {
    startedAt.current = Date.now(); // a new job resets the fast-poll window
    setJobs((prev) => (prev.some((j) => j.job_id === job.job_id) ? prev : [job, ...prev]));
  }, []);

  // Only the identity of the active set drives the effect — content updates that
  // don't change which ids are in flight must not reschedule the timer.
  const activeKey = useMemo(
    () =>
      jobs
        .filter((j) => !isTerminal(j.state))
        .map((j) => j.job_id)
        .sort()
        .join(','),
    [jobs],
  );

  useEffect(() => {
    if (!activeKey) return;
    const activeIds = activeKey.split(',');

    let cancelled = false;
    let timer: number | null = null;

    async function poll(): Promise<void> {
      if (document.visibilityState === 'hidden') return;
      try {
        const qs = activeIds.map(encodeURIComponent).join(',');
        const res = await fetch(`/api/studio/draft?ids=${qs}`, { cache: 'no-store' });
        if (!res.ok) return;
        const body: unknown = await res.json();
        const envelope = body as { data?: unknown };
        const parsed = jobStatusSchema.array().safeParse(envelope.data);
        if (!parsed.success || cancelled) return;
        const next = parsed.data;
        setJobs((prev) =>
          prev.map((j) => next.find((n) => n.job_id === j.job_id) ?? j),
        );
      } catch {
        // Transient network error — the next scheduled tick retries.
      }
    }

    function schedule(): void {
      const delay = Date.now() - startedAt.current > DECAY_AFTER_MS ? SLOW_MS : FAST_MS;
      timer = window.setTimeout(async () => {
        await poll();
        if (!cancelled) schedule();
      }, delay);
    }

    function onVisibility(): void {
      if (document.visibilityState === 'visible') void poll();
    }

    schedule();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [activeKey]);

  return { jobs, addJob };
}

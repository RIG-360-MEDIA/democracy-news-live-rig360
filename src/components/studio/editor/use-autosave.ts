'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Debounced autosave hook. Owns no data — the caller passes a serialisable
// snapshot and a save fn; the hook debounces, dedupes against the last saved
// snapshot, and reports status. Immutable: it never mutates the snapshot.

export type SaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface AutosaveApi {
  status: SaveStatus;
  /** Schedule a debounced save of the given snapshot. */
  schedule: (snapshot: unknown) => void;
  /** Flush any pending save immediately (e.g. before navigating a tab). */
  flush: () => void;
}

const DEBOUNCE_MS = 900;

export function useAutosave(
  save: (snapshot: unknown) => Promise<boolean>,
  initial: unknown,
): AutosaveApi {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<unknown>(null);
  const lastSaved = useRef<string>(JSON.stringify(initial));

  const run = useCallback(async () => {
    const snapshot = pending.current;
    const serialised = JSON.stringify(snapshot);
    if (serialised === lastSaved.current) return;
    setStatus('saving');
    try {
      const ok = await save(snapshot);
      if (ok) {
        lastSaved.current = serialised;
        setStatus('saved');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [save]);

  const schedule = useCallback(
    (snapshot: unknown) => {
      pending.current = snapshot;
      if (JSON.stringify(snapshot) === lastSaved.current) {
        setStatus('idle');
        return;
      }
      setStatus('dirty');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void run(), DEBOUNCE_MS);
    },
    [run],
  );

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (pending.current !== null) void run();
  }, [run]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { status, schedule, flush };
}

'use client';

// Open verification flags, resolved ONE at a time. Each open flag offers three
// editorial actions — keep-with-note, rewrite, remove — mapped onto the box's
// two-verb resolve API. There is deliberately NO bulk / clear-all affordance
// (bulk-acknowledge is auto-publish in disguise). Resolved flags collapse to
// their resolution.

import { useState } from 'react';

import { useToast } from '@/components/studio/ui';

import { useReviewStore } from './store';

import type { Flag } from '@/lib/dispatch/types';

const SEVERITY_STYLE: Record<Flag['severity'], string> = {
  // Accent is reserved for red/amber flags — both severities read as accent,
  // red filled (loudest), amber outlined.
  red: 'border-studio-accent bg-studio-accent text-studio-paper',
  amber: 'border-studio-accent text-studio-accent',
};

function FlagRow({ flag }: { flag: Flag }) {
  const resolveFlag = useReviewStore((s) => s.resolveFlag);
  const { show } = useToast();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  if (flag.status !== 'open') {
    return (
      <li className="border-t border-studio-rule py-3 first:border-t-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
            {flag.status}
          </span>
          <span className="font-sans text-ui-md text-studio-muted line-through">“{flag.span}”</span>
        </div>
        {flag.resolution_note && (
          <p className="mt-1 font-sans text-ui-md text-studio-muted">Note: {flag.resolution_note}</p>
        )}
      </li>
    );
  }

  return (
    <li className="border-t border-studio-rule py-3 first:border-t-0">
      <div className="flex items-center gap-2">
        <span className={['border px-1.5 font-mono text-ui-sm uppercase tracking-wider', SEVERITY_STYLE[flag.severity]].join(' ')}>
          {flag.severity}
        </span>
        <span className="font-sans text-b-sm font-semibold text-studio-ink">“{flag.span}”</span>
      </div>
      <p className="mt-1 font-sans text-ui-md text-studio-muted">{flag.reason}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setNoteOpen((v) => !v)}
          className="border border-studio-ink px-2 py-1 font-mono text-ui-sm uppercase tracking-wider text-studio-ink"
        >
          Keep with note
        </button>
        <button
          type="button"
          onClick={() => void resolveFlag(flag.id, 'fixed', 'Rewritten to address flag', show)}
          className="border border-studio-ink px-2 py-1 font-mono text-ui-sm uppercase tracking-wider text-studio-ink"
        >
          Rewrite
        </button>
        <button
          type="button"
          onClick={() => void resolveFlag(flag.id, 'fixed', 'Flagged claim removed', show)}
          className="border border-studio-accent px-2 py-1 font-mono text-ui-sm uppercase tracking-wider text-studio-accent"
        >
          Remove
        </button>
      </div>

      {noteOpen && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            aria-label="Resolution note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why this claim stands as written…"
            className="w-full resize-none border border-studio-rule bg-studio-paper p-2 font-sans text-ui-md text-studio-ink focus:border-studio-ink focus:outline-none"
          />
          <button
            type="button"
            disabled={note.trim().length === 0}
            onClick={() => void resolveFlag(flag.id, 'dismiss', note.trim(), show)}
            className="self-start border border-studio-ink bg-studio-ink px-3 py-1 font-mono text-ui-sm uppercase tracking-wider text-studio-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save note & keep
          </button>
        </div>
      )}
    </li>
  );
}

export default function FlagList() {
  const flags = useReviewStore((s) => s.flags);
  const openCount = flags.filter((f) => f.status === 'open').length;

  return (
    <section aria-label="Verification flags" className="border border-studio-rule bg-studio-paper p-4">
      <h2 className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
        Flags — {openCount} open
      </h2>
      {flags.length === 0 ? (
        <p className="mt-3 font-sans text-b-sm text-studio-muted">No flags on this draft.</p>
      ) : (
        <ul className="mt-2">
          {flags.map((f) => (
            <FlagRow key={f.id} flag={f} />
          ))}
        </ul>
      )}
    </section>
  );
}

'use client';

// One story beat: subhead + editable body, with a confidence-coloured left edge
// and a debounced (2s) autosave. Empty source_ids render as an unsourced gap.

import { useEffect, useRef } from 'react';

import { useToast } from '@/components/studio/ui';

import { useReviewStore } from './store';

import type { ChangeEvent } from 'react';
import type { BeatVerdict } from '@/lib/dispatch/types';

const AUTOSAVE_MS = 2000;

// Left-edge colour by VERIFY confidence. green = quiet ink hairline; red = the
// dark-red accent. amber has no studio token (accent is reserved for red/amber
// FLAGS + destructive), so an ochre arbitrary value stands in for the beat edge.
const EDGE_BY_VERDICT: Record<BeatVerdict, string> = {
  green: 'border-studio-rule',
  amber: 'border-[#9c6b1a]',
  red: 'border-studio-accent',
};

interface BeatBlockProps {
  index: number;
}

export default function BeatBlock({ index }: BeatBlockProps) {
  const beat = useReviewStore((s) => s.draft?.beats[index]);
  const editBeatText = useReviewStore((s) => s.editBeatText);
  const commitBeats = useReviewStore((s) => s.commitBeats);
  const hoverBeat = useReviewStore((s) => s.hoverBeat);
  const { show } = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  if (!beat) return null;

  const verdict: BeatVerdict = beat.confidence ?? 'green';
  const unsourced = beat.source_ids.length === 0;
  const rows = Math.max(3, Math.min(12, Math.ceil(beat.text.length / 88) + beat.text.split('\n').length));

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    editBeatText(index, e.target.value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void commitBeats(show);
    }, AUTOSAVE_MS);
  }

  const edge = unsourced
    ? 'border border-dashed border-studio-accent p-4'
    : `border-l-2 pl-4 ${EDGE_BY_VERDICT[verdict]}`;

  return (
    <article
      onMouseEnter={() => hoverBeat(index)}
      onFocus={() => hoverBeat(index)}
      className={edge}
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-d-xs text-studio-ink">{beat.subhead}</h3>
        <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">{verdict}</span>
      </div>
      <textarea
        aria-label={`Beat body: ${beat.subhead}`}
        value={beat.text}
        onChange={onChange}
        rows={rows}
        className="mt-2 w-full resize-none border border-studio-rule bg-studio-paper p-3 font-sans text-b-md text-studio-ink focus:border-studio-ink focus:outline-none"
      />
      {unsourced && (
        <p className="mt-2 font-mono text-ui-sm uppercase tracking-wider text-studio-accent">
          no supporting source — resolve or remove
        </p>
      )}
    </article>
  );
}

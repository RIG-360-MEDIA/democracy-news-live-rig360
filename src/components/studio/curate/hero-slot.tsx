'use client';

// Editor-only overlay: the lead/hero slot rendered as a drop target. Drag a story's
// "hero" grip from the reorder overlay onto this slot to pin it to rank 1 via
// /api/studio/override. On success we router.refresh() so getFrontPage re-applies
// the pin at read time (we never client-mutate the reader render).

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/studio/ui';

import { useCurateActions } from './use-curate-actions';
import type { CurateItem, SaveState } from './types';

interface HeroSlotProps {
  /** The story currently in the lead position (top of the front page), or null. */
  current: CurateItem | null;
}

interface DragPayload {
  id: string;
  title: string;
}

function parsePayload(raw: string): DragPayload | null {
  try {
    const v = JSON.parse(raw) as Partial<DragPayload>;
    if (typeof v.id === 'string' && typeof v.title === 'string') return { id: v.id, title: v.title };
    return null;
  } catch {
    return null;
  }
}

export default function HeroSlot({ current }: HeroSlotProps) {
  const router = useRouter();
  const toast = useToast();
  const actions = useCurateActions();

  const [over, setOver] = useState(false);
  const [state, setState] = useState<SaveState>('idle');

  async function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const payload = parsePayload(e.dataTransfer.getData('text/plain'));
    if (!payload) return;
    if (current && payload.id === current.id) return;
    setState('saving');
    const res = await actions.pin(payload.id, 1);
    if (!res.ok) {
      setState('error');
      toast.show(`Couldn't make “${payload.title}” the lead — ${res.error}`, 'error');
      return;
    }
    setState('saved');
    toast.show(`“${payload.title}” is now the lead`);
    router.refresh();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={[
        'flex items-center gap-4 border-2 border-dashed px-4 py-3 transition-colors',
        over ? 'border-studio-accent bg-studio-paper' : 'border-studio-rule bg-studio-paper',
      ].join(' ')}
    >
      <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-accent">Lead · #1</span>
      {current ? (
        <div className="flex min-w-0 items-center gap-3">
          {current.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.image} alt="" className="h-10 w-14 shrink-0 border border-studio-rule object-cover" />
          ) : null}
          <span className="truncate font-display text-studio-ink">{current.title}</span>
        </div>
      ) : (
        <span className="font-sans text-ui-sm text-studio-muted">No lead pinned</span>
      )}
      <span className="ml-auto font-mono text-ui-sm text-studio-muted">
        {state === 'saving' ? 'Pinning…' : over ? 'Drop to make #1' : 'Drag a story here'}
      </span>
    </div>
  );
}

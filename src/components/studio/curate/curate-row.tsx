'use client';

// One row in the reorder overlay: rank numeral, thumbnail (swap), inline headline
// edit, a native-draggable "hero" grip (drop onto HeroSlot → pin #1), and the
// per-card pin save tick. Inline edits hit /api/studio/edit; on success we
// router.refresh() so getFrontPage re-applies the override at read time — we never
// client-mutate the reader render.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/components/studio/ui';

import type { CurateActions } from './use-curate-actions';
import type { CurateItem, SaveState } from './types';

interface CurateRowProps {
  item: CurateItem;
  rank: number;
  /** Pin lifecycle for this card, owned by the parent reorder overlay. */
  pinState: SaveState;
  actions: CurateActions;
}

function Tick({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const label = state === 'saving' ? 'Saving…' : state === 'saved' ? '✓ Saved' : '! Failed';
  const tone = state === 'error' ? 'text-studio-accent' : 'text-studio-muted';
  return <span className={`font-mono text-ui-sm ${tone}`}>{label}</span>;
}

export default function CurateRow({ item, rank, pinState, actions }: CurateRowProps) {
  const router = useRouter();
  const toast = useToast();

  const [headline, setHeadline] = useState(item.title);
  const [headlineState, setHeadlineState] = useState<SaveState>('idle');
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageState, setImageState] = useState<SaveState>('idle');

  async function commitHeadline() {
    const next = headline.trim();
    if (!next || next === item.title) return;
    setHeadlineState('saving');
    const res = await actions.editHeadline(item.id, next);
    if (!res.ok) {
      setHeadlineState('error');
      toast.show(`Couldn't save headline — ${res.error}`, 'error');
      return;
    }
    setHeadlineState('saved');
    router.refresh();
  }

  async function commitImage() {
    const next = imageUrl.trim();
    if (!next) {
      setImageOpen(false);
      return;
    }
    setImageState('saving');
    const res = await actions.editImage(item.id, next);
    if (!res.ok) {
      setImageState('error');
      toast.show(`Couldn't swap image — ${res.error}`, 'error');
      return;
    }
    setImageState('saved');
    setImageOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3 border border-studio-rule bg-studio-paper px-3 py-2">
      <span className="cursor-grab select-none font-mono text-ui-sm text-studio-muted" aria-hidden>
        ⋮⋮
      </span>
      <span className="w-6 shrink-0 text-right font-mono text-ui-sm tabular-nums text-studio-muted">{rank}</span>

      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setImageOpen((v) => !v)}
        className="h-10 w-14 shrink-0 overflow-hidden border border-studio-rule bg-studio-paper"
        title="Swap thumbnail"
      >
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="block text-center font-mono text-ui-sm text-studio-muted">—</span>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitHeadline}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-full border-b border-transparent bg-transparent font-display text-studio-ink outline-none focus:border-studio-rule"
          aria-label="Headline"
        />
        {imageOpen && (
          <div className="mt-1 flex items-center gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="https://image-url…"
              className="w-full border border-studio-rule bg-studio-paper px-2 py-1 font-mono text-ui-sm text-studio-ink outline-none"
              aria-label="Image URL"
            />
            <button
              type="button"
              onClick={commitImage}
              className="border border-studio-rule px-2 py-1 font-sans text-ui-sm font-semibold text-studio-ink"
            >
              Swap
            </button>
          </div>
        )}
        <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">{item.topic}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Tick state={imageState === 'idle' ? headlineState : imageState} />
        <Tick state={pinState} />
        <span
          draggable
          onPointerDown={(e) => e.stopPropagation()}
          onDragStart={(e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, title: item.title }));
            e.dataTransfer.effectAllowed = 'move';
          }}
          className="cursor-grab select-none border border-studio-rule px-2 py-1 font-mono text-ui-sm uppercase tracking-wider text-studio-muted"
          title="Drag to the hero slot to make #1"
        >
          hero
        </span>
      </div>
    </div>
  );
}

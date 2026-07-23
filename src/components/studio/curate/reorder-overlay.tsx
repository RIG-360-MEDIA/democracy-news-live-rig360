'use client';

// Editor-only overlay: a drag-to-reorder list of the current front-page top stories.
// On drop, the new order is committed as SEQUENTIAL INDIVIDUAL pinStory(id, rank)
// calls (rank 1..n) via /api/studio/override — no bulk write. Each card shows its own
// tick; the first failure toasts and reverts the list to the last committed order.
// After a clean commit we router.refresh() so getFrontPage re-applies the pins at read.

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reorder } from 'framer-motion';

import { useToast } from '@/components/studio/ui';

import CurateRow from './curate-row';
import { useCurateActions } from './use-curate-actions';
import type { CurateItem, SaveState } from './types';

interface ReorderOverlayProps {
  items: ReadonlyArray<CurateItem>;
}

function sameOrder(a: ReadonlyArray<CurateItem>, b: ReadonlyArray<CurateItem>): boolean {
  return a.length === b.length && a.every((it, i) => it.id === b[i]?.id);
}

export default function ReorderOverlay({ items }: ReorderOverlayProps) {
  const router = useRouter();
  const toast = useToast();
  const actions = useCurateActions();

  const [order, setOrder] = useState<CurateItem[]>([...items]);
  const [pinState, setPinState] = useState<Record<string, SaveState>>({});

  const orderRef = useRef<CurateItem[]>(order);
  const committedRef = useRef<CurateItem[]>([...items]);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);

  function handleReorder(next: CurateItem[]) {
    orderRef.current = next;
    setOrder(next);
    dirtyRef.current = true;
  }

  async function commit() {
    if (busyRef.current) return;
    const current = orderRef.current;
    const previous = committedRef.current;
    if (sameOrder(current, previous)) return;

    busyRef.current = true;
    for (let i = 0; i < current.length; i += 1) {
      const item = current[i];
      const rank = i + 1;
      // A card only needs a write if its rank actually changed.
      if (previous[i]?.id === item.id) continue;
      setPinState((prev) => ({ ...prev, [item.id]: 'saving' }));
      // eslint-disable-next-line no-await-in-loop -- sequential by design: one tick per card.
      const res = await actions.pin(item.id, rank);
      if (!res.ok) {
        setPinState((prev) => ({ ...prev, [item.id]: 'error' }));
        toast.show(`Couldn't pin “${item.title}” — ${res.error}`, 'error');
        orderRef.current = previous;
        setOrder([...previous]);
        busyRef.current = false;
        return;
      }
      setPinState((prev) => ({ ...prev, [item.id]: 'saved' }));
    }
    committedRef.current = current;
    busyRef.current = false;
    router.refresh();
  }

  function handlePointerUp() {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    void commit();
  }

  if (order.length === 0) {
    return (
      <p className="font-sans text-ui-sm text-studio-muted">No live top stories to reorder right now.</p>
    );
  }

  return (
    <section aria-label="Reorder top stories">
      <h2 className="mb-2 font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
        Top stories · drag to reorder
      </h2>
      <Reorder.Group axis="y" values={order} onReorder={handleReorder} onPointerUp={handlePointerUp} className="flex flex-col gap-2">
        {order.map((item, i) => (
          <Reorder.Item key={item.id} value={item}>
            <CurateRow item={item} rank={i + 1} pinState={pinState[item.id] ?? 'idle'} actions={actions} />
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </section>
  );
}

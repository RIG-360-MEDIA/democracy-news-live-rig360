'use client';

// Editor-only overlay: a drag-to-reorder list of the current front-page top stories.
// On drop, the new order is committed in ONE call to /api/studio/reorder, which replaces the
// whole pin set in a single transaction (rank 1..n, each pin with an expiry — F10). A failure
// writes nothing: we toast and revert the list to the last committed order. After a clean
// commit we router.refresh() so getFrontPage re-applies the pins at read.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Reorder } from 'framer-motion';

import { useToast } from '@/components/studio/ui';

import CurateRow from './curate-row';
import { useCurateActions } from './use-curate-actions';
import type { CurateItem, SaveState } from './types';

interface ReorderOverlayProps {
  items: ReadonlyArray<CurateItem>;
  /** Fingerprint of the pin set this page was rendered with (stale-tab guard, F10). */
  pinToken: string;
}

function sameOrder(a: ReadonlyArray<CurateItem>, b: ReadonlyArray<CurateItem>): boolean {
  return a.length === b.length && a.every((it, i) => it.id === b[i]?.id);
}

export default function ReorderOverlay({ items, pinToken }: ReorderOverlayProps) {
  const router = useRouter();
  const toast = useToast();
  const actions = useCurateActions();

  const [order, setOrder] = useState<CurateItem[]>([...items]);
  const [pinState, setPinState] = useState<Record<string, SaveState>>({});

  const orderRef = useRef<CurateItem[]>(order);
  const committedRef = useRef<CurateItem[]>([...items]);
  const dirtyRef = useRef(false);
  const busyRef = useRef(false);
  const pinTokenRef = useRef(pinToken);
  // A router.refresh() after another curate action re-renders with a fresh token — adopt it.
  useEffect(() => {
    pinTokenRef.current = pinToken;
  }, [pinToken]);

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
    // Only cards whose rank changed show a saving tick; the write itself is all-or-nothing.
    const moved = current.filter((item, i) => previous[i]?.id !== item.id).map((item) => item.id);
    setPinState((prev) => ({ ...prev, ...Object.fromEntries(moved.map((id) => [id, 'saving' as SaveState])) }));
    const res = await actions.reorder(current.map((item) => item.id), pinTokenRef.current);
    const outcome: SaveState = res.ok ? 'saved' : 'error';
    setPinState((prev) => ({ ...prev, ...Object.fromEntries(moved.map((id) => [id, outcome])) }));
    if (!res.ok) {
      toast.show(`Couldn't save the new order — ${res.error}`, 'error');
      orderRef.current = previous;
      setOrder([...previous]);
      busyRef.current = false;
      return;
    }
    if (res.pinToken) pinTokenRef.current = res.pinToken;
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

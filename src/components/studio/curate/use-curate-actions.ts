'use client';

// Front-page curation — thin client wrapper over the editorial write routes
// (/api/studio/override, /api/studio/edit, /api/studio/reorder). Single-card edits are individual so
// each card shows its own tick; a drag-reorder is ONE atomic call (all-or-nothing, F10).

import { useCallback } from 'react';

import type { ActionResult } from './types';

async function postJson(url: string, body: Record<string, unknown>): Promise<ActionResult & { data?: unknown }> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; data?: unknown; error: { message?: string } | null }
      | null;
    if (!res.ok || !json || json.ok !== true) {
      return { ok: false, error: json?.error?.message ?? `Request failed (${res.status})` };
    }
    return { ok: true, error: null, data: json.data };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export interface CurateActions {
  /** Pin a story to an explicit front-page rank (1 = hero). */
  pin: (storyId: string, rank: number) => Promise<ActionResult>;
  /** Replace the whole Top Stories pin set with this order (rank = index + 1), atomically.
   *  `pinToken` is the pin set this client last saw; the server answers 409 if it has changed. */
  reorder: (order: ReadonlyArray<string>, pinToken: string) => Promise<ActionResult & { pinToken?: string }>;
  /** Replace a card's headline (locks the story against the pipeline). */
  editHeadline: (storyId: string, headline: string) => Promise<ActionResult>;
  /** Replace a card's thumbnail/hero image URL ('' clears back to the machine's). */
  editImage: (storyId: string, image: string) => Promise<ActionResult>;
}

export function useCurateActions(): CurateActions {
  const pin = useCallback(
    (storyId: string, rank: number) => postJson('/api/studio/override', { kind: 'pin', storyId, rank }),
    [],
  );
  const reorder = useCallback(async (order: ReadonlyArray<string>, pinToken: string) => {
    const res = await postJson('/api/studio/reorder', { order: [...order], expectedPinToken: pinToken });
    const next = (res.data as { pinToken?: unknown } | undefined)?.pinToken;
    return { ok: res.ok, error: res.error, pinToken: typeof next === 'string' ? next : undefined };
  }, []);
  const editHeadline = useCallback(
    (storyId: string, headline: string) => postJson('/api/studio/edit', { storyId, headline }),
    [],
  );
  const editImage = useCallback(
    (storyId: string, image: string) => postJson('/api/studio/edit', { storyId, image }),
    [],
  );
  return { pin, reorder, editHeadline, editImage };
}

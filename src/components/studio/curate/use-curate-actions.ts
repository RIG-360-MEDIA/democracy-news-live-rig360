'use client';

// Front-page curation — thin client wrapper over the editorial write routes
// (/api/studio/override, /api/studio/edit). Every call is SEQUENTIAL + INDIVIDUAL
// by design: callers await one at a time so each card can show its own tick and
// a single failure reverts just that card. No bulk endpoint.

import { useCallback } from 'react';

import type { ActionResult } from './types';

async function postJson(url: string, body: Record<string, unknown>): Promise<ActionResult> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as
      | { ok: boolean; error: { message?: string } | null }
      | null;
    if (!res.ok || !json || json.ok !== true) {
      return { ok: false, error: json?.error?.message ?? `Request failed (${res.status})` };
    }
    return { ok: true, error: null };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export interface CurateActions {
  /** Pin a story to an explicit front-page rank (1 = hero). */
  pin: (storyId: string, rank: number) => Promise<ActionResult>;
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
  const editHeadline = useCallback(
    (storyId: string, headline: string) => postJson('/api/studio/edit', { storyId, headline }),
    [],
  );
  const editImage = useCallback(
    (storyId: string, image: string) => postJson('/api/studio/edit', { storyId, image }),
    [],
  );
  return { pin, editHeadline, editImage };
}

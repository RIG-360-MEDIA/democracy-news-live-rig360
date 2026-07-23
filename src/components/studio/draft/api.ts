// Client-side fetchers for the Door B review proxy routes. Each parses the
// { ok, data, error } envelope (.claude/rules/api-conventions.md) and throws a
// plain Error carrying error.message so callers can toast it. These run in the
// browser and hit the CMS proxy routes only — never the box directly.

import type { DraftBeat, DraftBundle, Flag } from '@/lib/dispatch/types';

interface Envelope<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
}

async function unwrap<T>(res: Response): Promise<T> {
  let env: Envelope<T>;
  try {
    env = (await res.json()) as Envelope<T>;
  } catch {
    throw new Error(`Request failed (HTTP ${res.status})`);
  }
  if (!env.ok || env.data === null) {
    throw new Error(env.error?.message ?? `Request failed (HTTP ${res.status})`);
  }
  return env.data;
}

function draftPath(jobId: string): string {
  return `/api/studio/draft/${encodeURIComponent(jobId)}`;
}

/** PATCH the whole beats array (SaveEditRequest). Returns the fresh bundle. */
export async function saveBeatsRequest(jobId: string, beats: readonly DraftBeat[]): Promise<DraftBundle> {
  const res = await fetch(draftPath(jobId), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beats }),
  });
  return unwrap<DraftBundle>(res);
}

/** Resolve ONE flag. The proxy route deliberately takes a single flag_id. */
export async function resolveFlagRequest(
  jobId: string,
  flagId: string,
  action: 'dismiss' | 'fixed',
  note: string | undefined,
): Promise<Flag> {
  const res = await fetch(`${draftPath(jobId)}/flag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ flag_id: flagId, action, note }),
  });
  return unwrap<Flag>(res);
}

/** Publish the draft. Not optimistic — the caller awaits the story id. */
export async function publishRequest(jobId: string): Promise<{ id: string }> {
  const res = await fetch(`${draftPath(jobId)}/publish`, { method: 'POST' });
  return unwrap<{ id: string }>(res);
}

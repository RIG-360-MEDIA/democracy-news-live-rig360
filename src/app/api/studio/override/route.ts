// Editorial CMS — override actions (publish/unpublish/pin/unpin + legacy kill/revive/boost/lock). Epic 002.
import { revalidateTag } from 'next/cache';
import { revalidateStoryPage } from '@/lib/revalidate-story';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import {
  boostStory,
  killStory,
  lockStory,
  pinStory,
  publishStory,
  reviveStory,
  unpinStory,
  unpublishStory,
} from '@/lib/studio/overrides';
import { projectPlacement } from '@/lib/studio/placement';
import { CONFLICT_MESSAGE, isWriteConflict } from '@/lib/studio/db-errors';
import { guardApi } from '@/lib/studio/guard';
import { overrideSchema, type OverrideInput } from '@/lib/studio/input-schemas';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await guardApi('editor');
  if (!guard.ok) return guard.response;
  const editor = guard.editor.id;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  // L1: uuid story id, known kind, bounded integer rank/delta, reason <= 500 chars.
  const parsed = overrideSchema.safeParse(raw);
  if (!parsed.success) return fail('400', 'Invalid override request', 400);
  const { storyId, kind, reason, rank, delta, locked } = parsed.data;

  try {
    const data = await runOverride(kind, storyId, editor, { reason: reason || undefined, rank, delta, locked });
    // Editor decision changes what readers see — bust the reader Data Cache now
    // so it reflects immediately instead of after READER_CACHE_TTL.
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateStoryPage(storyId);
    // Where the story now sits on the reader front page — the Newsroom publish toast reports it
    // ("Live — #6 in Politics"). Best-effort; null when the story has no dedicated section.
    const placement = await projectPlacement(storyId);
    return NextResponse.json({ ok: true, data: { ...data, placement }, error: null });
  } catch (e: unknown) {
    // A concurrent pin/reorder won the race (one_pin_per_rank, deadlock…) — not a server fault.
    if (isWriteConflict(e)) return fail('409', CONFLICT_MESSAGE, 409);
    console.error('[studio/override] failed', { editor, storyId, kind, error: e });
    return fail('500', 'Override failed', 500);
  }
}

interface OverrideArgs {
  reason?: string;
  rank: number;
  delta: number;
  locked: boolean;
}

function runOverride(kind: OverrideInput['kind'], storyId: string, editor: string, a: OverrideArgs) {
  switch (kind) {
    case 'publish':
      return publishStory(storyId, editor);
    case 'unpublish':
      return unpublishStory(storyId, editor, a.reason);
    case 'unpin':
      return unpinStory(storyId, editor);
    case 'kill':
      return killStory(storyId, editor, a.reason);
    case 'revive':
      return reviveStory(storyId, editor);
    case 'pin':
      return pinStory(storyId, editor, a.rank);
    case 'boost':
      return boostStory(storyId, editor, a.delta);
    case 'lock':
      return lockStory(storyId, editor, a.locked);
  }
}

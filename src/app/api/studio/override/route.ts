// Editorial CMS — override actions (publish/unpublish/pin/unpin + legacy kill/revive/boost/lock). Epic 002.
import { revalidateTag } from 'next/cache';
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
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

export async function POST(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  const editor = guard.editor.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const storyId = typeof body.storyId === 'string' ? body.storyId : '';
  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!storyId || !kind) return fail('400', 'storyId and kind are required', 400);

  try {
    let data;
    switch (kind) {
      case 'publish':
        data = await publishStory(storyId, editor);
        break;
      case 'unpublish':
        data = await unpublishStory(storyId, editor, typeof body.reason === 'string' ? body.reason : undefined);
        break;
      case 'unpin':
        data = await unpinStory(storyId, editor);
        break;
      case 'kill':
        data = await killStory(storyId, editor, typeof body.reason === 'string' ? body.reason : undefined);
        break;
      case 'revive':
        data = await reviveStory(storyId, editor);
        break;
      case 'pin':
        data = await pinStory(storyId, editor, Number(body.rank ?? 1));
        break;
      case 'boost':
        data = await boostStory(storyId, editor, Number(body.delta ?? 0));
        break;
      case 'lock':
        data = await lockStory(storyId, editor, Boolean(body.locked));
        break;
      default:
        return fail('400', `Unknown action: ${kind}`, 400);
    }
    // Editor decision changes what readers see — bust the reader Data Cache now
    // so it reflects immediately instead of after READER_CACHE_TTL.
    revalidateTag(CACHE_TAGS.frontPage);
    revalidateTag(CACHE_TAGS.storyDetail);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Override failed', 500);
  }
}

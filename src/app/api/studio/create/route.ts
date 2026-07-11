// Editorial CMS — author a manual story (E6).
import { NextResponse } from 'next/server';

import { createManualStory, MANUAL_TOPICS, type ManualTopic } from '@/lib/studio/manual';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

/** A non-empty trimmed string, or null. */
function str(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length ? t : null;
}

function isTopic(v: unknown): v is ManualTopic {
  return typeof v === 'string' && (MANUAL_TOPICS as readonly string[]).includes(v);
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

  const headline = str(body.headline);
  const storyBody = str(body.body);
  if (!headline) return fail('400', 'headline is required', 400);
  if (!storyBody) return fail('400', 'body is required', 400);

  const topic: ManualTopic = isTopic(body.topic) ? body.topic : 'OTHER';

  const importanceRaw = Number(body.importance ?? 40);
  const importance = Number.isFinite(importanceRaw) ? importanceRaw : 40;

  try {
    const id = await createManualStory(
      {
        headline,
        dek: str(body.dek),
        body: storyBody,
        topic,
        country: str(body.country),
        imageUrl: str(body.image_url),
        importance,
      },
      editor,
    );
    return NextResponse.json({ ok: true, data: { id }, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Create failed', 500);
  }
}

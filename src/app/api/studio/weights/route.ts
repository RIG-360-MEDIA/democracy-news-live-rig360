// Editorial CMS — ranking weights read/write (E5). Epic 002.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { getWeights, setWeights, type WeightsPatch } from '@/lib/studio/weights';
import { requireAdmin, requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

/** A finite number, or null if the value can't be safely coerced. */
function finiteOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** Narrow an unknown jsonb-shaped value into Record<string, number>; reject non-finite. */
function toWeightMapOrNull(v: unknown): Record<string, number> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const out: Record<string, number> = {};
  for (const [k, raw] of Object.entries(v)) {
    const n = finiteOrNull(raw);
    if (n === null) return null;
    out[k] = n;
  }
  return out;
}

export async function GET() {
  const guard = await requireEditor();
  if (!guard.ok) return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);

  try {
    const data = await getWeights();
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Failed to load weights', 500);
  }
}

export async function POST(req: Request) {
  // Ranking weights are feed-wide configuration — admin only.
  const guard = await requireAdmin();
  if (!guard.ok) return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Admin access required', guard.status);
  const editor = guard.editor.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const patch: WeightsPatch = {};

  if (body.topicWeights !== undefined) {
    const m = toWeightMapOrNull(body.topicWeights);
    if (m === null) return fail('400', 'topicWeights must be a map of finite numbers', 400);
    patch.topicWeights = m;
  }
  if (body.countryWeights !== undefined) {
    const m = toWeightMapOrNull(body.countryWeights);
    if (m === null) return fail('400', 'countryWeights must be a map of finite numbers', 400);
    patch.countryWeights = m;
  }
  if (body.recencyHalflifeH !== undefined) {
    const n = finiteOrNull(body.recencyHalflifeH);
    if (n === null || n <= 0) return fail('400', 'recencyHalflifeH must be a positive number', 400);
    patch.recencyHalflifeH = n;
  }
  if (body.sourceWeight !== undefined) {
    const n = finiteOrNull(body.sourceWeight);
    if (n === null || n < 0) return fail('400', 'sourceWeight must be a non-negative number', 400);
    patch.sourceWeight = n;
  }
  if (body.velocityWeight !== undefined) {
    const n = finiteOrNull(body.velocityWeight);
    if (n === null || n < 0) return fail('400', 'velocityWeight must be a non-negative number', 400);
    patch.velocityWeight = n;
  }

  if (Object.keys(patch).length === 0) return fail('400', 'No weights to update', 400);

  try {
    const data = await setWeights(patch, editor);
    // Weights change front-page ordering — bust the reader cache now.
    revalidateTag(CACHE_TAGS.frontPage);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Failed to save weights', 500);
  }
}

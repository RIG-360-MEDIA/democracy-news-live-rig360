// Editorial CMS — ranking weights read/write (E5). Epic 002.
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

import { CACHE_TAGS } from '@/lib/cache';
import { getWeights, setWeights, type WeightsPatch } from '@/lib/studio/weights';
import { guardApi } from '@/lib/studio/guard';
import { KNOB_BOUNDS } from '@/lib/worldwide/scoring';
import { resolveSectionLayout, sectionLayoutSchema } from '@/lib/worldwide/sections';

export const runtime = 'nodejs';

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

/** A finite number, or null if the value can't be safely coerced. */
function finiteOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

/** A finite number within a knob's bounds (F11 — the scorer clamps too, but reject bad input loudly). */
function knobOrNull(v: unknown, key: keyof typeof KNOB_BOUNDS): number | null {
  const n = finiteOrNull(v);
  if (n === null) return null;
  const { min, max } = KNOB_BOUNDS[key];
  return n >= min && n <= max ? n : null;
}

/** Topic/country multipliers: 0 hides, 1 is neutral, 5 is the ceiling (review fix — unbounded
 *  values let one key swamp the page or go negative and invert it). */
const MAP_WEIGHT_BOUNDS = { min: 0, max: 5 } as const;
const MAP_MAX_KEYS = 300;
const MAP_KEY = /^[A-Za-z_]{2,40}$/;

/** Narrow an unknown jsonb-shaped value into Record<string, number> within MAP_WEIGHT_BOUNDS. */
function toWeightMapOrNull(v: unknown): Record<string, number> | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const entries = Object.entries(v);
  if (entries.length > MAP_MAX_KEYS) return null;
  const out: Record<string, number> = {};
  for (const [k, raw] of entries) {
    const n = finiteOrNull(raw);
    if (n === null || n < MAP_WEIGHT_BOUNDS.min || n > MAP_WEIGHT_BOUNDS.max || !MAP_KEY.test(k)) return null;
    out[k] = n;
  }
  return out;
}

export async function GET() {
  const guard = await guardApi('admin');
  if (!guard.ok) return guard.response;

  try {
    const data = await getWeights();
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Failed to load weights', 500);
  }
}

export async function POST(req: Request) {
  // Ranking weights are feed-wide configuration — admin only.
  const guard = await guardApi('admin');
  if (!guard.ok) return guard.response;
  const editor = guard.editor.id;

  let body: Record<string, unknown>;
  try {
    const raw: unknown = await req.json();
    // `null`, an array or a scalar is valid JSON but not a weights patch.
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return fail('400', 'Body must be a JSON object', 400);
    body = raw as Record<string, unknown>;
  } catch {
    return fail('400', 'Malformed JSON', 400);
  }

  const patch: WeightsPatch = {};

  if (body.topicWeights !== undefined) {
    const m = toWeightMapOrNull(body.topicWeights);
    if (m === null) return fail('400', `topicWeights must map section names to numbers from ${MAP_WEIGHT_BOUNDS.min} to ${MAP_WEIGHT_BOUNDS.max}`, 400);
    patch.topicWeights = m;
  }
  if (body.countryWeights !== undefined) {
    const m = toWeightMapOrNull(body.countryWeights);
    if (m === null) return fail('400', `countryWeights must map country codes to numbers from ${MAP_WEIGHT_BOUNDS.min} to ${MAP_WEIGHT_BOUNDS.max}`, 400);
    patch.countryWeights = m;
  }
  if (body.recencyHalflifeH !== undefined) {
    const n = knobOrNull(body.recencyHalflifeH, 'recencyHalflifeH');
    const b = KNOB_BOUNDS.recencyHalflifeH;
    if (n === null) return fail('400', `recencyHalflifeH must be a number from ${b.min} to ${b.max}`, 400);
    patch.recencyHalflifeH = n;
  }
  if (body.sourceWeight !== undefined) {
    const n = knobOrNull(body.sourceWeight, 'sourceWeight');
    const b = KNOB_BOUNDS.sourceWeight;
    if (n === null) return fail('400', `sourceWeight must be a number from ${b.min} to ${b.max}`, 400);
    patch.sourceWeight = n;
  }
  if (body.velocityWeight !== undefined) {
    const n = knobOrNull(body.velocityWeight, 'velocityWeight');
    const b = KNOB_BOUNDS.velocityWeight;
    if (n === null) return fail('400', `velocityWeight must be a number from ${b.min} to ${b.max}`, 400);
    patch.velocityWeight = n;
  }
  if (body.sectionLayout !== undefined) {
    const parsed = sectionLayoutSchema.safeParse(body.sectionLayout);
    if (!parsed.success) return fail('400', 'sectionLayout must list each section once with visible and count (1–7)', 400);
    // Stored complete: sections the client omitted are appended in default order.
    patch.sectionLayout = resolveSectionLayout(parsed.data);
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

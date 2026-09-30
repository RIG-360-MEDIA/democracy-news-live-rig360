// On-demand cache revalidation — called by the box's hourly publish job right after new data lands
// in Neon (DNL program P03 S03.06 / P06 D-2). Fails closed: without REVALIDATE_SECRET configured
// the route refuses every call, and it only accepts a whitelist of reader cache tags.
import { timingSafeEqual } from 'node:crypto';

import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { REVALIDATE_TAGS } from '@/lib/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  tags: z.array(z.enum(Object.keys(REVALIDATE_TAGS) as [string, ...string[]])).min(1).max(10),
});

function authorized(header: string | null, secret: string): boolean {
  const given = Buffer.from((header ?? '').replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET ?? '';
  if (secret.length < 24) {
    return NextResponse.json({ ok: false, error: 'revalidation not configured' }, { status: 503 });
  }
  if (!authorized(req.headers.get('authorization'), secret)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid body' }, { status: 400 });
  }
  const revalidated = [...new Set(body.tags)].map((t) => {
    revalidateTag(REVALIDATE_TAGS[t]);
    return t;
  });
  return NextResponse.json({ ok: true, revalidated, at: new Date().toISOString() });
}

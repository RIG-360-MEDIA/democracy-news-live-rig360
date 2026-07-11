// Scheduled image-cleanliness scan. Hit by Vercel Cron (see vercel.json). Flags graphic/poster
// thumbnails so the reader hides them. Protected by CRON_SECRET (Vercel Cron sends it as a Bearer).
import { NextResponse } from 'next/server';

import { scanImageBatch } from '@/lib/studio/image-scan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // network-bound image downloads — needs a longer function budget

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, data: null, error: { code: '401', message: 'unauthorized' } }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get('limit')) || 40));
  try {
    const data = await scanImageBatch(limit);
    return NextResponse.json({ ok: true, data, error: null });
  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: '500', message: e instanceof Error ? e.message : 'scan failed' } },
      { status: 500 },
    );
  }
}

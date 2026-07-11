// src/app/api/worldwide/route.ts
//
// GET /api/worldwide?scope=world|<ISO2>  → the ranked front page.
// Read-only over _v8 via sqlAnalytics. See specs/001-worldwide/contracts/worldwide-api.md.

import { NextResponse } from 'next/server';

import { getFrontPage } from '@/lib/worldwide/ranking';

import type { ApiResponse, FrontPage } from '@/lib/worldwide/types';

const SCOPE_RE = /^(world|[A-Z]{2})$/;

function traceId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function GET(request: Request): Promise<NextResponse<ApiResponse<FrontPage>>> {
  const tid = traceId();
  const raw = (new URL(request.url).searchParams.get('scope') ?? 'world').trim();
  // Accept either case: chips link lowercase (?scope=in); getFrontPage needs uppercase ISO2 (subject_country).
  const scope = raw.toLowerCase() === 'world' ? 'world' : raw.toUpperCase();

  if (!SCOPE_RE.test(scope)) {
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'BAD_SCOPE', message: 'scope must be "world" or an ISO2 code', details: { scope } }, meta: { traceId: tid } },
      { status: 400 },
    );
  }

  try {
    const page = await getFrontPage(scope);
    const lead = page.topStories[0];
    const freshnessSeconds = lead
      ? ('kind' in lead ? (lead.members[0]?.freshnessSeconds ?? 0) : lead.freshnessSeconds)
      : 0;
    return NextResponse.json(
      { ok: true, data: page, error: null, meta: { traceId: tid, freshnessSeconds } },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch (error: unknown) {
    // Log full context server-side; return only the traceId to the client.
    console.error(`[worldwide] traceId=${tid} scope=${scope}`, error);
    return NextResponse.json(
      { ok: false, data: null, error: { code: 'INTERNAL', message: 'Failed to build the front page.' }, meta: { traceId: tid } },
      { status: 500 },
    );
  }
}

// src/app/api/worldwide/shown/route.ts
//
// GET /api/worldwide/shown?scope=world|<ISO2>  → the exact story ids the front page surfaces
// (top-story cards + hub members + section stories + around-the-world). The content-gen cron
// consumes this to generate articles for precisely the shown set — single source of truth,
// no SQL duplication of the ranking. (Durable fix for the gen↔front-page alignment.)

import { NextResponse } from 'next/server';

import { getFrontPage } from '@/lib/worldwide/ranking';
import { apiScope, isHub } from '@/lib/worldwide/to-view';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<NextResponse> {
  const raw = (new URL(request.url).searchParams.get('scope') ?? 'world').toLowerCase();
  const scope = raw === 'world' ? 'world' : /^[a-z]{2}$/.test(raw) ? apiScope(raw) : 'world';

  try {
    const page = await getFrontPage(scope);
    const ids = new Set<string>();
    for (const unit of page.topStories) {
      if (isHub(unit)) unit.members.forEach((m) => ids.add(m.id));
      else ids.add(unit.id);
    }
    page.aroundTheWorld.forEach((s) => ids.add(s.id));
    page.sections.forEach((sec) => sec.stories.forEach((s) => ids.add(s.id)));
    return NextResponse.json(
      { ok: true, data: { scope, count: ids.size, ids: [...ids] }, error: null },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } },
    );
  } catch {
    return NextResponse.json({ ok: false, data: null, error: { code: 'INTERNAL', message: 'shown-set failed' } }, { status: 500 });
  }
}

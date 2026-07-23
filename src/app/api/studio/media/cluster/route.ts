// RigWire Studio — images from a story's OWN cluster (GET). Read-only over
// analytics.story_cluster_members_v8 joined to public.articles via sqlAnalytics,
// plus the story's generated image. Never writes.
//
// Cleanliness gate is the SAME one the reader uses (src/lib/worldwide/detail.ts,
// src/lib/worldwide/ranking.ts): never a hard-denylisted domain, never a
// scanned-flagged image (rigwire.image_checks.clean IS FALSE), and an UNSCANNED
// image only from a domain that is not already near-denylist.
//
// Envelope per .claude/rules/api-conventions.md: { ok, data, error }.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sqlAnalytics } from '@/lib/db';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

const querySchema = z.object({ storyId: z.string().trim().min(1).max(200) });

/** Obvious non-editorial assets that pollute every cluster. */
const JUNK = /logo|favicon|sprite|placeholder|blank|spacer|1x1|\.svg(\?|$)/i;

interface MemberRow {
  url: string;
  title: string | null;
  source: string | null;
}

interface GeneratedRow {
  url: string | null;
}

export interface ClusterImage {
  url: string;
  title: string;
  source: string;
  license: string;
  origin: 'cluster' | 'generated';
  needsLicenseReview: boolean;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

/** Member-article thumbnails, cleanliness-gated, freshest first. */
async function memberImages(storyId: string): Promise<ReadonlyArray<MemberRow>> {
  return (await sqlAnalytics`
    SELECT a.thumbnail_url AS url, max(a.title) AS title, coalesce(max(s.name), '') AS source
    FROM analytics.story_cluster_members_v8 m
    JOIN public.articles a ON a.id = m.article_id
    LEFT JOIN public.sources s ON s.id = a.source_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    LEFT JOIN rigwire.domain_reputation dr
           ON dr.domain = lower(split_part(split_part(a.thumbnail_url, '://', 2), '/', 1))
    WHERE m.story_id = ${storyId}
      AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
      AND coalesce(dr.flag_rate, 0) < 0.9
      AND (ic.clean = true OR (ic.clean IS NULL AND coalesce(dr.flag_rate, 0) < 0.85))
    GROUP BY a.thumbnail_url
    ORDER BY max(a.published_at) DESC NULLS LAST
    LIMIT 60
  `) as unknown as MemberRow[];
}

/** The story's own generated hero, if the generator produced one. */
async function generatedImage(storyId: string): Promise<string | null> {
  const rows = (await sqlAnalytics`
    SELECT g.generated_image->>'url' AS url
    FROM analytics.story_generated_v8 g
    WHERE g.story_id = ${storyId}
    ORDER BY g.updated_at DESC
    LIMIT 1
  `) as unknown as GeneratedRow[];
  return rows[0]?.url ?? null;
}

export async function GET(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  const parsed = querySchema.safeParse({ storyId: new URL(req.url).searchParams.get('storyId') ?? '' });
  if (!parsed.success) return fail('400', 'Query `storyId` is required', 400);
  const { storyId } = parsed.data;

  try {
    const [members, generated] = await Promise.all([memberImages(storyId), generatedImage(storyId)]);

    const seen = new Set<string>();
    const fromGenerated: ClusterImage[] =
      generated && !JUNK.test(generated)
        ? [
            {
              url: generated,
              title: 'Generated hero for this story',
              source: 'RigWire (generated)',
              license: 'RigWire generated image',
              origin: 'generated',
              needsLicenseReview: false,
            },
          ]
        : [];
    fromGenerated.forEach((o) => seen.add(o.url));

    const fromMembers = members.reduce<ClusterImage[]>((acc, r) => {
      if (!r.url || seen.has(r.url) || JUNK.test(r.url)) return acc;
      seen.add(r.url);
      const source = r.source || 'Unknown outlet';
      return [
        ...acc,
        {
          url: r.url,
          title: r.title ?? '(untitled article)',
          source,
          license: `${source} — cluster member (verify rights)`,
          origin: 'cluster' as const,
          needsLicenseReview: false,
        },
      ];
    }, []);

    return NextResponse.json({ ok: true, data: [...fromGenerated, ...fromMembers], error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Cluster media lookup failed', 500);
  }
}

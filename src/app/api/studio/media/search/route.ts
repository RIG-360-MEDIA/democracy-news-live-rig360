// RigWire Studio — media search (GET). Read-only. Returns candidate images for
// the editor's media picker from two origins, each license-labelled:
//   • corpus — public.articles thumbnails via sqlAnalytics (existing behaviour)
//   • web    — SearXNG images if STUDIO_SEARXNG_URL is reachable, else the
//              Wikimedia Commons API (no key required)
// Web-origin results always carry needsLicenseReview: true — an editor must
// clear rights before publishing one. Never writes.
// Envelope per .claude/rules/api-conventions.md: { ok, data, error }.
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { sqlAnalytics } from '@/lib/db';
import { requireEditor } from '@/lib/studio/session';

export const runtime = 'nodejs';

const querySchema = z.object({ q: z.string().trim().min(2).max(120) });

const WEB_TIMEOUT_MS = 6000;
const WEB_LIMIT = 12;

/** SearXNG `format=json` image results — only the fields we consume. */
const searxSchema = z.object({
  results: z
    .array(
      z.object({
        img_src: z.string().optional(),
        thumbnail_src: z.string().optional(),
        title: z.string().optional(),
        source: z.string().optional(),
        engine: z.string().optional(),
      }),
    )
    .default([]),
});

/** Wikimedia Commons `action=query&generator=search` — only the fields we consume. */
const commonsPageSchema = z.object({
  title: z.string().optional(),
  imageinfo: z
    .array(
      z.object({
        url: z.string().optional(),
        thumburl: z.string().optional(),
        extmetadata: z
          .object({
            LicenseShortName: z.object({ value: z.string() }).optional(),
            Artist: z.object({ value: z.string() }).optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

const commonsSchema = z.object({
  query: z.object({ pages: z.record(z.string(), commonsPageSchema).optional() }).optional(),
});

interface CorpusRow {
  url: string;
  title: string | null;
  source: string | null;
}

export interface MediaCandidate {
  url: string;
  title: string;
  source: string;
  license: string;
  origin: 'corpus' | 'web';
  needsLicenseReview: boolean;
}

function fail(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, data: null, error: { code, message } }, { status });
}

/** Strip the HTML Commons puts in `Artist`/license metadata. */
function plain(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(WEB_TIMEOUT_MS),
    headers: { accept: 'application/json', 'user-agent': 'RigWireStudio/1.0 (editorial media picker)' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Upstream ${res.status}`);
  return res.json();
}

async function corpusImages(q: string): Promise<MediaCandidate[]> {
  const like = `%${q}%`;
  const rows = (await sqlAnalytics`
    SELECT DISTINCT ON (a.thumbnail_url)
           a.thumbnail_url AS url, a.title, coalesce(s.name, '') AS source
    FROM public.articles a
    LEFT JOIN public.sources s ON s.id = a.source_id
    WHERE a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
      AND a.title ILIKE ${like}
    ORDER BY a.thumbnail_url, a.published_at DESC NULLS LAST
    LIMIT 24
  `) as unknown as CorpusRow[];

  return rows.map((r) => ({
    url: r.url,
    title: r.title ?? '(untitled article)',
    source: r.source || 'Unknown',
    license: `${r.source || 'Unknown'} — editorial corpus (verify rights)`,
    origin: 'corpus' as const,
    needsLicenseReview: false,
  }));
}

async function searxImages(base: string, q: string): Promise<MediaCandidate[]> {
  const url = `${base.replace(/\/+$/, '')}/search?q=${encodeURIComponent(q)}&categories=images&format=json&safesearch=1`;
  const parsed = searxSchema.safeParse(await fetchJson(url));
  if (!parsed.success) return [];

  return parsed.data.results.reduce<MediaCandidate[]>((acc, r) => {
    const src = r.img_src ?? r.thumbnail_src;
    if (!src || !/^https?:\/\//i.test(src) || acc.length >= WEB_LIMIT) return acc;
    const source = r.source || r.engine || 'Web';
    return [
      ...acc,
      {
        url: src,
        title: r.title ?? '(untitled web image)',
        source,
        license: `${source} — license UNKNOWN, clear rights before use`,
        origin: 'web' as const,
        needsLicenseReview: true,
      },
    ];
  }, []);
}

async function commonsImages(q: string): Promise<MediaCandidate[]> {
  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=1' +
    `&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=${WEB_LIMIT}` +
    '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640';
  const parsed = commonsSchema.safeParse(await fetchJson(url));
  if (!parsed.success) return [];

  const pages = Object.values(parsed.data.query?.pages ?? {});
  return pages.reduce<MediaCandidate[]>((acc, p) => {
    const info = p.imageinfo?.[0];
    const src = info?.thumburl ?? info?.url;
    if (!src) return acc;
    const licence = info?.extmetadata?.LicenseShortName?.value;
    const artist = info?.extmetadata?.Artist?.value;
    const credit = artist ? plain(artist) : 'Unknown author';
    return [
      ...acc,
      {
        url: src,
        title: (p.title ?? '(untitled file)').replace(/^File:/, ''),
        source: 'Wikimedia Commons',
        license: `${licence ? plain(licence) : 'License unstated'} · ${credit} — verify before use`,
        origin: 'web' as const,
        needsLicenseReview: true,
      },
    ];
  }, []);
}

/** SearXNG when configured and reachable, Wikimedia Commons otherwise. Never throws. */
async function webImages(q: string): Promise<MediaCandidate[]> {
  const base = process.env.STUDIO_SEARXNG_URL?.trim();
  if (base) {
    try {
      const hits = await searxImages(base, q);
      if (hits.length) return hits;
    } catch {
      // SearXNG unreachable — fall through to Commons.
    }
  }
  try {
    return await commonsImages(q);
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const guard = await requireEditor();
  if (!guard.ok) {
    return fail(String(guard.status), guard.status === 401 ? 'Not authenticated' : 'Editor access required', guard.status);
  }

  const parsed = querySchema.safeParse({ q: new URL(req.url).searchParams.get('q') ?? '' });
  if (!parsed.success) return fail('400', 'Query `q` must be 2–120 characters', 400);
  const { q } = parsed.data;

  try {
    // The corpus query is the contract; a flaky web upstream must not fail the route.
    const [corpus, web] = await Promise.all([corpusImages(q), webImages(q)]);
    return NextResponse.json({ ok: true, data: [...corpus, ...web], error: null });
  } catch (e: unknown) {
    return fail('500', e instanceof Error ? e.message : 'Media search failed', 500);
  }
}

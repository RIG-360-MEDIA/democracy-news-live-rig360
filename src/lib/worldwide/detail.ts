// src/lib/worldwide/detail.ts
//
// Single-story read: the synthesised article body for the clean reader.
// LOCKED product decision — article body only (no sources/facts/All-Sides panels).

import { sqlAnalytics } from '@/lib/db';

import { getOverrides } from '@/lib/studio/overrides';
import { manualStoryDetail } from '@/lib/studio/manual-feed';

import { countryName } from './country';

export interface StoryImage {
  url: string;
  source: string | null; // publisher name for the caption/attribution
}

export interface CoveragePoint {
  label: string; // e.g. "3 Jul"
  value: number; // articles added that day (real, from member added_at)
}

export interface StoryDetail {
  id: string;
  kicker: string; // "topic · country"
  title: string; // generated headline
  deck: string | null;
  image: string | null; // representative article thumbnail (generated articles have none of their own)
  images: StoryImage[]; // curated supporting images from member articles (deduped, ≤3, hero excluded)
  pullQuote: string | null; // a strong sentence lifted verbatim from the body (real, not generated)
  stats: { articles: number; sources: number } | null; // real cluster coverage stats
  coverage: CoveragePoint[]; // real articles-per-day series for the coverage chart
  paragraphs: string[]; // body split into paragraphs
  readTime: string;
  date: string; // formatted "10 Jun 2026"
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Split a markdown body into render blocks. The generator writes headings with a SINGLE trailing
 * newline (`## Heading\nText…`), so a plain `\n{2,}` split glues the heading onto the next paragraph
 * and it never renders as an <h2>. Force every heading line into its own block first.
 */
export function toParagraphs(body: string): string[] {
  return body
    .replace(/(^|\n)(#{1,6}\s+[^\n]+)/g, '\n\n$2\n\n')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * A curated set of supporting images for a story. Member articles carry image thumbnails; a big story
 * has 100+, but most are the SAME wire photo reprinted, plus source logos. So: aggregate members across
 * ALL run_ids (the set is scattered across ~60 runs — filtering by the cluster's stale run_id sees ~1),
 * drop the hero + obvious logos, keep ONE image per source (kills reprint dupes), cap at 3.
 */
async function getStoryImages(storyId: string, heroUrl: string | null): Promise<StoryImage[]> {
  const rows = (await sqlAnalytics`
    SELECT a.thumbnail_url AS url, s.name AS source
    FROM analytics.story_cluster_members_v8 m
    JOIN articles a ON a.id = m.article_id
    LEFT JOIN sources s ON s.id = a.source_id
    WHERE m.story_id = ${storyId}
      AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
    GROUP BY a.thumbnail_url, s.name
    ORDER BY max(a.published_at) DESC NULLS LAST
    LIMIT 60
  `) as unknown as Array<{ url: string; source: string | null }>;

  const isJunk = (u: string): boolean => /logo|favicon|sprite|placeholder|blank|spacer|1x1|\.svg(\?|$)/i.test(u);
  const domainOf = (u: string): string => u.replace(/^https?:\/\/([^/]+).*/i, '$1').toLowerCase();

  const seenSource = new Set<string>();
  const out: StoryImage[] = [];
  for (const r of rows) {
    if (!r.url || r.url === heroUrl || isJunk(r.url)) continue;
    const key = (r.source ?? domainOf(r.url)).toLowerCase(); // one per source → no reprint dupes
    if (seenSource.has(key)) continue;
    seenSource.add(key);
    out.push({ url: r.url, source: r.source });
    if (out.length >= 3) break;
  }
  return out;
}

/** Lift a strong, self-contained sentence from the body to use as a pull-quote (verbatim, real). */
function pullQuoteFrom(paragraphs: string[]): string | null {
  const prose = paragraphs
    .filter((p) => !isRuleLine(p) && !/^#{1,6}\s/.test(p) && !/^\*\*[^*]+\*\*$/.test(p.trim()))
    .slice(1) // skip the opening paragraph
    .join(' ')
    .replace(/\*+/g, '')
    .replace(/\s+/g, ' ');
  const sentences = prose.match(/[^.!?]+[.!?]/g) ?? [];
  const good = sentences
    .map((s) => s.trim())
    .filter((s) => s.length >= 70 && s.length <= 165 && !/^["“'(]/.test(s) && !/[:;]$/.test(s));
  if (good.length === 0) return null;
  return good[Math.floor(good.length / 2)]; // a line from the middle of the piece
}

const isRuleLine = (raw: string): boolean => /^\s*([-*_]\s*){3,}$/.test(raw);

/** Real "articles added per day" series across all runs — the coverage chart's honest data. */
async function getCoverage(storyId: string): Promise<CoveragePoint[]> {
  const rows = (await sqlAnalytics`
    SELECT date_trunc('day', added_at)::date AS day, count(*)::int AS n
    FROM analytics.story_cluster_members_v8
    WHERE story_id = ${storyId} AND added_at IS NOT NULL
    GROUP BY 1 ORDER BY 1 DESC LIMIT 10
  `) as unknown as Array<{ day: string; n: number }>;
  return rows
    .reverse()
    .map((r) => ({ label: new Date(r.day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), value: r.n }));
}

interface DetailRow {
  headline: string;
  representative_title: string;
  deck: string | null;
  body: string;
  image: string | null;
  rep_tier: number | null;
  word_count: number | null;
  run_id: string | number | null;
  topic: string;
  country: string;
  article_count: number | null;
  independent_source_count: number | null;
  last_seen_at: Date;
}

/** The story page consumes only PUBLISHABLE, non-stub, body-present rows (mirrors hasArticle). */
export async function getStoryDetail(id: string): Promise<StoryDetail | null> {
  if (!UUID_RE.test(id)) return null;

  // If an editor Published/Pinned this story, it opens even when the generator HELD it (mirrors the
  // front-page force-surface). The editor owns that call; we still require a real body below.
  const ov = (await getOverrides([id])).get(id);
  const forced = ov?.action === 'live' || ov?.action === 'pinned';
  const gate = forced
    ? sqlAnalytics`AND g.strategy <> 'stub' AND length(g.body) >= 400`
    : sqlAnalytics`AND g.status LIKE 'PUBLISHABLE%' AND g.strategy <> 'stub'
      AND (EXISTS (SELECT 1 FROM analytics.story_facts_v8 f WHERE f.story_id = g.story_id)
           OR (length(g.body) >= 800 AND g.body NOT ILIKE '%no facts available%'))`;

  const rows = (await sqlAnalytics`
    SELECT g.headline,
           sc.representative_title,
           g.deck,
           g.body,
           CASE WHEN ic.clean IS FALSE OR (ic.clean IS NULL AND coalesce(dr.flag_rate, 0) >= 0.5)
                THEN NULL ELSE a.thumbnail_url END         AS image,
           a.source_tier                                  AS rep_tier,
           g.word_count,
           g.run_id,
           coalesce(nullif(sc.topic, ''), 'OTHER')        AS topic,
           coalesce(nullif(sc.subject_country, ''), 'XX') AS country,
           sc.article_count,
           sc.independent_source_count,
           sc.last_seen_at
    FROM analytics.story_generated_v8 g
    JOIN analytics.story_clusters_v8 sc ON sc.story_id = g.story_id
    LEFT JOIN articles a ON a.id = sc.representative_article_id
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    LEFT JOIN rigwire.domain_reputation dr ON dr.domain = lower(split_part(split_part(a.thumbnail_url, '://', 2), '/', 1))
    WHERE g.story_id = ${id}
      AND g.body IS NOT NULL
      -- never render a parse-fail row (unparsed JSON blob body / '(parse-fail)' headline)
      AND g.headline NOT ILIKE '%(parse-fail)%'
      AND left(btrim(g.body), 1) <> '{'
      -- dedup guard: a story merged away by the cross-window re-join must not open (DB contract).
      AND sc.redirected_to IS NULL
      AND sc.suppression_reason IS NULL
      -- Publishable-substance gate, relaxed for editor-forced stories (see gate var above).
      ${gate}
    ORDER BY g.updated_at DESC
    LIMIT 1
  `) as unknown as DetailRow[];

  if (rows.length === 0) return manualStoryDetail(id); // editor-authored manual story (epic 002)
  const r = rows[0];

  const topicLabel = r.topic === 'OTHER' ? 'News' : r.topic.charAt(0) + r.topic.slice(1).toLowerCase();
  const country = countryName(r.country);
  const kicker = [topicLabel, country].filter(Boolean).join(' · ');

  const words = r.word_count ?? r.body.split(/\s+/).length;
  const readTime = `${Math.max(2, Math.round(words / 200))} min read`;

  // Date shown = when we PUBLISHED it on our site (generation run = unix epoch), guarded to last-seen.
  const pub = Number(r.run_id);
  const publishedMs = pub > 1_000_000_000 && pub < 20_000_000_000 ? pub * 1000 : new Date(r.last_seen_at).getTime();
  const date = new Date(publishedMs).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const paragraphs = toParagraphs(r.body);
  // Hero image: editor override wins; else if the representative photo is a tabloid (tier ≥3) or
  // blank/flagged, swap for the best tier-1/2 photo in the same cluster.
  let heroImage = ov?.editedImage ?? r.image;
  if (!ov?.editedImage && ((r.rep_tier ?? 9) >= 3 || !r.image)) {
    const [best] = (await sqlAnalytics`
      SELECT a2.thumbnail_url AS url
      FROM analytics.story_cluster_members_v8 mem
      JOIN articles a2 ON a2.id = mem.article_id
      LEFT JOIN rigwire.image_checks ic2 ON ic2.thumbnail_url = a2.thumbnail_url
      LEFT JOIN rigwire.domain_reputation dr ON dr.domain = lower(split_part(split_part(a2.thumbnail_url, '://', 2), '/', 1))
      WHERE mem.story_id = ${id}
        AND a2.thumbnail_url IS NOT NULL AND a2.thumbnail_url <> ''
        AND coalesce(a2.source_tier, 9) <= 2
        AND (ic2.clean = true OR (ic2.clean IS NULL AND coalesce(dr.flag_rate, 0) < 0.5))
      ORDER BY (ic2.clean IS TRUE) DESC, coalesce(dr.flag_rate, 0) ASC, coalesce(a2.source_tier, 9) ASC, a2.published_at DESC NULLS LAST
      LIMIT 1
    `) as unknown as { url: string }[];
    if (best?.url) heroImage = best.url;
  }
  const [images, coverage] = await Promise.all([getStoryImages(id, heroImage), getCoverage(id)]);
  const pullQuote = pullQuoteFrom(paragraphs);
  const stats = r.article_count
    ? { articles: r.article_count, sources: r.independent_source_count ?? 0 }
    : null;

  // strip stray markdown ("**", leading "#"/">") the generator sometimes leaves in the headline/deck
  const stripMd = (s: string): string => s.replace(/\*+/g, '').replace(/^\s*[#>]+\s*/, '').trim();

  return {
    id,
    kicker,
    title: stripMd(r.headline) || r.representative_title || r.headline,
    deck: stripMd(r.deck ?? '') || null,
    image: r.image,
    images,
    pullQuote,
    stats,
    coverage,
    paragraphs: paragraphs.length > 0 ? paragraphs : [r.body.trim()],
    readTime,
    date,
  };
}

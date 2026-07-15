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
  credit?: string; // sourced-image attribution (author · license) — shown as a caption
  licenseUrl?: string;
  sourcePage?: string;
}

export interface CoveragePoint {
  label: string; // e.g. "3 Jul"
  value: number; // articles added that day (real, from member added_at)
}

// A tweet card embedded between sub-sections. `sectionIndex` is a 1-based `##`
// heading ordinal (the same contract the box-side selector writes): the card
// renders after that section's content. See analytics.story_generated_v8.tweet_embeds.
export interface TweetEmbed {
  sectionIndex: number;
  tweetId: string;
  authorName: string;
  handle: string; // without leading '@'
  verified: boolean;
  avatarUrl: string | null;
  text: string;
  url: string;
  postedAt: string; // ISO 8601
  replies: number;
  reposts: number;
  likes: number;
  views: number;
}

/** Validate + normalise the jsonb tweet_embeds blob (never trust stored JSON). */
export function toTweetEmbeds(raw: unknown): TweetEmbed[] {
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return raw
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      sectionIndex: num(t.section_index),
      tweetId: str(t.tweet_id),
      authorName: str(t.author_name) || str(t.handle),
      handle: str(t.handle),
      verified: t.verified === true,
      avatarUrl: typeof t.avatar_url === 'string' ? t.avatar_url : null,
      text: str(t.text),
      url: str(t.url),
      postedAt: str(t.posted_at),
      replies: num(t.replies),
      reposts: num(t.reposts),
      likes: num(t.likes),
      views: num(t.views),
    }))
    .filter((t) => t.text && t.handle);
}

// A freely-licensed hero image sourced box-side (Wikimedia Commons), keyed to the story's
// main subject. Shown as the hero with a REQUIRED attribution caption (author + license).
export interface HeroImage {
  url: string;
  source: string; // e.g. "Wikimedia Commons"
  sourcePage: string; // description/file page (attribution link)
  author: string;
  license: string; // e.g. "CC BY-SA 4.0", "Public domain"
  licenseUrl: string;
  credit: string; // ready-made "Author / License" line
}

/** Extract the sourced-image gallery (extra photos for the article's inline figures). */
export function toGallery(raw: unknown): StoryImage[] {
  if (!raw || typeof raw !== 'object') return [];
  const g = (raw as Record<string, unknown>).gallery;
  if (!Array.isArray(g)) return [];
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  return g
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map((x) => ({
      url: str(x.url),
      source: str(x.source) || 'Wikimedia Commons',
      credit: str(x.credit),
      licenseUrl: str(x.license_url),
      sourcePage: str(x.source_page),
    }))
    .filter((i) => i.url);
}

/** Validate the generated_image jsonb blob (a sourced hero record); null when absent/malformed. */
export function toHeroImage(raw: unknown): HeroImage | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');
  const url = str(o.url);
  if (!url) return null;
  return {
    url,
    source: str(o.source) || 'Wikimedia Commons',
    sourcePage: str(o.source_page),
    author: str(o.author),
    license: str(o.license),
    licenseUrl: str(o.license_url),
    credit: str(o.credit) || str(o.author) || str(o.source),
  };
}

export interface StoryDetail {
  id: string;
  kicker: string; // "topic · country"
  title: string; // generated headline
  deck: string | null;
  image: string | null; // hero image shown to the reader (sourced licensed photo when present, else member photo)
  heroImage: HeroImage | null; // set when the hero is a sourced Commons photo (drives the credit caption)
  images: StoryImage[]; // curated supporting images from member articles (deduped, ≤3, hero excluded)
  pullQuote: string | null; // a strong sentence lifted verbatim from the body (real, not generated)
  stats: { articles: number; sources: number } | null; // real cluster coverage stats
  coverage: CoveragePoint[]; // real articles-per-day series for the coverage chart
  paragraphs: string[]; // body split into paragraphs
  tweets: TweetEmbed[]; // related tweets to weave between sub-sections (box-selected)
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
    LEFT JOIN rigwire.image_checks ic ON ic.thumbnail_url = a.thumbnail_url
    LEFT JOIN rigwire.domain_reputation dr ON dr.domain = lower(split_part(split_part(a.thumbnail_url, '://', 2), '/', 1))
    WHERE m.story_id = ${storyId}
      AND a.thumbnail_url IS NOT NULL AND a.thumbnail_url <> ''
      -- same cleanliness gate as the hero: never a hard-denylisted domain, never scanned-flagged,
      -- and unscanned only from a source that isn't historically mostly-junk.
      AND coalesce(dr.flag_rate, 0) < 0.9
      AND (ic.clean = true OR (ic.clean IS NULL AND coalesce(dr.flag_rate, 0) < 0.85))
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
  tweet_embeds: unknown; // jsonb → parsed array of tweet embeds (validated below)
  generated_image: unknown; // jsonb → AI-generated hero (validated below)
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
           g.tweet_embeds,
           g.generated_image,
           -- flag_rate >= 0.9 = hard denylist (heavy-brand/state-media false-negatives): null even if scanned "clean".
           CASE WHEN coalesce(dr.flag_rate, 0) >= 0.9
                     OR ic.clean IS FALSE
                     OR (ic.clean IS NULL AND coalesce(dr.flag_rate, 0) >= 0.85)
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
        AND coalesce(dr.flag_rate, 0) < 0.9
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

  // Sourced licensed hero wins when present; otherwise fall back to the best member photo.
  const heroImg = toHeroImage(r.generated_image);
  // Inline article figures: use the sourced gallery (clean, credited) when we have it,
  // else fall back to the deduped member photos.
  const sourcedGallery = toGallery(r.generated_image);

  return {
    id,
    kicker,
    title: stripMd(r.headline) || r.representative_title || r.headline,
    deck: stripMd(r.deck ?? '') || null,
    image: heroImg?.url ?? r.image,
    heroImage: heroImg,
    images: sourcedGallery.length > 0 ? sourcedGallery : images,
    pullQuote,
    stats,
    coverage,
    paragraphs: paragraphs.length > 0 ? paragraphs : [r.body.trim()],
    tweets: toTweetEmbeds(r.tweet_embeds),
    readTime,
    date,
  };
}

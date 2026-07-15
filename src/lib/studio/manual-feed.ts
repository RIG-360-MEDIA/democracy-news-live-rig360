// Editorial CMS — surface editor-authored manual stories in the reader feed & read path (epic 002).
// Manual stories live in rigwire.manual_stories (no generator row); they are adapted to the reader's
// StoryCard / StoryDetail shapes so a Create-page story appears and opens like any other.

import { sql } from '@/lib/db';

import { toParagraphs } from '@/lib/worldwide/detail';

import type { StoryDetail } from '@/lib/worldwide/detail';
import type { StoryCard } from '@/lib/worldwide/types';

interface CardRow {
  id: string;
  headline: string;
  dek: string | null;
  topic: string | null;
  country: string | null;
  image_url: string | null;
  importance: string | number;
  created_at: string | Date;
}

/** Publishable manual stories as reader front-page cards (merged into the ranking pool). */
export async function manualStoryCards(): Promise<StoryCard[]> {
  const rows = (await sql`
    SELECT id::text AS id, headline, dek, topic, country, image_url, importance, created_at
    FROM rigwire.manual_stories
    WHERE status LIKE 'PUBLISHABLE%'
    ORDER BY created_at DESC
    LIMIT 50
  `) as unknown as CardRow[];
  const now = Date.now();
  return rows.map((r): StoryCard => ({
    id: r.id,
    title: r.headline,
    deck: r.dek,
    image: r.image_url,
    hasArticle: true,
    topic: (r.topic || 'OTHER').toUpperCase(),
    country: r.country || 'XX',
    importance: Number(r.importance),
    independentSources: 1,
    articleCount: 1,
    facts: 0,
    lastSeenAt: new Date(r.created_at).toISOString(),
    freshnessSeconds: Math.max(0, (now - new Date(r.created_at).getTime()) / 1000),
    isScoop: false,
    dominantEntity: null,
  }));
}

interface DetailRow {
  headline: string;
  dek: string | null;
  body: string;
  topic: string | null;
  country: string | null;
  image_url: string | null;
  created_at: string | Date;
}

/** Resolve a manual story into the reader's StoryDetail (fallback when no generated row exists). */
export async function manualStoryDetail(id: string): Promise<StoryDetail | null> {
  const rows = (await sql`
    SELECT headline, dek, body, topic, country, image_url, created_at
    FROM rigwire.manual_stories
    WHERE id = ${id} AND status LIKE 'PUBLISHABLE%'
    LIMIT 1
  `) as unknown as DetailRow[];
  if (rows.length === 0) return null;
  const r = rows[0];

  const topicLabel = r.topic && r.topic !== 'OTHER' ? r.topic.charAt(0) + r.topic.slice(1).toLowerCase() : 'News';
  const country = r.country && r.country !== 'XX' ? r.country : '';
  const kicker = [topicLabel, country].filter(Boolean).join(' · ');
  const paragraphs = toParagraphs(r.body);
  const words = r.body.split(/\s+/).length;

  return {
    id,
    kicker,
    title: r.headline,
    deck: r.dek,
    image: r.image_url,
    heroImage: null, // editor-authored manual stories use their own uploaded image
    images: [], // manual stories have no member set — just the hero
    pullQuote: null,
    stats: null,
    coverage: [],
    paragraphs: paragraphs.length > 0 ? paragraphs : [r.body.trim()],
    tweets: [], // editor-authored manual stories carry no auto-selected tweets
    readTime: `${Math.max(2, Math.round(words / 200))} min read`,
    date: new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };
}

import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { notFound } from 'next/navigation';

import { BRAND } from '@/lib/brand';
import { CACHE_TAGS, READER_CACHE_TTL } from '@/lib/cache';
import { getStoryDetail, UUID_RE } from '@/lib/worldwide/detail';
import { StoryRead } from '@/components/long-read/story-read';

// ISR (E8): story pages were force-dynamic, so every view re-rendered on the server (always a CDN
// MISS, ~1 s TTFB). Now each slug is rendered on first visit and the HTML is cached for `revalidate`
// seconds. No paths are prerendered at build (generateStaticParams → []), so the build needs no DB.
// Invalidation: the render reads through getCachedStoryDetail, whose CACHE_TAGS.storyDetail tag is
// attached to the cached page too — so revalidateTag(storyDetail) (studio kill/edit, the box's
// /api/revalidate) purges the HTML as well as the data, and a killed story re-renders to 404.
// Must be a literal (Next reads it statically); keep in step with READER_CACHE_TTL's 1800 s default.
export const revalidate = 1800;
export const dynamicParams = true;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

// Cache the Neon read (keyed by slug). getStoryDetail is called twice per render
// (generateMetadata + the page body); caching collapses that to one query and
// serves subsequent renders from cache until READER_CACHE_TTL / an editor edit.
const getCachedStoryDetail = unstable_cache(
  (slug: string) => getStoryDetail(slug),
  ['reader-story-detail'],
  { revalidate: READER_CACHE_TTL, tags: [CACHE_TAGS.storyDetail] },
);

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Per-story social preview: a shared article link shows ITS headline + deck + clean hero photo,
// not the generic site card. Falls back to the branded default if the story has no image.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  // Junk slugs (bot scans) never reach the Data Cache — one cached entry per real story only.
  if (!UUID_RE.test(slug)) return { title: 'Democracy News Live' };
  const story = await getCachedStoryDetail(slug).catch(() => null);
  if (!story) return { title: 'Democracy News Live' };
  const image = story.image ?? '/cards/fallback-1.png'; // story.image is already the cleaned/denylisted hero
  const description = story.deck ?? undefined;
  const url = `/long-read/${slug}`;
  return {
    title: `${story.title} — Democracy News Live`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: story.title,
      description,
      url,
      siteName: 'Democracy News Live',
      type: 'article',
      images: [{ url: image, width: 1200, height: 630, alt: story.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: story.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  if (!UUID_RE.test(slug)) notFound();
  const story = await getCachedStoryDetail(slug);
  if (!story) notFound();
  // Structured data (P06 D-4): lets search engines show this as a news article.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title.slice(0, 110),
    description: story.deck ?? undefined,
    image: story.image ? [story.image] : undefined,
    mainEntityOfPage: `${BRAND.siteUrl}/long-read/${slug}`,
    author: { '@type': 'Organization', name: BRAND.byline },
    publisher: { '@type': 'Organization', name: BRAND.name, logo: { '@type': 'ImageObject', url: `${BRAND.siteUrl}/logo.png` } },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <StoryRead story={story} />
    </>
  );
}

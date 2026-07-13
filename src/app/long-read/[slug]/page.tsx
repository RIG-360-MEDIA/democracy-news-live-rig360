import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getStoryDetail } from '@/lib/worldwide/detail';
import { StoryRead } from '@/components/long-read/story-read';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Per-story social preview: a shared article link shows ITS headline + deck + clean hero photo,
// not the generic site card. Falls back to the branded default if the story has no image.
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = await getStoryDetail(slug).catch(() => null);
  if (!story) return { title: 'Democracy News Live' };
  const image = story.image ?? '/cards/placeholder.png'; // story.image is already the cleaned/denylisted hero
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
  const story = await getStoryDetail(slug);
  if (!story) notFound();
  return <StoryRead story={story} />;
}

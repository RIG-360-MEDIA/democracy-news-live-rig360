import { notFound } from 'next/navigation';

import { getStoryDetail } from '@/lib/worldwide/detail';
import { StoryRead } from '@/components/long-read/story-read';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Worldwide — Rig Wire',
  description: 'A synthesised read from across the world’s coverage.',
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const story = await getStoryDetail(slug);
  if (!story) notFound();
  return <StoryRead story={story} />;
}

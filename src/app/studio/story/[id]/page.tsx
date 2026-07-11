// Editorial CMS — Story Editor page: header + two-column inline editor (epic 002, E3).
import Link from 'next/link';

import { getStoryForEdit } from '@/lib/studio/story';

import { StoryEditorClient } from './editor-client';

export const dynamic = 'force-dynamic';

interface Badge {
  bg: string;
  fg: string;
  label: string;
}

function badge({ bg, fg, label }: Badge) {
  return (
    <span
      key={label}
      style={{
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '.04em',
        color: fg,
        background: bg,
        padding: '3px 8px',
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

export default async function StoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await getStoryForEdit(id);

  if (!story) {
    return (
      <div>
        <Link href="/studio" style={{ fontSize: 13, color: '#1b4b91', fontWeight: 600 }}>
          ← Back to Desk
        </Link>
        <p style={{ color: '#888', padding: '48px 0', textAlign: 'center', fontSize: 15 }}>
          Story not found.
        </p>
      </div>
    );
  }

  const { generated, override } = story;
  const killed = override?.action === 'killed';
  const badges: Badge[] = [];
  if (killed) badges.push({ bg: '#fde2e1', fg: '#a8141a', label: 'KILLED' });
  if (override?.action === 'pinned') badges.push({ bg: '#e6f0ff', fg: '#1b4b91', label: 'PINNED' });
  if (override?.humanLocked) badges.push({ bg: '#fde2e1', fg: '#a8141a', label: '🔒 LOCKED' });
  if (override && (override.editedHeadline || override.editedDek || override.editedBody))
    badges.push({ bg: '#e6f0ff', fg: '#1b4b91', label: '✎ EDITED' });

  return (
    <div>
      <Link href="/studio" style={{ fontSize: 13, color: '#1b4b91', fontWeight: 600 }}>
        ← Back to Desk
      </Link>

      <header style={{ margin: '14px 0 20px' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '.04em',
              color: generated.status.startsWith('HELD') ? '#8a6d1a' : '#2e7d32',
              background: generated.status.startsWith('HELD') ? '#fff4d6' : '#e8f5e9',
              padding: '3px 8px',
              borderRadius: 4,
            }}
          >
            {generated.status}
          </span>
          {badges.map(badge)}
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 26,
            fontWeight: 600,
            lineHeight: 1.2,
            margin: 0,
            color: '#111',
          }}
        >
          {story.effective.headline || '(untitled)'}
        </h1>
        <div style={{ fontSize: 12, color: '#888', marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{generated.topic}</span>
          <span>· {generated.country}</span>
          <span>· {generated.wordCount}w</span>
          <span style={{ fontFamily: 'var(--font-mono), monospace' }}>· {story.storyId}</span>
        </div>
      </header>

      <StoryEditorClient story={story} />
    </div>
  );
}

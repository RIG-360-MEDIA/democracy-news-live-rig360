// RigWire Studio — Story Editor. Server shell: role-gate, load the generated +
// override bundle and the cluster evidence, then mount the client editor (tabbed
// Content · Media · Embeds · Sources · History) inside a ToastProvider. The
// editor writes only editorial OVERRIDES; generated tables are never touched.
import Link from 'next/link';

import { ToastProvider } from '@/components/studio/ui';
import EditorShell from '@/components/studio/editor/editor-shell';
import { getStoryForEdit } from '@/lib/studio/story';
import { requireEditor } from '@/lib/studio/session';
import { countryName } from '@/lib/worldwide/country';

import { loadHistory, revert } from './actions';
import { loadClusterSources } from './sources';

export const dynamic = 'force-dynamic';

function NotFound({ note }: { note: string }) {
  return (
    <div>
      <Link href="/studio" className="font-sans text-ui-md font-semibold text-studio-accent no-underline">
        ← Back to Desk
      </Link>
      <p className="py-12 text-center font-sans text-ui-lg text-studio-muted">{note}</p>
    </div>
  );
}

export default async function StoryEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const guard = await requireEditor();
  if (!guard.ok) return <NotFound note="Editor access required." />;

  const story = await getStoryForEdit(id);
  if (!story) return <NotFound note="Story not found." />;

  const sources = await loadClusterSources(id);

  const { generated, override } = story;
  const badges: string[] = [];
  if (override?.action === 'killed') badges.push('KILLED');
  if (override?.action === 'pinned') badges.push('PINNED');
  if (override?.humanLocked) badges.push('LOCKED');
  if (override && (override.editedHeadline || override.editedDek || override.editedBody || override.editedImage))
    badges.push('EDITED');

  const held = generated.status.startsWith('HELD');

  return (
    <div>
      <Link href="/studio" className="font-sans text-ui-md font-semibold text-studio-accent no-underline">
        ← Back to Desk
      </Link>

      <header className="my-4 mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={[
              'inline-flex items-center border px-2 py-0.5 font-mono text-ui-sm uppercase tracking-wider',
              held ? 'border-studio-muted text-studio-ink' : 'border-studio-ink bg-studio-ink text-studio-paper',
            ].join(' ')}
          >
            {generated.status}
          </span>
          {badges.map((b) => (
            <span
              key={b}
              className={[
                'inline-flex items-center border px-2 py-0.5 font-mono text-ui-sm uppercase tracking-wider',
                b === 'KILLED' || b === 'LOCKED'
                  ? 'border-studio-accent text-studio-accent'
                  : 'border-studio-rule text-studio-muted',
              ].join(' ')}
            >
              {b}
            </span>
          ))}
        </div>

        <h1 className="font-display text-d-sm text-studio-ink">{story.effective.headline || '(untitled)'}</h1>

        <div className="mt-2 flex flex-wrap gap-2 font-mono text-ui-sm text-studio-muted">
          <span>{generated.topic}</span>
          <span>· {countryName(generated.country) || generated.country}</span>
          <span>· {generated.wordCount}w</span>
          <span>· {story.storyId}</span>
        </div>
      </header>

      <ToastProvider>
        <EditorShell
          story={story}
          storyId={story.storyId}
          sources={sources}
          loadHistory={loadHistory}
          revert={revert}
        />
      </ToastProvider>
    </div>
  );
}

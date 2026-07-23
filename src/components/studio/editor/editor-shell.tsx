'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SegmentedToggle, useToast } from '@/components/studio/ui';
import type { StoryForEdit } from '@/lib/studio/story';

import ContentTab from './content-tab';
import EmbedsTab from './embeds-tab';
import HistoryTab from './history-tab';
import MediaTab from './media-tab';
import SourcesTab from './sources-tab';
import { useAutosave } from './use-autosave';
import type { HistoryEntry, SourceItem } from './types';

// Tabbed shell for the story editor. Owns the four editable fields so the
// Content / Media / Embeds tabs all edit one shared, immutable snapshot; a
// debounced autosave persists every change as an editorial OVERRIDE through the
// existing /api/studio/edit route. Generated content is never written.

type TabKey = 'content' | 'media' | 'embeds' | 'sources' | 'history';

const TABS = [
  { key: 'content' as const, label: 'Content' },
  { key: 'media' as const, label: 'Media' },
  { key: 'embeds' as const, label: 'Embeds' },
  { key: 'sources' as const, label: 'Sources' },
  { key: 'history' as const, label: 'History' },
];

interface Snapshot {
  headline: string;
  dek: string;
  body: string;
  image: string;
}

export interface EditorShellProps {
  story: StoryForEdit;
  storyId: string;
  sources: ReadonlyArray<SourceItem>;
  loadHistory: (storyId: string) => Promise<HistoryEntry[]>;
  revert: (storyId: string, auditId: number) => Promise<{ ok: boolean; message?: string }>;
}

const STATUS_LABEL = {
  idle: '',
  dirty: 'Unsaved changes',
  saving: 'Saving…',
  saved: 'Saved · override locked',
  error: 'Save failed',
} as const;

export default function EditorShell({ story, storyId, sources, loadHistory, revert }: EditorShellProps) {
  const toast = useToast();
  const [tab, setTab] = useState<TabKey>('content');

  const [headline, setHeadline] = useState(story.effective.headline);
  const [dek, setDek] = useState(story.effective.deck);
  const [body, setBody] = useState(story.effective.body);
  const [image, setImage] = useState(story.effective.image ?? '');

  const generatedImage = story.generated.image ?? '';

  const save = useCallback(
    async (snap: unknown): Promise<boolean> => {
      const s = snap as Snapshot;
      const r = await fetch('/api/studio/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyId, headline: s.headline, dek: s.dek, body: s.body, image: s.image }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
        toast.show(j?.error?.message ?? `Save failed (${r.status})`, 'error');
        return false;
      }
      return true;
    },
    [storyId, toast],
  );

  const initial = useRef<Snapshot>({
    headline: story.effective.headline,
    dek: story.effective.deck,
    body: story.effective.body,
    image: story.effective.image ?? '',
  });
  const { status, schedule, flush } = useAutosave(save, initial.current);

  // Any field change reschedules the debounced save of the whole snapshot.
  useEffect(() => {
    schedule({ headline, dek, body, image });
  }, [headline, dek, body, image, schedule]);

  const changeTab = (next: TabKey) => {
    flush(); // persist pending edits before leaving Content/Media/Embeds
    setTab(next);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between border-b border-studio-rule pb-3">
        <SegmentedToggle<TabKey> options={TABS} value={tab} onChange={changeTab} ariaLabel="Editor sections" />
        <span
          className={`font-mono text-ui-sm ${status === 'error' ? 'text-studio-accent' : 'text-studio-muted'}`}
          aria-live="polite"
        >
          {STATUS_LABEL[status]}
        </span>
      </div>

      {tab === 'content' && (
        <ContentTab
          headline={headline}
          dek={dek}
          body={body}
          generated={{ headline: story.generated.headline, dek: story.generated.deck, body: story.generated.body }}
          onHeadline={setHeadline}
          onDek={setDek}
          onBody={setBody}
        />
      )}
      {tab === 'media' && (
        <MediaTab
          storyId={storyId}
          image={image}
          body={body}
          generatedImage={generatedImage}
          onImage={setImage}
          onBody={setBody}
        />
      )}
      {tab === 'embeds' && <EmbedsTab body={body} onBody={setBody} />}
      {tab === 'sources' && <SourcesTab sources={sources} />}
      {tab === 'history' && <HistoryTab storyId={storyId} loadHistory={loadHistory} revert={revert} />}
    </div>
  );
}

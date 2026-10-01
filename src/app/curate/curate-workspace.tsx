'use client';

// Client shell for /curate. Holds the Reader|Editor VIEW state and renders the REAL
// reader front page (LongReadPage) untouched. Reader view = exactly what readers see
// (no EditModeProvider → no pucks). Editor view = the existing edit-mode layer PLUS
// the editor-only overlays above the live preview. We only ever choose whether to wrap
// the reader render in the existing provider — we never modify reader components.

import { useMemo, useState } from 'react';

import { EditModeProvider } from '@/components/long-read/edit-mode';
import { LongReadPage } from '@/components/long-read/long-read-page';
import type { Video } from '@/components/long-read/videos-data';
import HeroSlot from '@/components/studio/curate/hero-slot';
import ReorderOverlay from '@/components/studio/curate/reorder-overlay';
import SectionManager from '@/components/studio/curate/section-manager';
import { ToastProvider } from '@/components/studio/ui';

import { CurateBar, type CurateView } from './curate-bar';

import type { CurateItem } from '@/components/studio/curate/types';
import type { FrontPage } from '@/lib/worldwide/types';

interface CurateWorkspaceProps {
  editor: string;
  /** Admin-only (F8): section prominence writes the feed-wide ranking weights. */
  canManageSections: boolean;
  data: FrontPage;
  /** Pin-set fingerprint at render time — sent back with a reorder so a stale tab gets a 409. */
  pinToken: string;
  /** Watch rail clips, already recency-filtered on the server (same list readers get). */
  videos: readonly Video[];
}

/** Flatten FrontPage.topStories into pinnable cards; a hub collapses to its lead member. */
function toItems(units: FrontPage['topStories']): CurateItem[] {
  return units.map((u) =>
    'kind' in u
      ? { id: u.members[0]?.id ?? u.hubId, title: u.title, image: u.image, topic: u.topic }
      : { id: u.id, title: u.title, image: u.image, topic: u.topic },
  );
}

export function CurateWorkspace({ editor, canManageSections, data, pinToken, videos }: CurateWorkspaceProps) {
  const [view, setView] = useState<CurateView>('editor');
  const [sectionsOpen, setSectionsOpen] = useState(false);

  const items = useMemo(() => toItems(data.topStories), [data.topStories]);
  const editing = view === 'editor';

  return (
    <ToastProvider>
      <CurateBar
        editor={editor}
        view={view}
        onViewChange={setView}
        onOpenSections={canManageSections ? () => setSectionsOpen(true) : undefined}
      />

      {editing && (
        <div className="border-b border-studio-rule bg-studio-paper px-5 py-4">
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            <HeroSlot current={items[0] ?? null} />
            <ReorderOverlay items={items} pinToken={pinToken} />
          </div>
        </div>
      )}

      {canManageSections && <SectionManager open={sectionsOpen} onClose={() => setSectionsOpen(false)} />}

      {editing ? (
        <EditModeProvider>
          <LongReadPage data={data} videos={videos} />
        </EditModeProvider>
      ) : (
        <LongReadPage data={data} videos={videos} />
      )}
    </ToastProvider>
  );
}

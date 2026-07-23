'use client';

// Door B draft review — client orchestrator. Seeds the review store from the
// server-fetched bundle, then lays out the story column (left ~2/3) and the
// context rail (right), with the evidence drawer + publish bar pinned below.

import { useEffect } from 'react';

import BeatBlock from '@/components/studio/draft/beat-block';
import EvidenceDrawer from '@/components/studio/draft/evidence-drawer';
import FlagList from '@/components/studio/draft/flag-list';
import PublishBar from '@/components/studio/draft/publish-bar';
import SourcesRail from '@/components/studio/draft/sources-rail';
import ThumbnailPicker from '@/components/studio/draft/thumbnail-picker';
import { useReviewStore } from '@/components/studio/draft/store';
import { StatusChip } from '@/components/studio/ui';

import type { DraftBundle } from '@/lib/dispatch/types';

interface ReviewClientProps {
  bundle: DraftBundle;
}

export default function ReviewClient({ bundle }: ReviewClientProps) {
  const hydrate = useReviewStore((s) => s.hydrate);
  const draft = useReviewStore((s) => s.draft);
  const jobId = useReviewStore((s) => s.jobId);

  useEffect(() => {
    hydrate(bundle);
  }, [hydrate, bundle]);

  // Until the store is seeded with THIS job, render nothing (avoids a flash of
  // stale state when navigating between drafts).
  if (!draft || jobId !== bundle.job_id) return null;

  return (
    <div className="min-h-screen bg-studio-paper pb-40">
      <header className="mx-auto max-w-6xl px-6 pt-6">
        <div className="flex items-center gap-3">
          <StatusChip state="ready" label="Needs review" />
          <span className="font-mono text-ui-sm text-studio-muted">{bundle.job_id}</span>
        </div>
        <h1 className="mt-3 font-display text-d-md text-studio-ink">{draft.headline}</h1>
        <p className="mt-2 font-sans text-b-lg text-studio-muted">{draft.dek}</p>
      </header>

      <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-6 px-6 lg:grid-cols-3">
        <main className="flex flex-col gap-5 lg:col-span-2">
          {draft.beats.map((_, i) => (
            <BeatBlock key={i} index={i} />
          ))}

          {draft.key_facts.length > 0 && (
            <section className="border border-studio-rule p-4">
              <h2 className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Key facts</h2>
              <ul className="mt-2 list-disc pl-5 font-sans text-b-sm text-studio-ink">
                {draft.key_facts.map((k, i) => (
                  <li key={i}>{k.fact}</li>
                ))}
              </ul>
            </section>
          )}

          {draft.pull_quote && (
            <blockquote className="border-l-2 border-studio-ink pl-4 font-display text-d-xs italic text-studio-ink">
              “{draft.pull_quote.text}”
              <footer className="mt-1 font-sans text-ui-md not-italic text-studio-muted">
                — {draft.pull_quote.speaker}
              </footer>
            </blockquote>
          )}

          {draft.unsourced_gaps.length > 0 && (
            <section className="border border-dashed border-studio-accent p-4">
              <h2 className="font-mono text-ui-sm uppercase tracking-wider text-studio-accent">
                Unsourced gaps
              </h2>
              <ul className="mt-2 list-disc pl-5 font-sans text-b-sm text-studio-ink">
                {draft.unsourced_gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </section>
          )}

          <FlagList />
        </main>

        <aside className="flex flex-col gap-6 lg:col-span-1">
          <div className="lg:sticky lg:top-6 lg:self-start">
            <SourcesRail />
          </div>
          <ThumbnailPicker />
        </aside>
      </div>

      <EvidenceDrawer />
      <PublishBar />
    </div>
  );
}

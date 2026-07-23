'use client';

// Sticky footer: word count, dial recap, unresolved-flag counter, Regenerate,
// and PUBLISH. Publish is DISABLED until every flag is resolved AND a thumbnail
// is chosen, and is NOT optimistic — it awaits the box, then reveals the live
// link. Regenerate has no proxy route on this surface (see cross-agent notes).

import { useState } from 'react';
import Link from 'next/link';

import { useToast } from '@/components/studio/ui';

import { useReviewStore } from './store';

function wordCount(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

export default function PublishBar() {
  const draft = useReviewStore((s) => s.draft);
  const dials = useReviewStore((s) => s.dials);
  const flags = useReviewStore((s) => s.flags);
  const chosenImageId = useReviewStore((s) => s.selection.chosenImageId);
  const publishing = useReviewStore((s) => s.publishing);
  const publish = useReviewStore((s) => s.publish);
  const { show } = useToast();
  const [publishedId, setPublishedId] = useState<string | null>(null);

  const openFlags = flags.filter((f) => f.status === 'open');
  const openAmber = openFlags.filter((f) => f.severity === 'amber').length;
  const openRed = openFlags.filter((f) => f.severity === 'red').length;
  const words = draft ? draft.beats.reduce((n, b) => n + wordCount(b.text), 0) : 0;

  const canPublish = openFlags.length === 0 && chosenImageId !== null && !publishing;
  const flagLabel =
    openFlags.length === 0
      ? 'all flags resolved'
      : `${openAmber} amber, ${openRed} red unresolved`;

  async function onPublish() {
    const id = await publish(show);
    if (id) setPublishedId(id);
  }

  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 border-t border-studio-rule bg-studio-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
        <span className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
          {words} words
        </span>
        {dials && (
          <span className="font-mono text-ui-sm text-studio-muted">
            C{dials.creativity} · M{dials.moxy} · {dials.length_target}w · spot-check{' '}
            {dials.spot_check ? 'on' : 'off'}
          </span>
        )}
        <span
          className={[
            'font-mono text-ui-sm uppercase tracking-wider',
            openFlags.length === 0 ? 'text-studio-muted' : 'text-studio-accent',
          ].join(' ')}
        >
          {flagLabel}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {publishedId && (
            <Link
              href="/curate"
              className="font-mono text-ui-sm uppercase tracking-wider text-studio-ink underline underline-offset-2"
            >
              view in curate ↗
            </Link>
          )}
          <button
            type="button"
            onClick={() =>
              show('Regenerate starts a fresh draft job — open it from Studio → Create.', 'info')
            }
            className="border border-studio-ink px-3 py-1.5 font-mono text-ui-sm uppercase tracking-wider text-studio-ink"
          >
            Regenerate
          </button>
          <button
            type="button"
            disabled={!canPublish}
            onClick={() => void onPublish()}
            className="border border-studio-accent bg-studio-accent px-4 py-1.5 font-mono text-ui-sm uppercase tracking-wider text-studio-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </button>
        </div>
      </div>
    </footer>
  );
}

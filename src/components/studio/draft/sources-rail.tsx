'use client';

// Context rail: the cited sources for whichever beat is hovered/focused. Reads
// selection.hoveredBeat from the store, maps the beat's source_ids to evidence.

import { TrustBadge } from '@/components/studio/ui';

import { useReviewStore } from './store';

import type { EvidenceRef } from '@/lib/dispatch/types';

export default function SourcesRail() {
  const hovered = useReviewStore((s) => s.selection.hoveredBeat);
  const beat = useReviewStore((s) => (hovered === null ? undefined : s.draft?.beats[hovered]));
  const evidence = useReviewStore((s) => s.evidence);

  const cited: EvidenceRef[] =
    beat?.source_ids
      .map((id) => evidence.find((e) => e.source_id === id))
      .filter((e): e is EvidenceRef => e !== undefined) ?? [];

  return (
    <section aria-label="Cited sources" className="border border-studio-rule bg-studio-paper p-4">
      <h2 className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">Cited sources</h2>

      {beat === undefined ? (
        <p className="mt-3 font-sans text-b-sm text-studio-muted">
          Hover or focus a beat to see the sources behind it.
        </p>
      ) : cited.length === 0 ? (
        <p className="mt-3 font-sans text-b-sm text-studio-accent">
          This beat cites no source.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {cited.map((e) => (
            <li key={e.source_id} className="border-t border-studio-rule pt-3 first:border-t-0 first:pt-0">
              <div className="flex items-center gap-2">
                <TrustBadge tier={e.trust_tier} />
                <span className="font-sans text-ui-md font-semibold text-studio-ink">
                  {e.outlet ?? e.source_type}
                </span>
              </div>
              {e.title && <p className="mt-1 font-sans text-b-sm text-studio-ink">{e.title}</p>}
              <p className="mt-1 font-sans text-ui-md text-studio-muted">{e.snippet}</p>
              {e.url && (
                <a
                  href={e.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block font-mono text-ui-sm text-studio-ink underline underline-offset-2"
                >
                  open source ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

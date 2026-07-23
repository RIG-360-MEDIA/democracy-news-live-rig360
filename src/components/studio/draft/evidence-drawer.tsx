'use client';

// Bottom drawer: the full evidence set grouped by source kind. Tabs across the
// top (Corpus / YouTube / Web / Social); each item shows a trust badge, outlet,
// and snippet. Collapsed by default so it never fights the story column.

import { useState } from 'react';

import { TrustBadge } from '@/components/studio/ui';

import { useReviewStore } from './store';

import type { EvidenceRef, SourceType } from '@/lib/dispatch/types';

type EvidenceGroup = 'Corpus' | 'YouTube' | 'Web' | 'Social';

const GROUP_ORDER: readonly EvidenceGroup[] = ['Corpus', 'YouTube', 'Web', 'Social'];

const GROUP_BY_TYPE: Record<SourceType, EvidenceGroup> = {
  corpus_article: 'Corpus',
  story_fact: 'Corpus',
  wikipedia: 'Web',
  web: 'Web',
  youtube_clip: 'YouTube',
  twitter: 'Social',
  reddit: 'Social',
  tiktok: 'Social',
  telegram: 'Social',
  instagram: 'Social',
  wechat: 'Social',
};

export default function EvidenceDrawer() {
  const evidence = useReviewStore((s) => s.evidence);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<EvidenceGroup>('Corpus');

  const inTab = evidence.filter((e) => GROUP_BY_TYPE[e.source_type] === tab);

  return (
    <div className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-6xl px-6">
      <div className="border border-studio-rule bg-studio-paper shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-4 py-2 font-mono text-ui-sm uppercase tracking-wider text-studio-muted"
        >
          <span>Evidence — {evidence.length} sources</span>
          <span>{open ? '▾ hide' : '▸ show'}</span>
        </button>

        {open && (
          <div className="border-t border-studio-rule">
            <div className="flex border-b border-studio-rule">
              {GROUP_ORDER.map((g) => {
                const count = evidence.filter((e) => GROUP_BY_TYPE[e.source_type] === g).length;
                const active = g === tab;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setTab(g)}
                    className={[
                      'px-4 py-2 font-mono text-ui-sm uppercase tracking-wider',
                      active
                        ? 'border-b-2 border-studio-ink text-studio-ink'
                        : 'text-studio-muted',
                    ].join(' ')}
                  >
                    {g} ({count})
                  </button>
                );
              })}
            </div>

            <ul className="max-h-64 overflow-y-auto p-4">
              {inTab.length === 0 ? (
                <li className="font-sans text-b-sm text-studio-muted">No sources in this group.</li>
              ) : (
                inTab.map((e: EvidenceRef) => (
                  <li key={e.source_id} className="border-t border-studio-rule py-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-2">
                      <TrustBadge tier={e.trust_tier} />
                      <span className="font-sans text-ui-md font-semibold text-studio-ink">
                        {e.outlet ?? e.source_type}
                      </span>
                      {e.url && (
                        <a
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-ui-sm text-studio-ink underline underline-offset-2"
                        >
                          ↗
                        </a>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-ui-md text-studio-muted">{e.snippet}</p>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

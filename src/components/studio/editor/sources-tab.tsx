'use client';

import type { SourceItem } from './types';

// Sources tab — read-only evidence behind the story: the generated cluster's
// member articles (or a Door B draft's evidence, when a draft job is linked and
// loaded server-side). The editor never mutates these; they exist to fact-check
// the copy in the Content tab.

function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export interface SourcesTabProps {
  sources: ReadonlyArray<SourceItem>;
}

export default function SourcesTab({ sources }: SourcesTabProps) {
  return (
    <div>
      <h2 className="mb-1 font-display text-d-xs text-studio-ink">Sources</h2>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        The evidence this story was clustered from. Read-only — {sources.length} article
        {sources.length === 1 ? '' : 's'}.
      </p>

      {sources.length === 0 ? (
        <p className="font-sans text-ui-md text-studio-muted">No linked evidence for this story.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-studio-rule border border-studio-rule">
          {sources.map((s) => (
            <li key={s.id} className="flex items-start gap-3 p-3">
              {s.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.thumbnail} alt="" className="h-14 w-20 shrink-0 border border-studio-rule object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-sans text-ui-lg font-semibold text-studio-ink hover:text-studio-accent"
                >
                  {s.title || '(untitled)'}
                </a>
                <div className="font-mono text-ui-sm text-studio-muted">
                  {s.source} · {host(s.url)}
                  {s.tier !== null && ` · tier ${s.tier}`}
                  {s.publishedAt && ` · ${new Date(s.publishedAt).toLocaleDateString()}`}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

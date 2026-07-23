'use client';

import { useCallback, useState } from 'react';

import { useToast } from '@/components/studio/ui';

import { appendEmbed, embedsInBody, removeEmbed } from './markdown';
import type { ClipResult } from './types';

// Embeds tab — search analytics.youtube_clips_v2 (GET /api/studio/embeds/search)
// and insert or remove a clip embed in the body markdown. Insertion appends the
// editorial !youtube[...] marker as its own block; removal strips it. All body
// changes flow up to the shell and autosave as an override.

function fmt(sec: number | null): string {
  if (sec === null) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export interface EmbedsTabProps {
  body: string;
  onBody: (body: string) => void;
}

export default function EmbedsTab({ body, onBody }: EmbedsTabProps) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<ReadonlyArray<ClipResult>>([]);
  const [loading, setLoading] = useState(false);

  const present = new Set(embedsInBody(body));

  const search = useCallback(async () => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/studio/embeds/search?q=${encodeURIComponent(term)}`);
      const j = (await r.json()) as { ok: boolean; data: ClipResult[] | null; error: { message: string } | null };
      if (!j.ok || !j.data) {
        toast.show(j.error?.message ?? 'Search failed', 'error');
        setResults([]);
        return;
      }
      setResults(j.data);
    } catch {
      toast.show('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  const insert = (clip: ClipResult) => {
    onBody(appendEmbed(body, clip.embedUrl, clip.videoTitle));
    toast.show('Clip inserted — saving');
  };

  const remove = (clip: ClipResult) => {
    onBody(removeEmbed(body, clip.embedUrl));
    toast.show('Clip removed — saving');
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-d-xs text-studio-ink">Video embeds</h2>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Search transcribed clips and drop one into the body. Embeds live in the markdown as a
        greppable marker; removing one strips it back out.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
        className="mb-5 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search clips by title, channel, or transcript…"
          className="flex-1 border border-studio-rule bg-studio-paper px-3 py-2 font-sans text-ui-md text-studio-ink outline-none focus:border-studio-ink"
        />
        <button
          type="submit"
          disabled={loading}
          className="border border-studio-ink bg-studio-ink px-4 py-2 font-sans text-ui-md font-semibold text-studio-paper disabled:opacity-60"
        >
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>

      {results.length === 0 ? (
        <p className="font-sans text-ui-md text-studio-muted">No clips yet — run a search above.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-studio-rule border border-studio-rule">
          {results.map((clip, i) => {
            const inserted = present.has(clip.embedUrl);
            return (
              <li key={`${clip.embedUrl}-${i}`} className="flex items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-ui-lg font-semibold text-studio-ink">{clip.videoTitle}</div>
                  <div className="font-mono text-ui-sm text-studio-muted">
                    {clip.channelName}
                    {clip.startSeconds !== null && ` · ${fmt(clip.startSeconds)}–${fmt(clip.endSeconds)}`}
                  </div>
                  {clip.transcriptSegment && (
                    <p className="mt-1 line-clamp-2 font-sans text-ui-md text-studio-muted">“{clip.transcriptSegment}”</p>
                  )}
                </div>
                {inserted ? (
                  <button
                    type="button"
                    onClick={() => remove(clip)}
                    className="shrink-0 border border-studio-accent px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-accent hover:bg-studio-accent hover:text-studio-paper"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => insert(clip)}
                    className="shrink-0 border border-studio-ink px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:bg-studio-ink hover:text-studio-paper"
                  >
                    Insert
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';

import { useToast } from '@/components/studio/ui';

import { extractImageUrls, replaceImageUrl } from './markdown';
import type { MediaOption } from './types';

// Media tab — every image in the story (the hero/thumbnail plus any inline body
// images). Click one to open a picker offering corpus matches (GET
// /api/studio/media/search) alongside web/wikimedia placeholders, each labelled
// with its license/source. Choosing an option swaps that image via the shell,
// which persists it as an editorial override (editedImage or inline body swap).

const FALLBACK = '/cards/fallback-1.png';

interface Target {
  kind: 'hero' | 'inline';
  url: string;
}

export interface MediaTabProps {
  image: string;
  body: string;
  generatedImage: string;
  onImage: (url: string) => void;
  onBody: (body: string) => void;
}

function Thumb({ url, onClick, label }: { url: string; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="group text-left">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url || FALLBACK}
        alt=""
        onError={(e) => {
          const t = e.currentTarget;
          if (t.dataset.fb) return;
          t.dataset.fb = '1';
          t.src = FALLBACK;
        }}
        className="h-28 w-full border border-studio-rule object-cover group-hover:border-studio-ink"
      />
      <div className="mt-1 font-mono text-ui-sm uppercase tracking-wider text-studio-muted">{label}</div>
      <div className="truncate font-mono text-ui-sm text-studio-muted">{url || '(machine default)'}</div>
    </button>
  );
}

function Picker({
  target,
  onPick,
  onClose,
}: {
  target: Target;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [options, setOptions] = useState<ReadonlyArray<MediaOption>>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async () => {
    const term = q.trim();
    if (!term) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/studio/media/search?q=${encodeURIComponent(term)}`);
      const j = (await r.json()) as { ok: boolean; data: MediaOption[] | null; error: { message: string } | null };
      if (!j.ok || !j.data) {
        toast.show(j.error?.message ?? 'Search failed', 'error');
        setOptions([]);
        return;
      }
      // Corpus results first, then web/wikimedia placeholders (license-labelled).
      const placeholders: MediaOption[] = [
        { url: `https://commons.wikimedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`, title: `Wikimedia Commons — "${term}"`, source: 'Wikimedia', license: 'CC / public domain (verify)' },
        { url: `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(term)}`, title: `Web image search — "${term}"`, source: 'Web', license: 'License unknown — clear rights' },
      ];
      setOptions([...j.data, ...placeholders]);
    } catch {
      toast.show('Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-studio-ink/40 p-8" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full max-w-3xl overflow-auto border border-studio-rule bg-studio-paper p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-d-xs text-studio-ink">
            Replace {target.kind === 'hero' ? 'thumbnail' : 'inline image'}
          </h3>
          <button type="button" onClick={onClose} className="font-mono text-ui-md text-studio-muted hover:text-studio-ink">
            Close
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="mb-4 flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the corpus (keywords)…"
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

        {options.length === 0 ? (
          <p className="font-sans text-ui-md text-studio-muted">
            Search the corpus for a replacement image, or open a source below to source one.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {options.map((opt, i) => (
              <div key={`${opt.url}-${i}`} className="border border-studio-rule p-2">
                {/^https?:\/\/\S+\.(jpg|jpeg|png|webp|gif)/i.test(opt.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.url} alt="" className="h-24 w-full object-cover" />
                ) : (
                  <div className="flex h-24 items-center justify-center bg-studio-ink/[0.04] px-2 text-center font-sans text-ui-sm text-studio-muted">
                    {opt.source} — open to browse
                  </div>
                )}
                <div className="mt-1 line-clamp-2 font-sans text-ui-sm text-studio-ink">{opt.title}</div>
                <div className="font-mono text-ui-sm text-studio-muted">{opt.license}</div>
                {/^https?:\/\/\S+\.(jpg|jpeg|png|webp|gif)/i.test(opt.url) ? (
                  <button
                    type="button"
                    onClick={() => onPick(opt.url)}
                    className="mt-1 w-full border border-studio-ink px-2 py-1 font-sans text-ui-sm font-semibold text-studio-ink hover:bg-studio-ink hover:text-studio-paper"
                  >
                    Use this
                  </button>
                ) : (
                  <a
                    href={opt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block w-full border border-studio-rule px-2 py-1 text-center font-sans text-ui-sm text-studio-muted hover:text-studio-ink"
                  >
                    Open source
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaTab({ image, body, generatedImage, onImage, onBody }: MediaTabProps) {
  const toast = useToast();
  const [target, setTarget] = useState<Target | null>(null);
  const inlineUrls = extractImageUrls(body);

  const pick = (url: string) => {
    if (!target) return;
    if (target.kind === 'hero') {
      onImage(url);
    } else {
      onBody(replaceImageUrl(body, target.url, url));
    }
    toast.show('Image swapped — saving');
    setTarget(null);
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-d-xs text-studio-ink">Images</h2>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Click any image to swap it. Replacements are saved as an editorial override — the generated
        image is preserved and can be reset from the Content tab.
      </p>

      <div className="grid grid-cols-4 gap-4">
        <Thumb url={image} label="Thumbnail" onClick={() => setTarget({ kind: 'hero', url: image })} />
        {inlineUrls.map((url, i) => (
          <Thumb key={`${url}-${i}`} url={url} label={`Inline ${i + 1}`} onClick={() => setTarget({ kind: 'inline', url })} />
        ))}
      </div>

      {image !== generatedImage && (
        <button
          type="button"
          onClick={() => onImage(generatedImage)}
          className="mt-4 border border-studio-rule px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:border-studio-ink"
        >
          Reset thumbnail to generated
        </button>
      )}

      {target && <Picker target={target} onPick={pick} onClose={() => setTarget(null)} />}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/studio/ui';

import { extractImageUrls, replaceImageUrl, splitBlocks } from './markdown';

// Media tab — an image MANAGER, not a thumbnail viewer. It lists every image in
// the story: the HERO (what the card uses) plus every inline `![alt](url)` in
// the body markdown, each swappable/removable on its own.
//
// Clicking one opens a picker with three labelled groups of real options:
//   • this story's cluster — GET /api/studio/media/cluster?storyId=…
//   • our corpus          — GET /api/studio/media/search?q=…  (origin 'corpus')
//   • the web             — the same search route (origin 'web'; SearXNG or
//                           Wikimedia Commons), always license-flagged.
//
// Applying a choice never mutates: the hero goes through onImage (persisted as
// an editorial override by the shell's autosave → /api/studio/edit), an inline
// image is a new body string from replaceImageUrl and goes through onBody. Both
// are reversible — the generated original is untouched and resettable.

const FALLBACK = '/cards/fallback-1.png';

type Origin = 'corpus' | 'web' | 'cluster' | 'generated';

interface Candidate {
  url: string;
  title: string;
  source: string;
  license: string;
  origin: Origin;
  needsLicenseReview: boolean;
}

interface Envelope {
  ok: boolean;
  data: Candidate[] | null;
  error: { message: string } | null;
}

interface Target {
  kind: 'hero' | 'inline';
  url: string;
}

export interface MediaTabProps {
  storyId: string;
  image: string;
  body: string;
  generatedImage: string;
  onImage: (url: string) => void;
  onBody: (body: string) => void;
}

/** Escape a URL for use inside a RegExp literal. */
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Return a new body with the first `![alt](url)` for `url` removed. Immutable. */
function removeImageMarkdown(body: string, url: string): string {
  return body.replace(new RegExp(`!\\[[^\\]]*\\]\\(${escapeRe(url)}[^)]*\\)\\s*`), '').replace(/\n{3,}/g, '\n\n');
}

/** 1-based index of the body block holding `url`, or null if it is not found. */
function blockOf(body: string, url: string): number | null {
  const i = splitBlocks(body).findIndex((b) => b.includes(url));
  return i < 0 ? null : i + 1;
}

function Preview({ url, className }: { url: string; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CMS thumbnails, see ui/story-row-card.tsx
    <img
      src={url || FALLBACK}
      alt=""
      loading="lazy"
      onError={(e) => {
        const t = e.currentTarget;
        if (t.dataset.fb) return;
        t.dataset.fb = '1';
        t.src = FALLBACK;
      }}
      className={className}
    />
  );
}

function OptionTile({ opt, onPick }: { opt: Candidate; onPick: (url: string) => void }) {
  return (
    <div className="border border-studio-rule p-2">
      <Preview url={opt.url} className="h-24 w-full border border-studio-rule object-cover" />
      <div className="mt-1 line-clamp-2 font-sans text-ui-sm text-studio-ink">{opt.title}</div>
      <div className="truncate font-mono text-ui-sm uppercase tracking-wider text-studio-muted">{opt.source}</div>
      <div className="mt-0.5 line-clamp-2 font-mono text-ui-sm text-studio-muted">{opt.license}</div>
      {opt.needsLicenseReview && (
        <div className="mt-1 border border-studio-rule px-1 py-0.5 font-mono text-ui-sm uppercase tracking-wider text-studio-accent">
          License review required
        </div>
      )}
      <button
        type="button"
        onClick={() => onPick(opt.url)}
        className="mt-1 w-full border border-studio-ink px-2 py-1 font-sans text-ui-sm font-semibold text-studio-ink hover:bg-studio-ink hover:text-studio-paper"
      >
        Use this
      </button>
    </div>
  );
}

function Group({
  label,
  note,
  options,
  onPick,
  empty,
}: {
  label: string;
  note: string;
  options: ReadonlyArray<Candidate>;
  onPick: (url: string) => void;
  empty: string;
}) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-baseline justify-between border-b border-studio-rule pb-1">
        <h4 className="font-mono text-ui-sm uppercase tracking-wider text-studio-ink">{label}</h4>
        <span className="font-mono text-ui-sm text-studio-muted">{note}</span>
      </div>
      {options.length === 0 ? (
        <p className="font-sans text-ui-sm text-studio-muted">{empty}</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {options.map((opt, i) => (
            <OptionTile key={`${opt.url}-${i}`} opt={opt} onPick={onPick} />
          ))}
        </div>
      )}
    </section>
  );
}

function Picker({
  storyId,
  target,
  onPick,
  onClose,
}: {
  storyId: string;
  target: Target;
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [cluster, setCluster] = useState<ReadonlyArray<Candidate>>([]);
  const [searched, setSearched] = useState<ReadonlyArray<Candidate>>([]);
  const [loading, setLoading] = useState(false);
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Cluster options are the editorially safest, so they load without a query.
  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const r = await fetch(`/api/studio/media/cluster?storyId=${encodeURIComponent(storyId)}`);
        const j = (await r.json()) as Envelope;
        if (live && j.ok && j.data) setCluster(j.data);
      } catch {
        if (live) toast.show('Could not load cluster images', 'error');
      }
    })();
    return () => {
      live = false;
    };
  }, [storyId, toast]);

  const search = useCallback(async () => {
    const term = q.trim();
    if (term.length < 2) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/studio/media/search?q=${encodeURIComponent(term)}`);
      const j = (await r.json()) as Envelope;
      if (!j.ok || !j.data) {
        toast.show(j.error?.message ?? 'Search failed', 'error');
        setSearched([]);
      } else {
        setSearched(j.data);
      }
    } catch {
      toast.show('Search failed', 'error');
    } finally {
      setSearchedOnce(true);
      setLoading(false);
    }
  }, [q, toast]);

  const corpus = searched.filter((o) => o.origin === 'corpus');
  const web = searched.filter((o) => o.origin === 'web');
  const searchHint = searchedOnce ? 'No matches for that term.' : 'Search above to load options.';

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-studio-ink/40 p-8" onClick={onClose}>
      <div
        className="max-h-[84vh] w-full max-w-5xl overflow-auto border border-studio-rule bg-studio-paper p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between border-b border-studio-rule pb-2">
          <h3 className="font-display text-d-xs text-studio-ink">
            Replace {target.kind === 'hero' ? 'the hero image' : 'an inline image'}
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
            placeholder="Search our corpus and the web (keywords)…"
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

        <Group
          label="From this story's cluster"
          note={`${cluster.length} clean image${cluster.length === 1 ? '' : 's'} · flagged images excluded`}
          options={cluster}
          onPick={onPick}
          empty="No clean member-article images for this story."
        />
        <Group
          label="From our corpus"
          note={`${corpus.length} match${corpus.length === 1 ? '' : 'es'}`}
          options={corpus}
          onPick={onPick}
          empty={searchHint}
        />
        <Group
          label="From the web"
          note="license review required before publishing"
          options={web}
          onPick={onPick}
          empty={searchHint}
        />
      </div>
    </div>
  );
}

function ImageRow({
  label,
  detail,
  url,
  onReplace,
  onRemove,
}: {
  label: string;
  detail: string;
  url: string;
  onReplace: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-studio-rule py-3">
      <Preview url={url} className="h-20 w-32 shrink-0 border border-studio-rule object-cover" />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-ui-sm uppercase tracking-wider text-studio-ink">{label}</div>
        <div className="font-mono text-ui-sm text-studio-muted">{detail}</div>
        <div className="mt-1 truncate font-mono text-ui-sm text-studio-muted">{url || '(machine default)'}</div>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={onReplace}
          className="border border-studio-ink px-3 py-1.5 font-sans text-ui-sm font-semibold text-studio-ink hover:bg-studio-ink hover:text-studio-paper"
        >
          Replace…
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="border border-studio-rule px-3 py-1.5 font-sans text-ui-sm text-studio-muted hover:border-studio-ink hover:text-studio-ink"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export default function MediaTab({ storyId, image, body, generatedImage, onImage, onBody }: MediaTabProps) {
  const toast = useToast();
  const [target, setTarget] = useState<Target | null>(null);
  const inlineUrls = extractImageUrls(body);
  const blockCount = splitBlocks(body).length;

  const pick = (url: string) => {
    if (!target) return;
    if (target.kind === 'hero') {
      onImage(url);
    } else {
      onBody(replaceImageUrl(body, target.url, url));
    }
    toast.show('Image swapped — saving as an editorial override');
    setTarget(null);
  };

  const removeInline = (url: string) => {
    onBody(removeImageMarkdown(body, url));
    toast.show('Inline image removed — saving');
  };

  return (
    <div>
      <h2 className="mb-1 font-display text-d-xs text-studio-ink">Images</h2>
      <p className="mb-4 font-sans text-ui-md text-studio-muted">
        Every image in this story — the hero the card uses, plus each image embedded in the body.
        Replace or remove them independently. Every change is saved as an editorial override; the
        generated original is preserved and can be restored below or from the History tab.
      </p>

      <ImageRow
        label="Hero · thumbnail"
        detail={image === generatedImage || !generatedImage ? 'As generated' : 'Editorial override'}
        url={image}
        onReplace={() => setTarget({ kind: 'hero', url: image })}
      />

      {inlineUrls.length === 0 ? (
        <p className="border-b border-studio-rule py-3 font-sans text-ui-md text-studio-muted">
          No inline images in the body.
        </p>
      ) : (
        inlineUrls.map((url, i) => (
          <ImageRow
            key={`${url}-${i}`}
            label={`Inline ${i + 1} of ${inlineUrls.length}`}
            detail={`Body block ${blockOf(body, url) ?? '?'} of ${blockCount}`}
            url={url}
            onReplace={() => setTarget({ kind: 'inline', url })}
            onRemove={() => removeInline(url)}
          />
        ))
      )}

      {generatedImage && image !== generatedImage && (
        <button
          type="button"
          onClick={() => onImage(generatedImage)}
          className="mt-4 border border-studio-rule px-3 py-1.5 font-sans text-ui-md font-semibold text-studio-ink hover:border-studio-ink"
        >
          Reset hero to generated
        </button>
      )}

      {target && <Picker storyId={storyId} target={target} onPick={pick} onClose={() => setTarget(null)} />}
    </div>
  );
}

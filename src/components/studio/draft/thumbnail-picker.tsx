'use client';

// 6-up thumbnail grid. Each option shows an origin chip + license label. A web
// origin (unknown license, needs_license_review) can only be chosen after an
// explicit acknowledgment checkbox. Selection is UI-local (store.chooseImage) —
// there is no image-select proxy route on this surface.

import { useState } from 'react';

import { useReviewStore } from './store';

import type { ImageCandidate } from '@/lib/dispatch/types';

type ImageOrigin = ImageCandidate['origin'];

const ORIGIN_LABEL: Record<ImageOrigin, string> = {
  corpus: 'Corpus',
  wikimedia: 'Wikimedia',
  web: 'Web',
};

function ThumbOption({ image }: { image: ImageCandidate }) {
  const chosenImageId = useReviewStore((s) => s.selection.chosenImageId);
  const chooseImage = useReviewStore((s) => s.chooseImage);
  const [ack, setAck] = useState(false);

  const selected = chosenImageId === image.id;
  const needsAck = image.origin === 'web' || image.needs_license_review;
  const canSelect = !needsAck || ack;

  return (
    <div
      className={[
        'flex flex-col border p-2',
        selected ? 'border-studio-ink' : 'border-studio-rule',
      ].join(' ')}
    >
      <button
        type="button"
        disabled={!canSelect}
        onClick={() => chooseImage(image.id)}
        aria-pressed={selected}
        className="flex aspect-video items-center justify-center border border-studio-rule bg-studio-paper font-mono text-ui-sm text-studio-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        {selected ? 'SELECTED' : `slot ${image.slot}`}
      </button>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="border border-studio-rule px-1.5 font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
          {ORIGIN_LABEL[image.origin]}
        </span>
        <span
          className={[
            'font-mono text-ui-sm',
            image.needs_license_review ? 'text-studio-accent' : 'text-studio-muted',
          ].join(' ')}
        >
          {image.license ?? 'no license'}
        </span>
      </div>

      {needsAck && (
        <label className="mt-2 flex items-start gap-2 font-sans text-ui-sm text-studio-accent">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5"
          />
          <span>I have reviewed the license for this web image.</span>
        </label>
      )}
    </div>
  );
}

export default function ThumbnailPicker() {
  const images = useReviewStore((s) => s.images);

  return (
    <section aria-label="Thumbnail" className="border border-studio-rule bg-studio-paper p-4">
      <h2 className="font-mono text-ui-sm uppercase tracking-wider text-studio-muted">
        Thumbnail — pick one
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img) => (
          <ThumbOption key={img.id} image={img} />
        ))}
      </div>
    </section>
  );
}

// Resilient story image loading. A story's cluster usually has SEVERAL usable photos, but publishers
// hotlink-protect their CDNs (403) or let URLs die — so the single image we pick often fails to load
// in the browser even though the DB verdict was "clean". Instead of jumping straight to the branded
// fallback on the first failure, walk the story's OTHER real photos (data-alts) first; only when every
// real candidate has failed do we show the DNL fallback. This is why so many cards fell back despite
// the cluster having good photos — see reference_dnl_image_cleanliness.
import { useEffect } from 'react';
import type { ImgHTMLAttributes, SyntheticEvent } from 'react';
import { pickFallback } from './fallback';

/** Advance a broken <img> to its next real candidate, or to the branded fallback once all fail. */
export function advanceStoryImg(img: HTMLImageElement): void {
  const alts = (img.getAttribute('data-alts') || '').split('|').filter(Boolean);
  const idx = Number(img.getAttribute('data-alt-idx') || '0');
  if (idx < alts.length) {
    img.setAttribute('data-alt-idx', String(idx + 1)); // try the next real member photo (hotlink-403 / dead)
    img.src = alts[idx];
    return;
  }
  if (img.dataset.fallback) return; // every real candidate failed → branded fallback, once
  img.dataset.fallback = '1';
  img.src = pickFallback(img.getAttribute('data-seed') || img.getAttribute('src'));
}

export function onStoryImgError(e: SyntheticEvent<HTMLImageElement>): void {
  advanceStoryImg(e.currentTarget);
}

/** Spread onto an <img>: primary src + the ordered backup photos the onError handler walks. */
export function storyImg(card: { image: string; imageAlts?: string[]; slug?: string }): ImgHTMLAttributes<HTMLImageElement> {
  return {
    src: card.image,
    onError: onStoryImgError,
    ['data-alts']: (card.imageAlts ?? []).join('|'),
    ['data-seed']: card.slug ?? card.image,
  } as ImgHTMLAttributes<HTMLImageElement>;
}

/** Call once in the top-level client page. Repairs images that FAILED to load before React hydrated —
 *  their native `error` event fired with no handler attached, so `onError` never ran. We sweep for
 *  already-broken candidate images on mount (and once more shortly after) and walk them like a live error. */
export function useImageFallbackRepair(): void {
  useEffect(() => {
    const sweep = () => {
      document.querySelectorAll<HTMLImageElement>('img[data-alts]').forEach((img) => {
        if (img.complete && img.naturalWidth === 0 && !img.dataset.fallback) advanceStoryImg(img);
      });
    };
    sweep();
    const t = setTimeout(sweep, 1500); // catch any that resolve/fail slightly later
    return () => clearTimeout(t);
  }, []);
}

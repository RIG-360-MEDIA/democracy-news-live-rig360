// Front-page curation overlays — shared shapes (epic 002, /curate editor view).
// These are editor-only view models; they never reach into reader-mode folders.

/** A front-page unit as the curation overlays see it (flattened from FrontPage.topStories). */
export interface CurateItem {
  id: string; // real story_id — overrides key on this
  title: string; // effective headline (edited overrides generated)
  image: string | null; // representative thumbnail
  topic: string;
}

/** Per-card / per-field save lifecycle for the optimistic overlays. */
export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/** Result of a single override/edit mutation. */
export interface ActionResult {
  ok: boolean;
  error: string | null;
}

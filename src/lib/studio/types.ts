// Editorial CMS — shared types for the /studio portal (epic 002).

export type OverrideAction = 'live' | 'killed' | 'pinned' | 'held';

/** The single true state an editor sees per story — what readers actually get right now.
 *  top = pinned #1 · live = on the site · held = machine held it, needs the editor's OK · hidden. */
export type DeskState = 'top' | 'live' | 'held' | 'hidden';

export interface EditorialOverride {
  storyId: string;
  action: OverrideAction;
  pinnedRank: number | null;
  importanceDelta: number;
  sectionOverride: string | null;
  humanLocked: boolean;
  editedHeadline: string | null;
  editedDek: string | null;
  editedBody: string | null;
  editedTags: string[] | null;
  editedImage: string | null; // editor-replaced thumbnail/hero image URL (null = use the machine's)
  editorId: string;
  reason: string | null;
  updatedAt: string;
}

/** A story as the editor sees it on the Desk: generated content + any override applied. */
export interface DeskStory {
  storyId: string;
  headline: string; // effective (edited overrides generated)
  dek: string | null;
  topic: string;
  country: string;
  image: string | null; // representative thumbnail (so the Desk reads like the site)
  wordCount: number;
  status: string; // PUBLISHABLE / HELD... from the generator
  importance: number; // base importance_score
  effectiveImportance: number; // + override delta
  updatedAt: string;
  // the true reader-facing state (what the editor should read at a glance)
  state: DeskState;
  // editorial state (null if never touched)
  action: OverrideAction;
  pinnedRank: number | null;
  humanLocked: boolean;
  edited: boolean; // any edited_* field present
  reason: string | null;
}

export interface AuditEntry {
  id: number;
  storyId: string | null;
  editorId: string;
  action: string;
  at: string;
}

export interface ManualStory {
  id: string;
  headline: string;
  dek: string | null;
  body: string;
  topic: string;
  country: string | null;
  imageUrl: string | null;
  status: string;
  importance: number;
  editorId: string;
  createdAt: string;
}

export interface RankingWeights {
  topicWeights: Record<string, number>;
  countryWeights: Record<string, number>;
  recencyHalflifeH: number;
  sourceWeight: number;
  velocityWeight: number;
  updatedBy: string;
  updatedAt: string;
}

/** API envelope (per .claude/rules/api-conventions.md). */
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
}

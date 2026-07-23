// Shared types for the RigWire Studio story editor (Content · Media · Embeds ·
// Sources · History). These are the props passed down from the server page into
// the client shell; no reader-mode folder is imported here.

import type { EditorialOverride } from '@/lib/studio/types';

/** The four editable fields the editor overrides. Each save returns a new object. */
export interface EditableStory {
  headline: string;
  dek: string;
  body: string;
  image: string;
}

/** One evidence article behind a Door B / clustered story (read-only). */
export interface SourceItem {
  id: string;
  title: string;
  url: string;
  source: string;
  tier: number | null;
  publishedAt: string | null;
  thumbnail: string | null;
}

/** A candidate image offered by the media picker. */
export interface MediaOption {
  url: string;
  title: string;
  source: string;
  license: string;
}

/** A YouTube clip returned by the embeds search (analytics.youtube_clips_v2). */
export interface ClipResult {
  videoTitle: string;
  channelName: string;
  embedUrl: string;
  startSeconds: number | null;
  endSeconds: number | null;
  transcriptSegment: string | null;
}

/** One editorial-audit row for this story, with the override snapshots for revert. */
export interface HistoryEntry {
  id: number;
  action: string;
  editorId: string;
  at: string;
  before: EditorialOverride | null;
  after: EditorialOverride | null;
}

/* ── Mode keys ─────────────────────────────────────── */

export type ModeKey =
  | 'minute'
  | 'digest'
  | 'all-sides'
  | 'long-read'
  | 'long-view'
  | 'queue';

export const MODE_LABELS: Record<ModeKey, string> = {
  'minute':    'The Minute',
  'digest':    'The Digest',
  'all-sides': 'All Sides',
  'long-read': 'The Long Read',
  'long-view': 'The Long View',
  'queue':     'The Queue',
};

export const MODE_ACCENT: Record<ModeKey, string> = {
  'minute':    '#e0604a',
  'digest':    '#4a9e62',
  'all-sides': '#9a9590',
  'long-read': '#5a8ab8',
  'long-view': '#c49040',
  'queue':     '#e0604a',
};

/* ── Topic ─────────────────────────────────────────── */

export interface Topic {
  slug:  string;
  name:  string;
  region?: 'global' | 'india' | 'us' | 'uk' | 'asia';
}

/* ── Story ─────────────────────────────────────────── */

export interface Source {
  name:  string;
  url?:  string;
  lang?: string;
  lean?: 'left' | 'center' | 'right';
}

export interface Story {
  id:            string;
  slug:          string;
  title:         string;
  preview:       string;
  hero_image?:   string;
  topics:        string[];
  sources:       Source[];
  source_count:  number;
  published_at:  string;
  last_updated:  string;
  day_of_story:  number;
  formats:       Partial<StoryFormats>;
}

export interface StoryFormats {
  minute: {
    headline:      string;
    body_60_words: string;
    hero_image?:   string;
  };
  digest: {
    headline:      string;
    summary:       string;
    bullets:       string[];
  };
  'all-sides': {
    left_says:     string;
    center_says:   string;
    right_says:    string;
    omitted_by_left?:  string;
    omitted_by_right?: string;
    agreed_facts?: string[];
    bias_split:    { left: number; center: number; right: number };
    per_source?:   Source[];
  };
  'long-read': {
    headline:       string;
    subhead?:       string;
    body_markdown:  string;
    reading_time_min: number;
    pull_quotes?:   { text: string; speaker?: string }[];
  };
  'long-view': {
    headline:        string;
    original_date:   string;
    settled_summary: string;
    what_we_got_wrong?: string;
    what_held_up?:   string;
    body_markdown:   string;
    reading_time_min: number;
  };
}

/* ── User ──────────────────────────────────────────── */

export interface User {
  id:             string;
  name:           string;
  email:          string;
  phone?:         string;
  topics:         string[];
  default_mode:   ModeKey;
  digest_channel: ('email' | 'whatsapp')[];
  created_at:     string;
}

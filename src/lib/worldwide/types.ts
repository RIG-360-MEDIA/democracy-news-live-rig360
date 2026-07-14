// src/lib/worldwide/types.ts
//
// DTOs for the Worldwide reading layer. See specs/001-worldwide/data-model.md.
// These are the shapes the read API returns — placement-agnostic (used by
// whatever page/route consumes the front page).

/** A single ranked story card on the front page. */
export interface StoryCard {
  id: string;
  title: string; // generated headline if available, else representative title
  deck: string | null; // one-line summary (generated, else article lead summary)
  image: string | null; // best cluster thumbnail (null → view layer applies a branded fallback)
  imageAlts?: string[]; // ordered backup photos from other cluster members — the client walks these on
                        // an image load-error (publisher hotlink-403 / dead URL) before the fallback
  hasArticle: boolean; // true = a published synthesized article exists (else stub)
  topic: string;
  country: string; // ISO2, or 'XX' when unknown
  importance: number;
  independentSources: number;
  articleCount: number;
  facts: number;
  lastSeenAt: string; // ISO timestamp
  freshnessSeconds: number; // age vs last_seen_at — used for internal editorial freshness rules
  publishedSeconds?: number; // age vs when we PUBLISHED the story on our site (generation run) — used for the displayed timestamp
  isScoop: boolean; // single-article story
  dominantEntity: string | null; // top entity — the B+ hub grouping key
  pinned?: boolean; // editor pinned this as the top headline (CMS override) — exempt from auto lead rules
}

/** A B+ event-hub: a mega-event's angle-stories under one umbrella (display-only). */
export interface EventHub {
  kind: 'hub';
  hubId: string;
  title: string; // "<Entity> — full coverage"
  dominantEntity: string;
  topic: string;
  image: string | null;
  importance: number; // its strongest angle's importance
  memberCount: number;
  members: StoryCard[]; // the angle sub-stories, ranked
}

/** A topic section (Politics, Sports, …) — top stories of that topic. */
export interface TopicSection {
  topic: string;
  stories: StoryCard[];
}

/** The whole front page for a given scope. */
export interface FrontPage {
  scope: string; // 'world' | ISO2
  topStories: Array<StoryCard | EventHub>; // ranked, diversity-capped; hubs inline (B+)
  aroundTheWorld: StoryCard[]; // ≤1 per country
  sections: TopicSection[]; // non-empty topics only
  democracy: StoryCard[]; // cross-cutting Democracy theme band (elections, rights, press freedom…)
}

/** Standard API envelope — see .claude/rules/api-conventions.md. */
export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: { traceId: string; cachedAt?: string; freshnessSeconds?: number };
}

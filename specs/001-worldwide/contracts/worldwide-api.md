# API Contracts: Worldwide read endpoints

Per `.claude/rules/api-conventions.md`: REST+JSON, `ApiResponse<T>` envelope, App-Router route
handlers, kebab routes, no `v1`, no verbs, ≤1 nesting level. Read-only. DTOs in `data-model.md`.

```ts
type ApiResponse<T> = {
  ok: boolean;
  data: T | null;
  error: { code: string; message: string; details?: unknown } | null;
  meta?: { traceId: string; cachedAt?: string; freshnessSeconds?: number };
};
```

---

## GET /api/worldwide
Front page for a scope.

**Query**: `scope` = `world` (default) | ISO2 country (e.g. `IN`). Unknown/sub-floor country → 400.

**200** `ApiResponse<FrontPage>`:
```ts
type FrontPage = {
  scope: string;
  topStories: (StoryCard | EventHub)[];   // ranked; hubs inline (Phase 2)
  aroundTheWorld: StoryCard[];            // ≤1 per country
  sections: { topic: string; stories: StoryCard[] }[];  // non-empty topics only
};
```
**Errors**: 400 unknown/sub-floor scope (`details.scope`); 5xx with `traceId`.
**Caching**: `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`. `meta.freshnessSeconds`
= age of the freshest story served (Phase-0 staleness signal).

---

## GET /api/worldwide/story/[id]
One story (full read or stub).

**Path**: `id` = story_id (opaque).

**200** `ApiResponse<StoryDetail>` (see data-model). `generatedArticle:null` + sources-only when
unenriched (FR-021) — still 200, not an error.
**404**: id not found OR story suppressed (do not leak existence — `api-conventions`).
**Errors**: 5xx with `traceId`.
**Caching**: enriched `s-maxage=60, swr=300`; stub `s-maxage=30`.

---

## Notes
- Importance/ranking + diversity computed server-side (ported `sections.sql`); the client never
  ranks.
- EventHub grouping (Phase 2) is computed in this endpoint after ranking; display-only.
- Number-gate applied server-side before returning facts (never ship an ungated bare value).
- No personalization in these routes → fully CDN-cacheable (no `Vary: Cookie`).

# ADR 0004 — Static content colocates with its view

**Status:** Accepted · 2026-05-28
**Authors:** core team
**Related:** ADR 0002, ADR 0003

## Context

An early prototype centralised editorial content into a single
`src/content.ts` — story arrays for Flash, article lists for Worldwide,
audio items for Pocket, all in one place.

Within three weeks the file was 4,200 lines. Editorial changes routinely
caused merge conflicts on unrelated work. Navigating it required grep.
New contributors had no map of what content was where.

## Decision

Per-feature static content lives next to the page that renders it as
`<feature>-data.ts`:

```
src/components/minute/stories.ts             // Flash stories
src/components/digest/digest-data.ts         // Newsletter content
src/components/long-read/long-reads-data.ts  // Worldwide index
src/components/long-read/article-data.ts     // individual articles
src/components/long-read/live-news-data.ts   // Worldwide live ticker
src/components/all-sides/all-sides-data.ts   // All Sides coverage grid
src/components/long-view/long-view-data.ts   // Aftermath spreads
src/components/queue/queue-data.ts           // Pocket audio items
```

No central content store. No registry. No CMS (yet).

## Consequences

**Positive**
- Editing a Flash story opens *one* file. Editorial workflow is
  human-readable.
- Each data file stays small (< 300 lines typical). Easy to scan.
- Merge conflicts are scoped to the mode the editor touched.
- Adding a new mode means adding one `<slug>-data.ts`, not editing
  a central registry other modes also touch.

**Negative**
- A piece of content that is genuinely shared across modes (e.g., the
  six taglines on landing-page cards AND on the today-page newsstand)
  needs a home. That home is `src/lib/modes.ts` (see ADR 0002).
- We accept exactly **two** places for content: (1) the per-mode
  `<feature>-data.ts`, (2) `src/lib/modes.ts`. There is no third.

## Rejected alternatives

**Headless CMS (Sanity, Contentful, Strapi).** Rejected for now. Adds
infrastructure, deploy complexity, an extra service to keep alive, and
solves a problem we don't have (non-engineers editing content at
velocity). Revisit when content velocity exceeds ~5 changes per week
per mode.

**Single `src/content.ts`.** Rejected — the thing we left behind.

## Trigger to revisit

Revisit when an editor (not an engineer) needs to publish a story
without opening the codebase. At that point a headless CMS is
appropriate, and this ADR is superseded by a future ADR introducing
the content-management layer.

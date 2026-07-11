# Architecture — Rig Wire on one page

Rig Wire is a Next.js App Router prototype today. There is no backend,
no database, no live API. All content is static, all state is
client-side React. This document describes (a) the system as it stands,
and (b) the seams where production infrastructure will attach.

---

## The six-mode topology

```
                      ┌────────────────────┐
                      │  src/lib/modes.ts  │   ← single source of truth
                      └─────────┬──────────┘
                                │  imported by every consumer
                                ▼
   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
   │   Flash    │  │ Newsletter │  │ All Sides  │  │ Worldwide  │
   │  /minute   │  │  /digest   │  │ /all-sides │  │ /long-read │
   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
         │               │               │               │
   ┌─────┴──────┐ ┌──────┴─────┐ ┌──────┴─────┐ ┌───────┴────────┐
   │ stories.ts │ │ digest-    │ │ all-sides- │ │ long-reads-    │
   │            │ │ data.ts    │ │ data.ts    │ │ data.ts +      │
   │            │ │            │ │            │ │ article-data + │
   │            │ │            │ │            │ │ live-news-data │
   └────────────┘ └────────────┘ └────────────┘ └────────────────┘

   ┌────────────┐  ┌────────────┐
   │ Aftermath  │  │   Pocket   │
   │ /long-view │  │  /queue    │
   └─────┬──────┘  └─────┬──────┘
         │               │
   ┌─────┴──────┐  ┌─────┴──────┐
   │ long-view- │  │ queue-     │
   │ data.ts    │  │ data.ts    │
   └────────────┘  └────────────┘
```

Each mode is a sealed module (ADR 0003). The only edge between modes is
the shared metadata in `modes.ts` (ADR 0002).

## Two cross-cutting routes

- **`/`** — the landing page. Imports `modes.ts` to render six section
  cards. Pulls illustrations from `public/cards/`. Owns no content.
- **`/today`** — the newsstand. Renders six PNG covers from
  `public/newsstand/`. Names imported from `modes.ts`.

## State — where it lives today

| State                              | Where                                                   |
| ---------------------------------- | ------------------------------------------------------- |
| Mode metadata                      | `src/lib/modes.ts` (static, build-time)                 |
| Per-mode content                   | `src/components/<mode>/<mode>-data.ts` (static)         |
| Active story index in Flash        | React `useState` in `minute-page.tsx`                   |
| Onboarding selections              | React `useState` — lost on refresh                      |
| Audio playback in Pocket           | React `useState` — lost on refresh                      |
| Auth session                       | Does not exist — auth shell is a visual scene only      |
| Reading history                    | Does not exist                                          |

## Data flow — render path

```
  build time                          request time
  ──────────                          ────────────

  modes.ts                              browser → /<mode>
  <feature>-data.ts                       ↓
       ↓                                Next.js routes via app/<mode>/page.tsx
  TypeScript compile                      ↓
       ↓                                page.tsx renders <ModePage/>
  Next.js static render                   ↓
       ↓                                ModePage reads its data file +
  HTML + CSS + JS bundle                modes.ts entry
                                          ↓
                                        hydrated React on client
                                          ↓
                                        user interaction → useState
```

No network call after page load. No external service. The entire app
fits in a static CDN.

---

## Seams — where the backend will attach

When we leave prototype phase, infrastructure attaches at exactly three
points.

### Seam 1 — `src/api/` (HTTP surface)

Currently empty. The first route will be one of:

- `GET /api/articles` — Worldwide / All Sides ingest.
- `POST /api/queue` — Pocket queue persistence.
- `POST /api/auth/session` — login.

Contract: see `.claude/rules/api-conventions.md`.

### Seam 2 — `src/persistence/` (storage)

Currently empty. First entities:

- `users` — managed by Supabase auth, never duplicated.
- `queue_items` — Pocket.
- `preferences` — onboarding output.
- `read_state` — which Flash stories the user has seen.

Contract: repository pattern, forward-only migrations, row-level
security on user-scoped tables. See `src/persistence/CLAUDE.md`.

### Seam 3 — `src/lib/` (logic that needs to be testable in isolation)

Today: `modes.ts`, `utils.ts`, `animations.ts`. When ranking,
clustering, or summarisation lands, the *pure* logic (scoring
functions, deduplication, summary-faithfulness scorers) goes here. The
*service* (database calls, network requests) goes in `src/api/` or
`src/persistence/`. This split keeps logic golden-testable without a
running infrastructure.

---

## What will change vs what will not

| Layer                | Today           | After backend lands |
| -------------------- | --------------- | ------------------- |
| Routes               | static          | static + dynamic    |
| Mode metadata        | `modes.ts`      | `modes.ts` — unchanged |
| Mode folders         | sealed          | sealed — unchanged  |
| Static content       | `*-data.ts`     | partial — Flash and Newsletter may stay static; Worldwide moves to API |
| State                | useState        | useState + server   |
| Auth                 | visual only     | session cookies     |
| Personalisation      | none            | ranking layer in `src/lib/`, served via `src/api/` |
| Observability        | none            | per-request `traceId`, p99 latency dashboards |

---

## Forward-looking — the news-AI surface

When personalisation, ranking, summarisation, or clustering land, they
attach in `src/lib/` (pure logic) and `src/api/` (HTTP). Three rules,
non-negotiable:

1. **Every model version is pinned and logged.** Silent swaps are how
   product behaviour changes without a deploy entry. That is unshippable
   in journalism.

2. **Every personalisation decision is auditable.** Log who saw what,
   why, under which model version, with which features, at which score.
   Without this you cannot defend the system against any *"your algorithm
   did X to me"* claim. True or false, you need the receipts.

3. **AI-generated text shown to users passes a faithfulness check
   against its source before display.** If the check fails, hide the
   output. Do not show "best guess". This is how summarisers hallucinate
   deaths.

Full doctrine: `.claude/skills/aryan-mehta/SKILL.md`. The expanded
editorial-integrity contract will land in `docs/journalism-principles.md`
the day the first AI surface ships.

---

## Performance posture

Static prototype targets:

- **LCP** < 1.5s on a 4G connection.
- **CLS** < 0.05 on every mode page.
- **JS bundle** < 200 kB gzipped per route.

When the API surface lands, add:

- **API p99** < 200ms for read paths.
- **API p99** < 500ms for personalised paths.
- **TTI** < 2.5s on a 4G connection.

A news site that misses these isn't slow — it's broken. Readers tab away
during the loading spinner.

## Accessibility posture

- All interactive elements reachable by keyboard.
- All images have `alt` text. Decorative images use `alt=""`.
- Focus rings visible on every focusable element.
- No color used as the sole carrier of meaning (bias bars carry labels,
  not just hue).
- Animation respects `prefers-reduced-motion`.

These are minimums, not the ceiling.

---

## What this document is NOT

- It is not the API reference. That's `.claude/rules/api-conventions.md`
  and (eventually) generated OpenAPI under `docs/api/`.
- It is not the design system. That's `src/lib/modes.ts` for tokens,
  `src/app/globals.css` for base, and the typography section of
  `docs/glossary.md`.
- It is not a roadmap. That's its own file, when we write one.
- It is not exhaustive. It is the *one page* a new contributor reads
  before opening any file. Everything else is a footnote to this.

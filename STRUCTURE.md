# Rig Wire — Repository Map

A one-page guide to *where everything lives*. Folder names use the original mode codenames; the product-facing names are mapped below.

---

## Name translation (folder ↔ product mode)

| Folder slug      | URL path        | Product name | Duration |
| ---------------- | --------------- | ------------ | -------- |
| `minute`         | `/minute`       | **Flash**     | 60 sec   |
| `digest`         | `/digest`       | **Newsletter** | 5 min  |
| `all-sides`      | `/all-sides`    | All Sides     | 8 min    |
| `long-read`      | `/long-read`    | **Worldwide** | 14 min  |
| `long-view`      | `/long-view`    | **Aftermath** | 12 min  |
| `queue`          | `/queue`        | **Pocket**    | ∞        |

> Folder slugs are kept stable because changing them would break every existing import and route URL. The product names live in `src/lib/modes.ts` and are the single source of truth for what users see.

---

## Top-level layout

```
rig-news/
├─ src/                         Application source
│  ├─ app/                      Next.js App Router — one folder per route
│  ├─ components/               Feature-grouped React components
│  ├─ lib/                      Shared helpers, design tokens, mode config
│  └─ types/                    Cross-feature TS interfaces
├─ public/                      Static assets served as-is
│  ├─ newsstand/                Six PNG covers for the Today page shelf
│  │  └─ _archive/              Original Gemini-named source files (off bundle path)
│  └─ cards/                    Mode-section landing illustrations
├─ STRUCTURE.md                 This file — where is what
└─ CONTEXT.md                   Product / design context notes
```

---

## `src/app/` — Routes (Next.js convention)

Every folder maps to a URL. Every `page.tsx` is the route entry point and imports its real component from `src/components/<feature>/`.

| Path                          | Renders                                          |
| ----------------------------- | ------------------------------------------------ |
| `app/page.tsx`                | Landing page (`/`)                               |
| `app/today/page.tsx`          | Today's newsstand (`/today`)                     |
| `app/minute/page.tsx`         | Flash — vertical-feed reader (`/minute`)         |
| `app/digest/page.tsx`         | Newsletter onboarding (`/digest`)                |
| `app/all-sides/page.tsx`      | All Sides aggregation grid (`/all-sides`)        |
| `app/long-read/page.tsx`      | Worldwide section homepage (`/long-read`)        |
| `app/long-read/[slug]/page.tsx` | Single Worldwide article view                  |
| `app/long-view/page.tsx`      | Aftermath flippable magazine (`/long-view`)      |
| `app/queue/page.tsx`          | Pocket audio queue (`/queue`)                    |
| `app/signup`, `signin`        | Auth screens — share `AuthShell`                 |
| `app/onboarding/page.tsx`     | First-run preference flow                        |
| `app/layout.tsx`              | Root HTML shell, font wiring                     |
| `app/globals.css`             | Tailwind base + variable-font @font-face         |

---

## `src/components/` — Feature folders

Each mode has its own folder containing **all** its components and data. No cross-mode imports.

```
components/
├─ brand/         wordmark.tsx, nav.tsx          — Rig Wire identity primitives
├─ landing/       hero.tsx, value-props.tsx, …   — Marketing landing sections
├─ today/         today-page.tsx                 — Newsstand
├─ minute/        minute-page.tsx, minute-card.tsx, thumbnail-rail.tsx,
│                 celebration-screen.tsx, stories.ts          — Flash
├─ digest/        digest-page.tsx, gmail-preview.tsx, digest-data.ts     — Newsletter
├─ all-sides/     all-sides-page.tsx, all-sides-data.ts                  — All Sides
├─ long-read/     long-read-page.tsx, article-view.tsx,
│                 article-data.ts, long-reads-data.ts, live-news-data.ts — Worldwide
├─ long-view/     long-view-page.tsx, long-view-data.ts                  — Aftermath
├─ queue/         queue-page.tsx, queue-data.ts                          — Pocket
├─ auth/          auth-shell.tsx                                         — Sign in / up
└─ onboarding/    onboarding-flow.tsx                                    — First-run
```

**Naming convention:** `<feature>-page.tsx` is the orchestrator. `*-data.ts` files hold static content (story arrays, copy, archetypes). Sub-components named by role (`minute-card.tsx`, `thumbnail-rail.tsx`).

---

## `src/lib/`

| File             | Role                                                          |
| ---------------- | ------------------------------------------------------------- |
| `modes.ts`       | **Source of truth** for the six modes (name, tagline, blurb, color, href, image) |
| `utils.ts`       | `cn()` class merger + general helpers                         |
| `animations.ts`  | Shared Framer Motion spring presets                           |

---

## Where do I find …?

- **Change the name "Flash" everywhere** → `src/lib/modes.ts` (display name), then grep for hard-coded `"Flash"` and `"The Minute"` (legacy)
- **Edit a story shown in Flash** → `src/components/minute/stories.ts`
- **Edit the Today newsstand shelf** → `src/components/today/today-page.tsx`
- **Add a queue audio item** → `src/components/queue/queue-data.ts`
- **Change a mode-card on the landing page** → `src/components/landing/section-<mode>.tsx`
- **Update the design tokens / colors / accents** → `src/lib/modes.ts` for mode tokens, `src/app/globals.css` for base
- **Replace a newsstand cover image** → `public/newsstand/<slug>.png` (one of: minute, digest, all-sides, long-read, long-view, queue)

---

## Recent housekeeping

- `public/newsstand/_archive/` now holds the original Gemini-named source PNGs (5 files). The canonical 6 covers (`minute.png`, `digest.png`, `all-sides.png`, `long-read.png`, `long-view.png`, `queue.png`) sit at the folder root and are the only assets shipped to the bundle.

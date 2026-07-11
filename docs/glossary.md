# Glossary

Terms used in Rig Wire, in four groups: **products**, **architecture**,
**design**, **editorial** (forward-looking).

---

## Products — the six modes

| Folder slug    | Display name    | Replaced       | Duration | One-line |
| -------------- | --------------- | -------------- | -------- | -------- |
| `minute`       | **Flash**       | The Minute     | 60 sec   | Vertical-feed reader. Reels-style, swipe-up. |
| `digest`       | **Newsletter**  | The Digest     | 5 min    | Five stories at 7:30 a.m. in your inbox. |
| `all-sides`    | **All Sides**   | (unchanged)    | 8 min    | The same story from sources across the spectrum. |
| `long-read`    | **Worldwide**   | The Long Read  | 14 min   | Every continent's headline today. BBC-style global coverage. |
| `long-view`    | **Aftermath**   | The Long View  | 12 min   | Retrospectives. Where the story went 90 days later. |
| `queue`        | **Pocket**      | The Queue      | ∞        | Audio queue. Press play, it takes over. |

Source of truth: `src/lib/modes.ts`.

## Architecture

- **Mode folder** — `src/components/<slug>/`. Sealed. No cross-mode imports.
- **`<feature>-data.ts`** — static content colocated with the feature
  that renders it. See ADR 0004.
- **`modes.ts`** — single source of truth for mode metadata. See ADR 0002.
- **Newsstand** — the today-page (`/today`). The shelf with six PNG covers.
- **Vitrine** — the dark museum-display back-panel behind the newsstand
  shelf.
- **Masthead** — the title bar of any mode page (Atlantic-style for
  Flash, magazine cover for Aftermath).
- **AuthShell** — the shared visual scene used by sign-in and sign-up
  pages.
- **Brand primitives** — components shared across modes, living in
  `src/components/brand/`. The promotion trigger is 3+ duplicate copies
  in mode folders.
- **Sealed module** — see ADR 0003. A folder whose internals are not
  imported from outside.

## Design — typography

- **Fraunces** — editorial italic display. Headlines, mastheads. Variable
  axes used: `opsz` (optical size), `SOFT` (softness of corners),
  `WONK` (whimsy).
- **Bricolage Grotesque** — UI display, oversize labels.
- **Plus Jakarta Sans** — body text, UI text, default.
- **JetBrains Mono** — timestamps, codes, micro-labels.

## Design — Rig Wire-specific motifs

- **Ink trap** — the angular notch cut into corners of letterforms
  (a metal-type tradition for cheap newsprint, now decorative). Used in
  the wordmark.
- **Mycelial composition** — the dynamic, non-grid layout pattern used
  on the landing page. Borrowed from a design direction note.
- **Hairline rule** — the 1px thin horizontal line flanking section
  labels. Atlantic-derived.
- **Spotlight wash** — the radial light gradient used to centre attention
  on a single card or cover.

## Editorial (forward-looking — when AI joins the pipeline)

- **Faithfulness** — does the summary contradict the source? If yes,
  it does not ship. A hard gate, not a metric. See
  `.claude/skills/aryan-mehta/SKILL.md`.
- **Blindspot** — Ground News-derived: a story being covered exclusively
  by sources on one end of the political spectrum.
- **Story gravity** — CNN-derived: the internal mechanism that detects
  when multiple incoming wire stories are about the same unfolding event
  and clusters them before an editor touches them.
- **Breaking mode** — pipeline state where model behaviour changes in
  real time because a major event has been detected.
- **Audit trail** — the log of *which user saw which content* via *which
  model version* with *which features* at *which score*. Mandatory before
  any personalisation surface ships.
- **Editorial override** — the ability for a non-engineer editor to pull
  a story, suppress a tag, or veto a ranking decision without an engineer
  in the loop. Required from day one of any AI surface.

## Things that aren't terms

These show up in code or chat but are *not* part of our vocabulary:

- **"Article"** — too generic. Use `story` (Flash), `read` (Worldwide,
  Aftermath), `item` (Pocket).
- **"User"** — fine in code. In product copy, write `reader`.
- **"Algorithm"** — vague. Use `ranker`, `recommender`, `clusterer`,
  `summariser` — whichever is specific. "Algorithm" is the word people
  reach for when they don't know what the system actually does.
- **"AI"** in user-facing copy — too generic, too freighted. Name the
  function: "summary", "related stories", "different perspectives".

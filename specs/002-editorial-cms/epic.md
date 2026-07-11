# Rig Wire Editorial CMS — Epic Spec (2026-07-07)

The journalist-facing control portal over the automated Worldwide feed.
Internal tool, NOT the reader site. Separate route group: `/studio`.

## North star
**The automation proposes the entire feed; editors dispose only when they want to.**
Selection, generation, ranking, and placement stay 100% automatic. Editors never
have to build the page — they step in to correct the machine. If they do nothing,
the feed runs itself.

## The one architectural rule (non-negotiable)
Human decisions live in a **separate override layer** that **wins on read** and
**survives every pipeline run.** The pipeline must never silently undo an editor's
action, and the editor never fights the algorithm.
- Editors NEVER mutate `story_generated_v8` directly.
- All edits/decisions go into `rigwire.editorial_overrides`.
- The reader ranking reads `generated LEFT JOIN overrides` and the override wins.
- An edited story is `human_locked` → the generator skips it forever (no regen).

---

## Data model (schema `rigwire`, app read/write role)

### `editorial_overrides` (one row per story an editor has touched)
| column | type | meaning |
|---|---|---|
| story_id | uuid PK | the story being overridden |
| action | text | `live` \| `killed` \| `pinned` \| `held` (editorial state) |
| pinned_rank | int null | forced position in Top Stories (1-based) |
| importance_delta | numeric | added to `importance_score` for ranking (boost/suppress) |
| section_override | text null | force into a specific section |
| human_locked | bool | true once edited → pipeline must not regenerate |
| edited_headline | text null | overrides generated headline |
| edited_dek | text null | overrides deck |
| edited_body | text null | overrides body (markdown) |
| edited_tags | text[] null | overrides tags |
| editor_id | text | who |
| reason | text null | why (shown in audit) |
| created_at / updated_at | timestamptz | |

### `editorial_audit` (append-only log — also the ranker-quality signal)
`id, story_id, editor_id, action, before jsonb, after jsonb, at timestamptz`
> How often editors override the machine = the best label for whether ranking is good.

### `manual_stories` (editor-authored, injected into the feed)
`id, headline, dek, body, topic, country, image_url, status, editor_id, created_at`
> Flows through the same publish gate; byline = the editor / Rig Wire.

### `ranking_weights` (the importance knobs — one active row)
`id, topic_weights jsonb, country_weights jsonb, recency_halflife_h, source_weight,
velocity_weight, updated_by, updated_at`
> Editors turn sliders; ranking reads the active row. Live-preview before apply.

---

## Read integration (where overrides "win")
1. **`src/lib/worldwide/ranking.ts`** — join overrides:
   - `killed` → exclude everywhere.
   - `pinned` → force into Top Stories at `pinned_rank`.
   - `importance_delta` → add to score before ranking.
   - `section_override` → slot into that section.
   - `edited_*` → replace generated fields on the card/read.
   - manual stories → merged into the pool.
2. **`worldwide_gen_v2.py`** — skip any story where `human_locked = true`
   (add to the frontier query + generate_one guard).

---

## The portal (route group `/studio`, auth-gated: role=editor)

1. **Desk (dashboard)** `/studio` — the live feed as the editor sees it:
   - Top Stories + each section, in current order.
   - Per-story chips: **Kill · Pin · Boost/Suppress · Edit · Lock**.
   - Status badges: PUBLISHABLE / HELD / KILLED / PINNED / EDITED / LOCKED.
   - Inline reorder (drag) within Top Stories.
2. **Coming-up queue** `/studio/queue` — ranked-but-not-yet-surfaced stories
   (the "wire queue" editors watch); promote → pin into the feed.
3. **Story editor** `/studio/story/[id]` — inline-edit headline/dek/body/tags;
   Hold / Publish / Kill; auto-sets `human_locked`; side-by-side generated-vs-edited;
   preview as reader.
4. **Ranking knobs** `/studio/ranking` — sliders for topic/country weights,
   recency half-life, source/velocity weight; **live preview** of the reordered
   feed before Apply.
5. **Create story** `/studio/create` — author a manual story (headline/dek/body/
   topic/country/image); publish into the feed.
6. **Audit** `/studio/audit` — the append-only log; filter by editor/story/action.
7. **Sections** `/studio/sections` — see fill per section (which of the 10 are full
   vs starving), reorder section display, toggle a section on/off.

## API (`/api/studio/*`, POST, auth + CSRF)
- `POST /api/studio/override` — {story_id, action, ...fields, reason}
- `POST /api/studio/edit` — {story_id, headline?, dek?, body?, tags?} → sets human_locked
- `POST /api/studio/reorder` — {pins: [{story_id, rank}]}
- `POST /api/studio/weights` — {topic_weights, ...}
- `POST /api/studio/create` — manual story
- `GET  /api/studio/feed` — the desk view (feed + overrides + statuses)
- `GET  /api/studio/queue` — coming-up

Every write also appends to `editorial_audit`. All follow the API-response
envelope in `.claude/rules/api-conventions.md`.

---

## Build phases
- **E1 — Foundation:** migration (4 tables), `src/lib/studio/` data-access + types,
  the override-read helper, `human_locked` guard in the pipeline.
- **E2 — Desk + actions:** `/studio` dashboard, kill/pin/boost/lock chips, the
  override + audit API. Ranking reads overrides.
- **E3 — Editor:** `/studio/story/[id]` inline editor, hold/publish, edited-fields
  win on read.
- **E4 — Queue + reorder:** coming-up queue, drag-reorder pins.
- **E5 — Ranking knobs:** sliders + live preview + apply.
- **E6 — Create + Sections + Audit:** manual story, section manager, audit view.
- **E7 — Polish:** roles/permissions, preview-as-reader, empty/loading states.

## Guardrails
- Immutability: overrides are new rows / new versions; never mutate generated content.
- Every action is reversible (un-kill, un-pin, un-lock) and logged.
- Auth required; editor role; no public exposure.
- Reader site unaffected when the portal is untouched (overrides table empty → feed = pure automation).

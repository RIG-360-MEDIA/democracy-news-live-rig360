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
- `POST /api/studio/reorder` — {order: [story_id, …]} (rank = index + 1; replaces the pin set atomically)
- `POST /api/studio/weights` — {topic_weights, ...}
- `POST /api/studio/create` — manual story
- `GET  /api/studio/feed` — the desk view (feed + overrides + statuses)
- `GET  /api/studio/queue` — coming-up

Every write also appends to `editorial_audit`. All follow the API-response
envelope in `.claude/rules/api-conventions.md`.

**F7/F8 (2026-10):** the audit row is written by `writeAudit(tx, …)` (`src/lib/studio/audit-log.ts`)
inside the SAME `sql.begin` transaction as the write — overrides, manual/Door B stories, weights
(= section prominence), source leans and user admin (`user_create`, `user_role`, `user_reset_link`).
Config rows have `story_id = NULL` and carry their target (`source:<uuid>`, `user:<uuid>`,
`ranking_weights`) inside the before/after snapshots. Roles are enforced by one helper,
`requireRole('editor'|'admin')` (`src/lib/studio/session.ts`; `guardApi`/`guardPage` adapters in
`guard.ts`): admin for sources, weights/sections, ranking and `/studio/admin/*`; editor for the
rest. The policy lives in `test/unit/studio/access-matrix.ts`; `studio-role-matrix.test.ts` fails if
a new Studio route/page/action has no declared role, and `studio-audit-writes.test.ts` fails if a
declared write has no same-transaction audit scenario.

**F9–F12 (2026-10):**
- **F9 manual stories** — `PATCH /api/studio/manual/[id]` (editor: edit fields, `status`
  PUBLISHABLE↔UNPUBLISHED) and `DELETE` (admin: soft delete → `status = 'DELETED'`, row kept). Audit
  actions `manual_edit` / `manual_unpublish` / `manual_republish` / `manual_delete`. Controls live on the
  Create page's "Recently created" cards. The reader mappers (`manual-feed.ts`) drop any manual story whose
  headline is internal prompt/brief text ("Research the impact of …") and blank prompt-like deks/paragraphs
  (`src/lib/studio/prompt-leak.ts`). Only HIGH-confidence prompts (imperative + object + a prompt cue such
  as "impact of", "in 200 words", "article about") are hidden; body paragraphs are never filtered; weaker
  matches are only flagged on the Studio card. A PATCH that changes nothing writes nothing.
- **F10 reorder/pin** — `POST /api/studio/reorder` {order: uuid[] ≤ 12} replaces the WHOLE pin set in one
  transaction (stale pins unpinned, order pinned 1..n; failure rolls everything back). Every pin carries
  `pinned_until` (12 h, `src/lib/studio/pins.ts`); an expired pin stays Published but stops forcing rank.
  A single Pin displaces whoever held that rank (audited `unpin`). An expired pin forces nothing (no boost,
  no bypass of the machine gate). A reorder refuses killed stories and a stale `expectedPinToken` (409);
  SQLSTATE 23P01/40P01/23505/40001 on override/reorder/undo writes → 409. Migration 008 adds
  `pinned_until`, cleans legacy duplicate ranks (audited `pin_dedupe`/`pin_normalise`, never undoable) and
  adds the deferred `one_pin_per_rank` EXCLUDE + rank/expiry CHECKs; rollback file alongside.
- **F11 knobs** — `recencyHalflifeH` (true half-life), `sourceWeight`, `velocityWeight` (articles/hour of
  cluster span) are applied by `src/lib/worldwide/scoring.ts`, clamped to `KNOB_BOUNDS`. Defaults reproduce
  the pre-F11 page (half-life 16.6355 = 24·ln2, velocity 0 = opt-in; migration 009 sets the same by value
  and as column defaults). Topic/country weights are bounded 0–5. The SQL score now
  only selects the 600-story pool. Manual stories keep their stored 0–100 editor importance; at ranking time
  it is read as a PERCENTILE of the automated pool (`src/lib/worldwide/manual-importance.ts`: 0 → weakest,
  100 → ties the strongest, never above; a pin still leads) — previously a raw 40 outranked every
  generated story (~0.5–3).
- **F12 sections** — one shared section set + topic map (`src/lib/worldwide/sections.ts`, incl. TECH/SOCIAL).
  The /curate Sections panel saves order / visibility / band size (1–7) into
  `ranking_weights.section_layout` (migration 009) with the weights write; `getFrontPage` applies it.

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

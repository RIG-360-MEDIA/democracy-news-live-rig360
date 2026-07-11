# Saga / storyline layer — consumer contract for RIG Wire (2026-06-21)

**Why:** a developing mega-story (US–Iran deal) is ~220 event-clusters in 3 days — most are legit *different
chapters* (deal → tankers transit → Hormuz reopens → envoys travel), correctly NOT merged. The page currently
fakes grouping with a display-time heuristic (dominant entity + topic = a "hub") + shows the freshest member.
A real **saga layer** replaces that heuristic with a persistent storyline so the page shows **one evolving card
per saga, always its latest chapter** — "US–Iran deal — latest: tankers transit Hormuz." This spec is ONLY what
the front-end needs to read. READ-ONLY consumer (`analytics_user`). Don't prescribe your saga-detection method.

## What the page does with it
For the front-page cluster set, each surfaced cluster is **either** in a saga (→ render ONE saga card for the
whole storyline) **or** standalone (→ render its own card). Sagas and standalones are ranked together. The saga
card shows the **latest chapter's** headline/deck/image and links to that chapter's read; optionally a small
"N developments" / timeline.

## The contract (fields the page reads)

**A. Saga → cluster membership.** Either add `saga_id uuid NULL` to `analytics.story_clusters_v8`, **or** a
mapping table `analytics.story_saga_members(saga_id, story_id, chapter_seq int)`. The page just needs: given a
`story_id`, its `saga_id` (or null). A cluster is in **at most one** saga.

**B. `analytics.story_sagas`** — one row per storyline:
| field | meaning (page use) |
|---|---|
| `saga_id` (uuid, PK) | stable id |
| `label` (text) | neutral storyline name, e.g. "US–Iran nuclear deal" — stable across chapters (card kicker/title) |
| `latest_story_id` (uuid → clusters) | the **freshest chapter that is surfaceable+articled** (PUBLISHABLE, facts>0, not redirected/suppressed). The saga card renders THIS chapter's `story_generated_v8` headline/deck + its image, and links to `/long-read/{latest_story_id}` |
| `latest_last_seen_at` (ts) | max `last_seen_at` over members — the saga's recency (ranking + "Nh ago") |
| `chapter_count` (int) | # of surfaceable chapters (for "N developments") |
| `importance_score` (numeric) | storyline strength for ranking the saga vs standalones (e.g. max member importance / total breadth) |
| `dominant_entity`, `topic`, `subject_country/region` | placement: which topic section, which scope filter |
| `updated_at` (ts) | freshness of the saga row |

**C. (optional, for a timeline view) `members`** — orderable list of `{story_id, headline, last_seen_at}`
newest-first. Page can derive this from the membership table + `story_generated_v8`; not required for v1.

## Membership + guards (must hold, or the page breaks)
- `latest_story_id` MUST be surfaceable: `status LIKE 'PUBLISHABLE%' AND strategy<>'stub' AND facts>0 AND
  redirected_to IS NULL AND suppression_reason IS NULL`. If a saga has **no** surfaceable chapter, omit it
  (don't emit a saga with a dead `latest_story_id`).
- Exclude `redirected_to IS NOT NULL` / `suppression_reason IS NOT NULL` clusters from membership counts and
  from `latest_story_id` (same dedup guard the page already applies).
- A saga is **active** only if `latest_last_seen_at` is within the page's freshness window (≤7 days) — else the
  page drops it (matches the existing recency cap). Stale sagas just don't surface.
- `label` must be **neutral** (no slant) and **stable** — it's shown as the card's storyline name across days.

## How the page will consume it (replaces the hub heuristic)
- Front-page query joins each surfaced cluster to its `saga_id`. Clusters sharing a `saga_id` collapse to **one
  saga card** (built from `story_sagas.latest_story_id`); clusters with null `saga_id` stay standalone.
- Saga card rank = `story_sagas.importance_score` with the same recency-gate on `latest_last_seen_at`.
- This retires `eventhub.ts`'s entity+topic hub heuristic in favor of the real storyline. (I keep the band-aids
  until the saga layer is live, then switch.)

## What I do NOT need (keep it scoped)
- No per-chapter UI beyond the latest + optional timeline. No saga "summary article" (the latest chapter's
  article is the read). No cross-saga linking. No new auth. Single-source chapters stay stubbed as today.

## Deliverable back
Confirm the table/column names + that `latest_story_id` honors the surfaceable guard, plus a count of sagas
with ≥2 surfaceable chapters (so I know the volume before wiring). Then I switch the front page from the hub
heuristic to `saga_id`.

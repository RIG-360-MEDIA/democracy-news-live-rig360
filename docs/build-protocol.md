# Build Protocol — Rig Wire ↔ rig-surveillance

How we develop Rig Wire features against the rig-surveillance data.
Five rules (numbered 0–4) that override any architectural intuition
contradicting them. Rule 0 is the one that bites first.

---

## Rule 0 — Pin both `extraction_version` AND `substrate_processed_at`

Before any other rule. The substrate is, effectively, an LLM. Output
values shift when the extraction prompt changes — and the rig team
does NOT always bump `extraction_version` when they change the prompt
(see `docs/data-source-rig-surveillance.md` "Current state"). The
column can say "3" while the data behind it shifts.

The real version key is the **pair** `(extraction_version,
substrate_processed_at)`. Every Rig Wire query starts with:

```sql
WHERE substrate_status   = 'ok'
  AND extraction_version = 3
  AND substrate_processed_at > '2026-05-27 16:00:00+00'
  AND NOT is_duplicate
```

Never mix prompt-generations. Golden tests are captured against a
specific `(version, processed_at)` window and re-captured when the
window shifts. Audit logs record the pair, not just the version
column.

Skip the `substrate_processed_at` clause and you will see a
frankenstein of old verbose prompt + new compressed prompt. Your
faithfulness check will lie to you.

## Rule 1 — No new scrapers; rows may be re-extracted in place

The rig-surveillance scrapers are **currently offline.** No new
articles arrive. The corpus boundary is stable.

However, the rig team can re-run extraction over existing rows. When
they do, child rows (claims, quotes, locations, events, numbers,
stances) DELETE+INSERT on cascade and `substrate_processed_at` jumps
to NOW(). No history is kept.

"Frozen" therefore means: same set of rows, replaceable LLM-field
contents. The `substrate_processed_at` filter from Rule 0 is what
gives us a stable read of the corpus during a drain — rows that
already pass the filter don't get re-touched in the same drain pass.

What you can rely on:

- Row count, IDs, URLs, timestamps, source IDs.
- `labse_embedding` (embedding model not swapped).
- Deterministic-trigger columns: `effective_event_date`,
  `location_scope`, `source_country`, normalised `unit`.
- `entity_dictionary` — canonical IDs stable.

What changes when a row gets re-drained (matters only for rows below
the post-D1 timestamp): see `docs/data-source-rig-surveillance.md`
volatile-fields list.

## Rule 2 — Independent backends per module

Each of the six modes (Flash, Newsletter, All Sides, Worldwide,
Aftermath, Pocket) gets its **own** backend: its own routes under
`src/api/<mode>/`, its own views in `analytics.*`, its own pure
logic in `src/lib/<mode>/`, its own materialised views, its own
refresh cadence, its own ranker and faithfulness scorer.

**No shared backend monolith.** No `/api/articles` mega-endpoint that
six modes consume. If two modes happen to query the same shape, the
duplication stays. The promotion-to-shared trigger is 3+ modes
needing the same primitive — same 3-copy rule as ADR 0003 for
components. The seal that makes each mode independent at the React
layer also applies at the data layer.

Consequences:

- Flash's faithfulness scorer ships independently of All Sides's
  clustering.
- Worldwide's ranker doesn't block on Newsletter's selection logic.
- A bug in Pocket's TTS pipeline never breaks Aftermath's temporal
  join.
- Each module can be developed, tested, and graduated to live data
  on its own schedule.

Cost: some duplicated query patterns across modes. Accepted — coupling
is more expensive than redundancy at this stage.

## Rule 3 — Validated against the snapshot first, live data later

**Graduation criteria** — a module switches from snapshot-validated to
live ingestion only after all eight boxes are checked:

- [ ] All queries pin `(extraction_version, substrate_processed_at)`
      to a single window (Rule 0).
- [ ] All `analytics.*` views the module depends on are defined and
      idempotent (re-running the migration produces the same state).
- [ ] Golden tests exist on a fixed input set, **labelled with the
      `(version, processed_at)` window they were captured against**.
      When the upstream window shifts, the tests are re-captured
      before the module ships.
- [ ] Faithfulness gates pass on the corpus with a documented
      threshold (for any AI-generated text shown to the user).
- [ ] Editorial override paths exist and are tested. An editor can
      pull a story or override a tag without an engineer.
- [ ] Audit log captures *what was shown, why, under which
      `(version, processed_at)` window, at which score* on every
      personalisation call.
- [ ] Observability is wired — p99 latency, error rate, freshness
      dashboards exist and have non-empty data.
- [ ] Rollback procedure is written and tested against a synthetic
      bad-state scenario (one fake hallucinated summary surfaced —
      can we pull it in under 5 minutes?).

Only when **all eight** are checked does a module graduate.

The snapshot is our test set: a known distribution of inputs whose
outputs we can manually verify. Live ingestion is a different
distribution (newer entities, breaking events, drift in extraction).
We earn the right to consume it. We do not assume it.

## Rule 4 — The seam is `analytics.*`, never `public.*`

Rig Wire backends read from views in the `analytics` schema. They do
**not** read from `public.*` directly. Even when a query against
`public.<table>` would be marginally simpler, it goes through an
`analytics.<view>` wrapper.

Reasons:

- Upstream schema changes in `public.*` don't break Rig Wire
  immediately — we update the view definition once and the app
  doesn't notice.
- The view is a contract. Rig Wire knows the shape it asks for and
  doesn't have to understand the substrate's evolution.
- Permissions enforce it — we have read-only on `public.*` and
  read-write on `analytics.*`. There's no path to mutate source data,
  intentionally or accidentally.

When the rig-surveillance team ships a migration that touches a
`public.*` column we depend on, the only Rig Wire change is the
corresponding `analytics.*` view definition. The application code
above doesn't see the migration.

---

## Build order (six modes)

From `docs/mistakes.md` 2026-05-28 + the substrate analysis. With the
D1 drain finishing within 24–36h and `substrate_processed_at` giving
us a stable read, **all six modes can scaffold their `analytics.*`
views and `src/lib/<mode>/` logic in parallel today.** The priority
below reflects which mode ships its end-to-end vertical fastest:

1. **Aftermath** — leans on `effective_event_date` (migration 072) +
   `labse_embedding`. Pure query mode, no AI generation step. Cleanest
   proof of the seam end-to-end. ~3 weeks if disciplined.
2. **Worldwide** — `source_country` + LaBSE + region routing
   (migrations 074, 075). Adds the curation ranker. Mostly structural.
3. **All Sides** — clustering on LaBSE + political-lean lookup we
   own in `analytics.source_political_lean`. Independent of the drain.
4. **Flash** — faithfulness gate over `summary_executive`. Build in
   `src/lib/flash/` against post-D1 articles today; the gate itself
   is pure logic and golden-testable.
5. **Newsletter** — selection-and-diversification over event clusters
   (reuses primitives from #1 and #3). Adds editorial selection logic.
6. **Pocket** — TTS over `summary_executive`. Browser-side
   `speechSynthesis` for v1; server-side neural TTS for v2.

Aftermath shipping against the post-D1 snapshot is the architectural
proof. Everything after extends from there.

## What goes where

| Layer                          | Path                                       |
| ------------------------------ | ------------------------------------------ |
| Per-mode HTTP routes           | `src/api/<mode>/route.ts`                  |
| Per-mode pure logic            | `src/lib/<mode>/`                          |
| Per-mode analytics views       | `analytics.<mode>_*`                       |
| Per-mode materialised views    | `analytics.<mode>_*_mv`                    |
| Per-mode golden tests          | `src/lib/<mode>/__golden__/`               |
| Per-mode faithfulness scorers  | `src/lib/<mode>/faithfulness.ts`           |
| Per-mode editorial overrides   | `analytics.<mode>_overrides` + admin route |
| Schema migrations (analytics)  | `analytics-migrations/<NNNN-name>.sql`     |

`analytics-migrations/` does not yet exist. It's created when the
first module writes its first migration.

---

## What this protocol is NOT

- Not a separate-team process gate. Every Rig Wire engineer enforces
  it on their own work.
- Not a permanent freeze. Live data is the goal; the protocol is the
  bridge.
- Not specific to a single mode. The eight graduation criteria apply
  uniformly across all six.
- Not a substitute for the rules in `.claude/rules/code-style.md` or
  `CLAUDE.md`. Those stay in force. This adds the data-layer
  discipline on top.

---

## Related

- `docs/data-source-rig-surveillance.md` — the data we consume; the
  "Current state" section names which fields are volatile during
  re-extraction and the post-D1 timestamp threshold.
- `docs/architecture.md` — the static-prototype architecture and the
  three seams where backend attaches (this protocol governs Seam 1
  and Seam 2).
- `.claude/skills/aryan-mehta/SKILL.md` — the persona that holds the
  editorial-integrity rules invoked in graduation criterion checks.
- `docs/mistakes.md` — postmortem log; first entry triggered the
  build-order revision above.

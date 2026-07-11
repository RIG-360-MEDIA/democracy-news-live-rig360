# Feature Specification: Worldwide — Story Reading Layer

**Feature Branch**: `001-worldwide`
**Created**: 2026-06-14
**Status**: Draft
**Input**: User description: "Worldwide page reading from the _v8 story engine — define what fields Worldwide needs from stories and the logic behind each."

> Scope of THIS spec: the **reading layer** — what Worldwide consumes from the story engine
> and how it presents it. The story engine itself (clustering `_v8`) is adopted and out of
> scope. The data the page needs but that does not yet exist on `_v8` (enrichment tables) is
> captured here as a **dependency + data contract**, not as build mechanics (those live in
> `plan.md`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Scan the front page (Priority: P1)

A reader opens Worldwide and sees a newspaper-style front page: the most important stories
of the moment as ranked cards, scoped to **World** or to a single country (e.g. India). Each
card shows a headline, how widely the story is covered, how fresh it is, and an image.

**Why this priority**: This is the product. A ranked, scoped front page is a viable MVP on
its own — it delivers "what's happening now, ranked" even before the story-page read exists.
It also runs almost entirely on cluster-level fields that already exist on `_v8`.

**Independent Test**: Load the front page at World scope and at India scope; confirm the top
cards are sensible, ranked by importance, with no junk/template piles, and the scope filter
changes the set correctly.

**Acceptance Scenarios**:

1. **Given** the `_v8` story layer, **When** the reader opens Worldwide at World scope, **Then** the Top Stories show the highest-importance non-suppressed stories, at most 2 per topic, newest-weighted.
2. **Given** a reader at India scope, **When** the page loads, **Then** only stories whose subject country is India appear in the scoped sections, and the World-only stories are excluded.
3. **Given** a story suppressed as a template/junk pile, **When** any section renders, **Then** that story never appears.
4. **Given** a story covered by one outlet only (a scoop), **When** its card renders, **Then** it is not labelled with an inflated source count and can still surface if its source is high-tier.

---

### User Story 2 — Read a story (Priority: P2)

A reader taps a card and lands on a story page: a synthesized, neutral write-up of the event,
with the sources it was built from, the key facts, a timeline of how it developed, notable
quotes, and how different outlets frame it.

**Why this priority**: This is the depth that differentiates Worldwide from a headline list,
but it depends on enrichment data that does not yet exist on `_v8`, so it follows P1.

**Independent Test**: Open any multi-source story; confirm the article reads coherently, every
factual claim traces to a listed source, and sources/timeline/quotes render.

**Acceptance Scenarios**:

1. **Given** an enriched story, **When** the reader opens it, **Then** the page shows a generated article, a source list, key facts, a timeline, and quotes.
2. **Given** the generated article, **When** it is displayed, **Then** every claim in it is supported by the story's fact ledger or quotes — nothing is fabricated.
3. **Given** a fact whose numeric value is uncertain, **When** it is shown, **Then** the claim is surfaced but the bare number is gated unless it has a clean unit and multi-source support.
4. **Given** a story's underlying facts materially change, **When** the page is next served, **Then** the article reflects the change (regenerated), not a stale version.

---

### User Story 3 — Browse sections and the world (Priority: P3)

A reader scrolls past Top Stories into topic sections (Politics, Sports, Security,
Climate/Science, Business/Finance) and an "Around the World" row showing one lead story per
country.

**Why this priority**: Adds breadth and browsability once ranking (P1) works; reuses the same
fields, no new data contract.

**Independent Test**: Confirm each topic section is populated from the right topic, capped for
diversity, and "Around the World" shows at most one story per country.

**Acceptance Scenarios**:

1. **Given** the ranked pool, **When** the Politics section renders, **Then** it lists the top POLITICS stories by importance.
2. **Given** the "Around the World" row, **When** it renders, **Then** each country appears at most once, represented by its highest-importance story.
3. **Given** a topic with no qualifying stories, **When** the page renders, **Then** that section is hidden rather than shown empty.

---

### Edge Cases

- **Mega-event** (e.g. the Iran deal spanning markets / military / diplomacy): **RESOLVED → B+ event hub.** The event's angle-stories (what `_v8` naturally produces) are presented as focused, distinct stories, gathered under ONE umbrella "full coverage" card/header on the front page that opens to a hub listing them. The umbrella is a **display-only** grouping — it never alters clustering, so a mis-group is cosmetic, not a corrupted story. This reframes the known recall limitation as intentional angle-coverage.
- **Story with no enrichment yet** (clusters exist, facts/sources not built): **RESOLVED → sources-only stub.** The front-page card shows; the story page degrades to a sources-only stub (never a dead link), upgrading to the full read once enriched.
- **Wrong fact number** (engine-known ~18–25% value error): bare numbers gated; claim still shown.
- **Cross-lingual story** (representative title in a non-English script): **RESOLVED → translate the display title** to the reader's language (translations already exist); show the original on the story page.
- **Over-merged small cluster** (engine-known ~3 adversarial cases): a card may occasionally mix two unrelated articles — acceptable bounded defect at launch, logged for alias-cleanup-v2.
- **Empty / thin section**: hidden, never shown empty.
- **Scope with sparse coverage** (a country below a story-volume floor): **RESOLVED → don't offer that country scope** until it clears the floor (placeholder ≈50 stories; tune on real data) so sparse scopes never look broken.

---

## Requirements *(mandatory)*

### Functional Requirements — Front page (P1)

- **FR-001**: System MUST rank stories by an importance score combining independent-source breadth, recency, fact substance, and a high-tier-source scoop bonus.
- **FR-002**: System MUST cap topic diversity in Top Stories (no single topic dominates — at most 2 per topic), while not capping the residual/uncategorised bucket.
- **FR-003**: System MUST exclude any story carrying a suppression reason from every surface.
- **FR-004**: System MUST support a scope filter (World vs a single country) driven by each story's subject country.
- **FR-005**: System MUST display each story's independent-source count honestly — a single-source scoop MUST NOT be shown as multi-source.
- **FR-006**: System MUST weight recency so newer stories rank above equally-sourced older ones (decay, not hard cutoff).
- **FR-007**: System MUST source each card's headline from an on-core article of the story (the title must describe the story's actual core, not a fringe member).
- **FR-008**: System MUST show a representative image per card, sourced from the representative article's lead image, falling back to a topic/source placeholder when absent.

### Functional Requirements — Story page (P2)

- **FR-009**: System MUST present a generated article assembled ONLY from the story's fact ledger, quotes, and source material — never invented content.
- **FR-010**: System MUST verify each generated article for faithfulness before display; a story failing verification MUST NOT show a generated article (degrade to sources/facts).
- **FR-011**: System MUST list the story's sources (outlet name, link, title, tier) for transparency and click-through.
- **FR-012**: System MUST surface key facts, but MUST gate any bare numeric value lacking a clean unit and multi-source corroboration.
- **FR-013**: System MUST show a timeline of developments when available. *(v1: the engine carries a velocity/span summary — one row per story; a real per-dateline "how it unfolded" timeline is a fast-follow, not a v1 blocker.)*
- **FR-014**: System MUST show verbatim, attributed quotes when available.
- **FR-015**: System MUST show how different outlets frame the story (perspective/stance) when available.
- **FR-016**: System MUST regenerate a story's article when its underlying facts/developments/stance materially change, and not regenerate on immaterial refreshes.

### Functional Requirements — Sections (P3)

- **FR-017**: System MUST assign stories to topic sections by the story's topic field.
- **FR-018**: System MUST render an "Around the World" view with at most one story per country (its highest-importance one).
- **FR-019**: System MUST hide any section with no qualifying stories rather than render it empty.

### Functional Requirements — Event hubs (B+)

- **FR-022**: System MUST group a mega-event's related angle-stories under a single umbrella "full coverage" entry on the front page, which opens to a hub listing the angle-stories.
- **FR-023**: System MUST treat event-hub grouping as **display-only** — it MUST NOT alter the story clustering or merge the underlying stories; the angle-stories remain distinct, independently-readable stories.
- **FR-024**: System MUST form a hub only from stories sharing a dominant subject (e.g. a shared dominant entity) within a recent time window, and MUST fall back to showing a story as a normal standalone card when it does not qualify for any hub.
- **FR-025**: System SHOULD rank an umbrella hub on the front page by the aggregate importance of its member angle-stories, so a major event outranks a single ordinary story.

### Cross-cutting

- **FR-020**: System MUST treat the story engine as read-only; Worldwide never writes back to the story layer.
- **FR-021**: System MUST degrade gracefully where enrichment is missing (front page works without it; story page adapts).

---

## Key Entities *(the data contract — what Worldwide reads from a Story)*

> Attributes are described by purpose, not storage. ✅ = exists on `_v8` today; ⏳ = depends on
> enrichment build (not yet on `_v8`).

- **Story** — one clustered news event.
  - `id` ✅ — stable identity for routing/links. *Why: every card and page needs a permanent address.*
  - `representative_title` ✅ — the card/page headline, from an on-core member. *Why: the one line that tells the reader what it is; must reflect the core (FR-007).*
  - `topic` ✅ — section assignment + diversity cap. *Why: where the card lives and how the feed stays varied (FR-002, FR-017).*
  - `subject_country` ✅ — scope filter + Around-the-World. *Why: drives World-vs-country and the geographic row (FR-004, FR-018).*
  - `independent_source_count` ✅ — primary importance signal + honest "covered by N" badge. *Why: breadth of independent coverage = how big the story is; also a trust cue (FR-001, FR-005).*
  - `article_count` ✅ — secondary scale signal. *Why: raw volume, a tiebreaker behind independent breadth.*
  - `first_seen_at` / `last_seen_at` ✅ — recency ranking + "updated X ago." *Why: news decays; rank and label by freshness (FR-006).*
  - `representative_article` (+ its `source_tier`) ✅ — scoop bonus + image/title origin. *Why: a tier-1 exclusive should rise even at low source count (FR-001); the rep article anchors the card.*
  - `fact_count` / `facts` ⏳ — substance signal + story-page key facts. *Why: a fact-rich story is substantive, not a blurb (FR-001, FR-012).*
  - `suppression_reason` ✅ — exclusion flag. *Why: keep junk/template piles out of every surface (FR-003).*
  - `representative_image` ✅/⏳ — the visual, from the rep article's lead image (placeholder fallback). *Why: a newspaper needs imagery (FR-008).*
- **Source** ⏳ — a contributing article: outlet name, URL, title, tier. *Why: transparency, breadth, click-through (FR-011).*
- **Fact** ⏳ — an entity-anchored claim (+ optional value/unit, supporting sources). *Why: the raw material the article is generated from + the key-facts list; numbers gated (FR-009, FR-012).*
- **TimelineEntry** ⏳ — a dated development. *Why: shows how the event unfolded (FR-013).*
- **Quote** ⏳ — verbatim text + attributed speaker + source. *Why: human voice and credibility (FR-014).*
- **Perspective/Stance** ⏳ — how outlets frame the story. *Why: bias/blindspot awareness (FR-015).*
- **GeoPoint** ⏳ — location context for mapping. *Why: geographic stories benefit from a map.*
- **GeneratedArticle** ⏳ — the synthesized read + faithfulness verdict + fact-version stamp. *Why: the actual article, provably faithful, regenerated on material change (FR-009, FR-010, FR-016).*
- **EventHub** (display-only, derived) — an umbrella over a mega-event's angle-stories: a header/title + the member story ids, formed from a shared dominant subject + recent window. *Why: present a huge event as one front-page entry that opens to its focused angle-stories (B+), WITHOUT re-merging clusters — a mis-group is cosmetic, not a corrupted story (FR-022–025).* Not a stored clustering artifact; computed at read time for layout.

---

## Success Criteria *(mandatory — measurable, technology-agnostic)*

- **SC-001**: The front page renders the top stories for a given scope within a perceptibly instant load (target p95 under 1s).
- **SC-002**: Zero suppressed stories appear across all surfaces in a full-page audit.
- **SC-003**: No topic occupies more than 2 of the Top Stories slots in any single load.
- **SC-004**: Switching scope (World ↔ a country) changes the story set with 100% scope purity (no out-of-scope story in a scoped section).
- **SC-005**: 100% of facts displayed on a story page link to at least one source; 100% of bare numbers shown pass the unit + multi-source gate.
- **SC-006**: In a 50-story faithfulness audit, 0 generated articles contain a claim not supported by the story's facts/quotes.
- **SC-007**: Every rendered section is non-empty; empty sections are hidden in 100% of loads.
- **SC-008**: A reader can get from a front-page card to its sources/originals in one tap.

---

## Assumptions & Dependencies

- **DEP-001 (blocking P2/P3 depth)**: `_v8` enrichment tables (Source, Fact, TimelineEntry, Quote, Perspective, GeoPoint, GeneratedArticle) MUST be built on `_v8` before the story-page read works. They do not exist yet (only job_7's, now archived).
- **DEP-002**: Cluster-level fields (id, title, topic, subject_country, source counts, timestamps, suppression) already exist on `_v8` → the front page (P1) is buildable now.
- **DEP-003**: The content-generation recipe and the faithfulness verifier are already built and validated; they are wired here, not invented.
- **ASSUMPTION-001**: Default scope is World; country scopes are selectable. Personalising the default to a user's country is deferred (post-launch).
- **ASSUMPTION-002**: Known engine limitations are accepted at launch and shown honestly: ~3 adversarial over-merges (precision) and mega-event fragmentation (recall) — both have named fast-follows; neither blocks this reading layer.
- **ASSUMPTION-003**: Fact numeric values carry ~18–25% error → the number-gating rule (FR-012) is mandatory, not optional.

---

## Review & Acceptance Checklist

- [ ] Every functional requirement is testable and unambiguous (or marked `[NEEDS CLARIFICATION]`).
- [ ] User stories are independently testable and priority-ordered.
- [ ] Success criteria are measurable and technology-agnostic.
- [ ] The data contract (Key Entities) distinguishes what exists on `_v8` from what must be built.
- [ ] No HOW (storage/wiring/tech) has leaked into this spec — deferred to `plan.md`.
- [ ] All `[NEEDS CLARIFICATION]` markers resolved before planning.

### Decisions log (clarifications resolved 2026-06-14 — ready for `plan.md`)
1. **Mega-event → B+ event hub** (umbrella card → hub of focused angle-stories; display-only grouping). FR-022–025, EventHub entity.
2. **Image** → representative article's lead image; placeholder fallback. FR-008.
3. **Missing enrichment** → sources-only stub, never a dead link. Edge Cases, FR-021.
4. **Cross-lingual titles** → translate the display title; original on the story page. Edge Cases.
5. **Default scope** → World; country selectable; personalization deferred. ASSUMPTION-001.
6. **Sparse country scope** → not offered below a story-volume floor (≈50, tune on data). Edge Cases.

All `[NEEDS CLARIFICATION]` markers resolved. No open blockers to planning.

### Build state (2026-06-14)
- **Enrichment built on `_v8`** (build-dark, no LLM, archives intact): sources/facts/quotes/
  timeline/geo/stance + status. Full enrichment is **surfaced-only** (4,601 multi-source
  stories — job_7 behavior, scaled 6.4×); non-surfaced multis + singletons degrade to a
  read-time stub (FR-021), NOT pre-enriched. Facts carry value_min/max/latest + unit +
  citing_article_ids → S-1 number-gate works (FR-012).
- **Stage-3 section validation PASS on enriched `_v8`** — all 8 edge-checks green; the front
  page renders a real, ranked, diversity-capped, scope-pure newspaper. B+ confirmed: mega-events
  appear as distinct angle-stories (EventHub gathers them at read-time).
- **Known v1 quality flags (non-blocking, backlogged):** subject_country leans to dominant
  source geography (some international stories tagged IN — affects country scope, not World);
  timeline is summary-only (FR-013); ~3 adversarial over-merges (alias-cleanup-v2); mega-event
  recall (event-linkage embedding). All have named fast-follows.

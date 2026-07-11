# Enrichment-on-_v8 — DB chat kickoff (Worldwide prerequisite)

**From:** analytics. **Why:** `_v8` has clusters/members/edges but **no enrichment tables** —
the front page can read cluster fields today, but the Worldwide story-page read + content-gen
need the enrichment data sheets. Build them on `_v8`, build-dark. Data contract =
`specs/001-worldwide/spec.md` (Key Entities). Read-only on the keeper; new tables only.

## Goal
Run the existing enrichment pipeline against the `_v8` clusters (run_id 1781406460) →
produce the `_v8` enrichment tables, schema-mirroring the archived job_7 set so all downstream
(sections.sql, content-gen, Worldwide) works unchanged.

## Tables to build (mirror `story_*_archive` schema exactly — same columns/types)
- `analytics.story_sources_v8`  — contributing articles per story (outlet, url, title, tier)
- `analytics.story_facts_v8`    — entity-anchored claims (+ value, unit, supporting source ids)
- `analytics.story_timeline_v8` — dated developments
- `analytics.story_quotes_v8`   — verbatim + attributed speaker + source
- `analytics.story_stance_v8`   — per-source framing/perspective
- `analytics.story_geo_v8`      — location points
- `analytics.story_enrichment_status_v8` — per-story coverage tag (**empty ≠ unprocessed** —
  distinguish "enriched, genuinely no quotes" from "not yet run")

## Scope
- **All NON-suppressed stories** (suppression_reason IS NULL).
- **Multi-article (article_count > 1, ~17.7K): full enrichment** (all tables).
- **Single-article (article_count = 1): trivial path** — at least one `story_sources_v8` row
  (its own article) + basic facts, so a front-page scoop opens to a sources stub (spec FR-021),
  not a dead read. Don't run the heavy multi-source steps on singletons.
- Report the counts you enrich in each bucket.

## Invariants / cautions (carry forward)
- **Use the clean `entities_extracted`** (co-mention-validated) for fact/stance anchoring —
  NOT the alias-expanded matviews. Same signal the clustering used; avoids re-importing the
  junk-glue. (Junk entities — theresa may / mick price / tumkur city / domestic — will still
  appear at the extraction layer; alias-cleanup-v2 is the durable fix. Flag, don't block.)
- **Facts must preserve `value` + `unit` + supporting `source_ids`** so Worldwide can apply the
  S-1 number-gate at display (engine-known ~18–25% fact-value error → claim shown, bare number
  gated). Do NOT drop facts; just keep enough to gate them downstream.
- **Build-dark:** new `_v8` tables only; do NOT touch the `*_archive` or `*_old` tables.
- **Provenance:** stamp run_id / as_of so the enrichment is traceable to this clustering run.
- **LLM-quota check:** if any enrichment step uses the shared LLM pool, note that groq/cerebras
  daily quota was exhausted during the discriminator run earlier today — verify headroom / pace
  it, and report which steps (if any) are LLM-dependent.

## Out of scope (separate, not this task)
Content generation + the faithfulness verifier (they CONSUME this data — built/validated
already, wired later). The front-page ranking/sections (cluster-field only, no enrichment).

## Report back (raw)
- Per-table row counts + coverage % of surfaced stories (multi vs single buckets).
- 5 sample enriched MULTI-article stories: story_id, title, #facts / #sources / #timeline /
  #quotes — for an eyeball sanity pass.
- Any step stubbed/empty + why; any LLM-dependent step + quota status.
- Confirm archives/keeper untouched.

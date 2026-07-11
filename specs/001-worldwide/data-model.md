# Data Model: Worldwide (Phase 1 design output)

DTOs the read API returns, and how each maps to `_v8`. Read-only; no writes from Worldwide.
✅ = exists on `_v8` cluster table · ⏳ = from `_v8` enrichment (surfaced stories) · ⊕ = derived
at read time.

## StoryCard (front page)
| Field | Type | Source |
|---|---|---|
| `id` | string | story_clusters_v8.story_id ✅ |
| `title` | string | representative_title ✅ (on-core; translated for display ⊕) |
| `topic` | string | topic ✅ |
| `country` | ISO2 \| null | subject_country ✅ |
| `importance` | number | ⊕ ranking score (validated formula) |
| `independentSources` | int | independent_source_count ✅ |
| `articleCount` | int | article_count ✅ |
| `lastSeenAt` | iso ts | last_seen_at ✅ |
| `freshnessSeconds` | int | ⊕ now − last_seen_at |
| `imageUrl` | string \| null | rep article lead image ✅ (placeholder fallback ⊕) |
| `isScoop` | bool | ⊕ article_count = 1 |
| `hubId` | string \| null | ⊕ EventHub membership (Phase 2) |

**Ranking (validated):** `importance = 1.0·ln(1+indepSrc) + 0.5·ln(1+min(facts,15)) +
2.0·exp(−ageDays/3) + tierBonus(rep)`. Pool = `suppression_reason IS NULL` AND not title-flag.
Diversity: ≤2 per real topic in Top Stories; OTHER uncapped. (Exactly `sections.sql`, PASS.)

## EventHub (front page umbrella, Phase 2) ⊕ display-only
| Field | Type | Source |
|---|---|---|
| `hubId` | string | ⊕ stable hash of dominant entity + window |
| `title` | string | ⊕ dominant entity / lead member title |
| `dominantEntity` | string | ⊕ shared top entity of members |
| `memberStoryIds` | string[] | ⊕ |
| `aggregateImportance` | number | ⊕ Σ member importance |
| `memberCount` | int | ⊕ |

Rule: group surfaced stories sharing a dominant entity within a recent window; a story in no
group renders as a standalone StoryCard. Never alters clustering.

## StoryDetail (story page) = StoryCard + the read
| Field | Type | Source |
|---|---|---|
| `generatedArticle` | { text, faithful:bool, factVersion } \| null | story_generated_v8 ⏳ (Phase 3); null → stub |
| `sources[]` | { outlet, url, title, tier } | story_sources_v8 ⏳ |
| `facts[]` | { claim, value?, unit?, sourceIds[], gated:bool } | story_facts_v8 ⏳ |
| `timeline` | { spanDays, updateCount } (v1 summary) | story_timeline_v8 ⏳ |
| `quotes[]` | { text, speaker, sourceId } | story_quotes_v8 ⏳ |
| `perspectives[]` | { source, framing } | story_stance_v8 ⏳ |
| `geo[]` | { lat, lng, label } | story_geo_v8 ⏳ |

**Number-gate (FR-012, S-1):** a fact's `value` is shown ONLY if it has a clean `unit` AND
`single_source = false` (multi-source); else `gated:true` and the claim text shows without the
bare number. The API computes `gated` from `story_facts_v8.value/unit/single_source`.
**Degrade (FR-021):** no enrichment row → `generatedArticle:null`, `sources` from the rep
article only → the page renders a sources-only stub, never a dead link.

## Scope
`scope=world` → no country filter. `scope=<ISO2>` → `subject_country = ISO2`; offered only for
countries above the volume floor (~50). Default world.

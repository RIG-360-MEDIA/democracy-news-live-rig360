# Worldwide — DB-chat MASTER WORK ORDER (2026-06-15)

The single, complete list. Supersedes `dbchat-coordination` + `enrichment-completeness` as the
authoritative ask. **DB chat owns** everything below. **Analytics owns** ranking/API, page wiring,
eval + GO/NO-GO (listed at the end so the boundary is clear). Report raw per the number-handling
protocol — analytics reads + locks, retypes nothing.

## 0. PRECONDITION — confirm first (gates the cheap/LLM split)
Confirm the per-article tables (`article_claims`, per-article stances, `quotes`) retain **`article_id`
+ the granular field** (value / stance) so re-aggregation can rejoin date·source·tier. If they don't,
flag immediately — it changes everything below from "cheap SQL" to "needs re-extraction."

## 1. Enrichment provenance v2 — CHEAP · SQL re-aggregation · NO LLM · NO TOKENS (P1)
Re-run the enrichment keeping the detail the aggregates threw away (it already exists per-article):
- **FACTS** → per-value series **(value, published_at, source_id, source_tier)**, not just min/max/latest.
  Unlocks: update-vs-disagreement (10→20 over time vs same-day spread), source-weighted numbers.
- **STANCE** → **source→stance rows + coverage-by-lean + who is SILENT**, not just the blend.
  Unlocks: All-Sides + blindspot.
- **CLUSTER `first_seen_at`** = `min(member.published_at)` (real event start), NOT `collected_at`.
  Unlocks: correct recency + timeline.
- **QUOTES** → surface quote date (`article_id→published_at`); (P3) disputed/retracted flag.
- **GEO** → (P3) country→lat/lng lookup only if a pin-map is wanted (country-shade works now).
Report: new shapes + coverage. This is a deterministic re-run — no model calls.

## 2. Topic — story-wise, kills the 23% OTHER (P1)
Assign **topic + tags per surfaced story via the LLM**, FOLDED INTO the content-gen call (one call does
article+deck+headline+topic+tags). Non-generated stories → a cheap topic-only pass.
Report: OTHER% after + the taxonomy.

## 3. Content-gen — LIVE WIRING (the product) (P1)
- **Generator = this session's validated `gen_hybrid`** (A-first → verify → B → extractive). **Retire/
  reconcile the old unwired stage-0→6** (5-critic, `narrative_drafts`, 0 rows) — quick head-to-head only
  if you want to keep its critic panel; default to the lighter validated one.
- **Each story emits:** a compelling **NYT/Atlantic-editor-style headline** (verified as a claim) +
  one-line **deck** + the **article** + **topic/tags**.
- **Caching tiers (NOT batch-bake all 17.7k):**
  - **Tier 0 (cheap):** headline+deck+topic for the ranked/surfaced set → the cards.
  - **Tier 1 (full article):** generate when a story **ENTERS the shown set** (tie to the ranking/
    forward-loop cycle) → **write-through cache** (use `narrative_drafts` or a cache table) → instant on click.
  - **Tier 2 (fallback):** on-demand generate+cache for long-tail deep links.
  - **Single-source → NO synth article** (sources-only stub).
- **Regenerate only on MATERIAL change** (fact-version stamp). Store: fact-version stamp + **per-claim
  provenance trace** (verifier computes it — persist for citations + corrections) + visible **updated-at**.
- **Re-measure Guard-C reject on `_v8`** (expect a big drop from 58% now giants are split).
- Report: **sample articles+decks+headlines across big/small/single → the publish-quality GO/NO-GO**;
  Guard-C rate; cache-table shape.

## 4. Source political lean — one-time, per-OUTLET (P2)
Classify the ~few-hundred outlets' lean (left/right/state) once → feeds All-Sides grouping. Tiny
LLM/curated pass, NOT per-article, NOT a corpus rerun.

## 5. Forward loop — ARM + verify (freshness) (P1)
- Arm at **~10–15 min** cadence (not hourly).
- **Held-out verify:** incremental vs full-batch **agreement rate**; a planted same-event article JOINs
  within one cycle; the hardened guards (corrob≥2, junk filter, single-vote-defer) hold live.
- **Embedding health:** lag, %-embedded-within-X-min, embedded-but-unclustered ≈ 0.

## 6. Janitor — ongoing supervised (P2)
Each armed night: send the gate scorecard + a sample of splits → analytics runs the Gate-A
golden/recall backstop → trusted-or-kill verdict.

## 7. Production DB connectivity — investigate, don't build yet (P2)
How does a DEPLOYED Worldwide reach this DB without a personal SSH tunnel — deploy on the box / managed
pooled connection / read-replica? Report the recommended path + effort.

## SECURITY (standing)
Rotate the exposed Cerebras/Groq keys (live, were in transcript).

---
## ANALYTICS OWNS (NOT db chat — boundary for clarity)
- Ranking + the new **recency-GATE** (a huge-but-old story must NOT lead the main section).
- The front-page + story-page **API**, the **event-hub (B+)** read-time grouping, the **number-gate** at display.
- Page **wiring** (cards: `thumbnail_url` image + deck; story page).
- The **eval gates + the GO/NO-GO** calls.

## PRIORITY / SEQUENCE
**P1 (do in order):** §1 enrichment-v2 (cheap, first) → §2 topic → §3 content-gen wiring+caching → §5 forward-loop arm.
**P2:** §4 source-lean · §6 janitor · §7 prod-DB.  **P3:** quote-disputed flag · geo-coords.
**The single GO/NO-GO that gates the product:** §3's article-quality sample.

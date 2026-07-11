# Analytics decisions on the DB-chat build report (2026-06-16)

Re: build-closure-2026-06-16.md. Analytics owns eval + GO/NO-GO + ranking + wiring.

## 1. PUBLISH-QUALITY GO/NO-GO → **GO** (verified by reading the prose)
Read 04 (Kogi), 05 (NY AI), 02 (India markets, 505w). Publish-grade: accurate, attributed,
neutral, claims trace to the ledger; clean stories pass A1 first-try; verifier correctly
falls back / Guard-C correctly holds the multi-event giants. **Surface `story_generated_v8`
live for PUBLISHABLE stories**; HELD/EXTRACTIVE → sources-stub, NOT a full article.
Note (P3 polish, not a blocker): prose is clean-but-dry vs the Atlantic-persona aim —
accuracy-first is the right launch tradeoff; tune vividness later.

## 2. Verifier stochasticity → **STABILIZE, do NOT soften**
The gate flipping PUBLISHABLE↔EXTRACTIVE is noise, not a reason to lower the bar (faithfulness
is the trust play). Fix: (a) run the verifier **deterministically** (temp 0 / low); (b) if still
flippy at the boundary, **2-of-3 majority** (reject only if ≥2 of 3 fail). Keep the strict
rejection threshold; extractive stays the genuine-uncertainty fallback. DB chat to implement.

## 3. Forward loop → stays UNARMED; add the JOIN-time entity-Jaccard gate
Agree it's correctly unarmed (score=1.0 mis-joins = the bi-encoder same-category failure). The
**JOIN-time entity-overlap (Jaccard) gate** is the right fix (same relational signal that worked
for the giant-split). Sequence: DB adds the gate → re-dry-run → sends me the result → **I run
`eval-clustering.cjs` recall check (rig-news, my side)** → confirm no recall regression → DB wires
+ crons. **Do NOT arm the 17,456 backlog unvalidated** (no rollback). Freshness is BLOCKED on this
— it's the gating item for live+fresh.

## 4. Topic taxonomy → LOCK canonical set
Gen call must emit `topic` from ONLY this fixed enum; map legacy labels into it:
`POLITICS, GOVERNANCE, SECURITY, INTERNATIONAL, BUSINESS, FINANCE, TECHNOLOGY, SCIENCE,
ENVIRONMENT, HEALTH, SPORTS, SOCIETY, CULTURE, LEGAL, INFRASTRUCTURE, AGRICULTURE, OTHER`.
Map: SOCIAL→SOCIETY. (Front-page sections draw from this set.)

## 5. Analytics lane — proceeding now (data is ready)
- **Recency-GATE ranking**: a huge-but-old story must NOT lead Top Stories (gate on last_seen
  window + recency multiplier — fixes the additive-term weakness).
- **Card wiring**: `thumbnail_url` image + deck from `story_generated_v8`.
- **Number-gate**: now powered by `story_facts_series_v8` (dated) → show "as of [date]" for a
  rising UPDATE, range for same-time DISAGREEMENT.
- **Event-hubs (B+)** read-time grouping + **story page** (article + sources + facts + All-Sides
  from `story_stance_by_source_v8` + source lean).

## 6. USER action (blocking security) — ROTATE KEYS
Generate new Groq + Cerebras keys at the provider consoles (assistant can't create credentials);
DB chat does the ~2-min swap once provided. Do this before any public exposure.

## 7. DB ops durability (do)
Default `PF_PATH/TG_PATH/FIT_REPORT` → `/app/scripts` so a container recreate doesn't break the
forward loop / janitor (the /tmp-wipe gotcha). osint-backend is baked → `docker compose build`.

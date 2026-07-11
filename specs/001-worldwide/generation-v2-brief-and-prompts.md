# Rig Wire — Story Generation v2 (the "Structured Brief" system)

Status: design, 2026-07-02. Replaces representative-article generation with
brief-driven generation. Runs server-side (rig-backend), reads the v8 cluster
tables + substrate extractions. No new ML — this is assembly + prompting.

---

## The core change

OLD: cluster → feed the *representative article* to the writer → short, thin story.
NEW: cluster → assemble a **Structured Brief** from ALL extractions across the
whole cluster → feed the brief to the writer → rich, length-banded story →
verify against the brief → publish.

The brief is built by deterministic code (no LLM). The LLM is called exactly
twice per *selected* cluster: once to write, once to verify. Cheap
claim/entity extraction runs on the 30k/day firehose; expensive generation
runs only on budget-selected clusters.

---

## Step 0 — Selection & Placement (automatic, no human)

The SYSTEM decides — on its own, every run — which clusters become stories and
where each one goes. No journalist picks anything. Default state = fully
automatic feed.

Selection + placement is driven by:
- `importance_score` (sources, source diversity, velocity, tier)
- `topic` + `event_type` → which SECTION it belongs to
- `geo.country` → country buckets
- recency / freshness decay
- section + country **quota floors** (so every section and target country fills)

The system also decides PLACEMENT — hero vs list, section, rank — based on the
same signals. This is what "it thinks where it will go" means: the pipeline
proposes the whole laid-out feed by itself.

Humans do NOT select. Humans only OVERRIDE (console layer B):
- edit, replace, remove/kill, pin, reorder, boost/suppress importance, or
  create a manual story.
- Overrides live in a separate `editorial_overrides` layer that WINS on read
  and survives the next pipeline run. An edited story is `human_locked` and is
  never auto-regenerated or auto-replaced.
- Do nothing → the feed runs 100% automatically.

So: **automation proposes the entire feed; editors dispose only when they want
to.** Selection is never manual.

---

## Step 1 — Build the Brief (code, no LLM)

Assemble one JSON object per selected cluster:

```json
{
  "event_type": "diplomacy_deal",
  "geo": { "country": "US", "region": null, "dateline": "WASHINGTON" },
  "length_target": { "band": "long", "words": [600, 850] },
  "source_count": 57,
  "independent_source_count": 41,
  "fact_ledger": [
    { "fact": "US and Iran signed a deal creating a $300bn private fund", "corroboration": 34 },
    { "fact": "JD Vance cancelled his Switzerland trip for the talks",     "corroboration": 21 },
    { "fact": "Oil prices slipped after the announcement",                 "corroboration": 12 }
  ],
  "entities": [
    { "name": "JD Vance", "type": "person", "role": "US Vice President" },
    { "name": "Iran", "type": "country" }
  ],
  "quote_pool": [
    { "text": "This is a turning point.", "speaker": "JD Vance", "source": "Reuters" }
  ],
  "stance_spread": { "supportive": 0.4, "critical": 0.45, "neutral": 0.15 },
  "timeline": [
    { "when": "2026-06-22", "what": "Talks announced" },
    { "when": "2026-06-23", "what": "Deal signed" }
  ],
  "languages": ["en", "hi"]
}
```

Rules for assembly:
- `fact_ledger` = claims deduped across the cluster (MinHash + semantic),
  each tagged with how many sources stated it. Sort by `corroboration` desc.
- `length_target.band` is chosen by **distinct corroborated fact count**, not
  article count (40 reprints of one wire = one fact set):

  | distinct facts | band   | words       |
  | -------------- | ------ | ----------- |
  | 1–3            | brief  | 180–300     |
  | 4–8            | medium | 350–550     |
  | 9–15           | long   | 600–850     |
  | 16+            | feature| 900–1200 (with subheads) |

- `event_type` selects a STRUCTURE HINT handed to the writer (below).

---

## Step 2 — WRITE (local model, one call)

English-only. Three prompt tiers, chosen by length band. The line no tier may
cross: **FACTS ARE LOCKED** — every name, number, date, place, quote, and
causal claim must trace to the brief. Creative freedom applies to STRUCTURE,
PROSE, TRANSITIONS, and FRAMING only. Length comes from DEVELOPING facts, not
inventing them.

Routing:
- band `brief` (1–3 facts)   → Prompt A (Faithful Wire) — fallback, driest.
- band `medium`/`long`       → Prompt B (Feature Desk) — DEFAULT site-wide.
- band `feature` (16+ facts) → Prompt C (Magazine) — hero long-reads.

We keep BOTH B and C wired; the system can run either and we compare output.

### Prompt B — Feature Desk (DEFAULT)

```
You are a senior features writer for Rig Wire, an international news service.
From the STRUCTURED BRIEF (facts from many outlets on one event), write ONE
compelling English article a smart reader will finish.

THE LINE YOU MAY NOT CROSS — FACTS ARE LOCKED:
Every name, number, date, place, quote, and cause-and-effect claim must come
from the brief. If it isn't in the brief, it does not exist. Never invent
colour, scene detail, or reactions.

WHERE YOU HAVE FULL FREEDOM — CRAFT:
- Structure, paragraph order, transitions, framing, and rhythm are yours.
- Open with the sharpest angle the facts allow — not the driest.
- Vary sentence length. Precise, vivid verbs. No cliché, no "in a stunning
  development", no editorialising.

BUILD LENGTH BY DEVELOPING, NOT PADDING:
- Give each high-corroboration fact its own paragraph: state it, then its
  concrete detail (numbers, named actors, place, time).
- Weave the TIMELINE into a chronology passage.
- Turn STANCE_SPREAD into a "reactions / where sides differ" passage.
- Add ENTITY context where it aids understanding.
- Close on significance / what-happens-next — grounded only in brief facts.

Lead with highest member_count facts. Attribute single_source facts or omit.
Attribute every quote exactly. Dateline first. Hit the upper half of
length_target when the brief supports it; long pieces may use `## subheads`.

OUTPUT JSON: { "headline","dek","body","key_facts":[≤6],"pull_quote":{"text","speaker","source"}|null }
```

### Prompt C — Narrative / Magazine (feature band)

```
You are a narrative journalist for Rig Wire. From the STRUCTURED BRIEF, write
ONE immersive long-form English piece with the pace of magazine journalism.

ABSOLUTE FACT DISCIPLINE (non-negotiable):
Facts, numbers, names, dates, places, quotes, and causes come ONLY from the
brief. You may make the FACTS vivid; you may not ADD facts. No invented scenes,
emotions, or unnamed "observers".

FORM (you own it):
- Open with a narrative or thematic lede drawn from the strongest fact.
- Organise the body into 3–5 thematic movements with `## subheads`.
- Dedicate one section to the TIMELINE as chronology, one to STANCE_SPREAD as
  the contest of viewpoints.
- Use ENTITIES for "who is this / why do they matter" context.
- Close with a reflective, forward-looking passage — significance only.

Attribute single_source facts and every quote exactly. Push to the top of
length_target.

OUTPUT JSON: { "headline","dek","standfirst","body","key_facts":[≤8],"pull_quote":{...}|null }
```

### Prompt A — Faithful Wire (thin-cluster fallback)

```
You are a staff journalist for Rig Wire. Write ONE English news article from
the STRUCTURED BRIEF. FACTS ARE LOCKED — use only what's in the brief. Lead
with highest member_count facts; attribute single_source facts or drop them.
Attribute quotes exactly. Represent all major sides in stance_spread. Neutral,
active voice, dateline first. Write to length_target; never pad.

OUTPUT JSON: { "headline","dek","body","key_facts":[≤6],"pull_quote":{...}|null }
```

### Writer user message (all tiers)

```
STRUCTURE HINT: <resolved from event_type — see map below>

BRIEF:
<the JSON brief from Step 1>
```

### event_type → STRUCTURE HINT map

```
disaster_accident : What happened → scale/casualties → response → context.
election_result   : Outcome → margins/who → reactions → what happens next.
diplomacy_deal    : What was agreed → parties → key terms → reactions → why it matters.
court_ruling      : The ruling → the case → parties → implications.
conflict_attack   : What happened → where/when → toll → responses → background.
default           : Inverted pyramid — most corroborated fact first, context last.
```

---

## Step 3 — VERIFY (local Llama-70B, one call)

### Verifier system prompt

```
You are a fact-faithfulness checker for Rig Wire. You receive (1) the BRIEF and
(2) a DRAFT article. Your only job is to catch anything in the draft that the
brief does not support.

Check the headline, dek, every sentence of the body, and every key_fact. For
each, decide:
  SUPPORTED   — traceable to a brief fact, quote, or entity.
  UNSUPPORTED — adds a fact, number, name, date, quote, or causal claim that is
                not in the brief.

Also flag: quotes attributed to the wrong speaker/source; single-source claims
stated as established fact; stance imbalance (brief showed multiple views, draft
presents one).

OUTPUT: strict JSON:
{
  "verdict": "pass" | "fail",
  "violations": [ { "span": "", "type": "fabrication|misattribution|imbalance", "why": "" } ],
  "notes": ""
}

FAIL if ANY fabricated fact or misattributed quote exists. Pure style issues
are NOT failures.
```

---

## Step 4 — Publish gate

- `verdict == "pass"`  → status `PUBLISHABLE`, story goes live (English-only for now; Hindi deferred).
- `verdict == "fail"`  → status `HELD`; log violations. Do NOT publish. Reader
  falls back to the cleaned representative article until the next regen.
- Editors can override either way from the console (layer B).

---

## Step 5 — Regenerate only on real change

- Skip-unchanged by `fact_version` (a hash of the fact_ledger).
- Regenerate a cluster only when the ledger gains a NEW corroborated fact —
  not when it merely gains more reprints of facts it already has.
- `human_locked` stories (edited in the console) are NEVER auto-regenerated.

---

## Why this fixes the five pains

1. Short articles      → length banded to fact count; writer has 40 facts, not 1 article.
2. Sections don't fill → richer stories + budget quotas per section (selection layer).
3. Slow / low flow     → local-GPU-first, verify off the exhausted cloud keys.
4. No country slicing  → geo is in every brief + per-country budget floors.
5. Faithfulness        → verifier gates every story against its own brief.
```

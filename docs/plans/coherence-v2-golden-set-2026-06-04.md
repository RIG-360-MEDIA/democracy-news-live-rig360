# Coherence v2 — Golden Set Spec (2026-06-04)

**From:** analytics chat (Aryan) · **To:** DB chat (sampling) + Aryan (drafting) + user (final confirm)
**Purpose:** the frozen regression suite for the post-launch coherence workstream (Leiden-levels → CSAI-style LLM judge → Matryoshka pilot). Without this, every step's gate is guesswork. With it, every prompt iteration, threshold lock, and approach comparison is measurable against the same ground truth.

**Rule:** built ONCE, then frozen. Every change to coherence v2 is evaluated against this set. No tuning the golden set to make a method look better — that's the whole point of "golden."

---

## Scope decision (locked off the session's findings)

5 anchors were enough to validate the diagnostic that killed the entity-pair signal. They are NOT enough to evaluate a real coherence judge. The data we've seen this session has at least **16 distinct patterns** that need protection, and one outlier per pattern fools the eval.

**Target: ~50 hand-labeled clusters.** 3+ examples per pattern. Stratified by size and core. Two-pass labor split (DB samples + Aryan drafts + user confirms) keeps the user's time to ~2 hours total.

---

## The 16-pattern taxonomy

### Patterns that MUST split (bad cases — the judge must flag)

| # | Pattern | Diagnostic signature | Target count |
|---|---|---|---|
| 1 | Pure actor-pile | High `article_count`, mid-low core, one bridge actor across unrelated events (EU-Mexico shape) | 5 |
| 2 | Theme-pile with dominant core | A real story (~40-60% of articles) + thematic halo of unrelated items (Musk-OpenAI shape) | 5 |
| 3 | Format/template pile | §2b's family — markets, horoscope, exam result, share price | 5 |
| 4 | Coverage-bias / region-wrong | `subject_country` is the publisher's mode, not the story's actual location | 5 |
| 5 | Cross-language fusion | English event glued to unrelated vernacular event via weak entity bridge (verify exists; if not found, drop bucket) | 2 |

**Subtotal: 22 must-split**

### Patterns that MUST NOT split (good cases — the judge must spare)

| # | Pattern | Diagnostic signature | Target count |
|---|---|---|---|
| 6 | True mega-event | High `article_count`, high core, one ongoing world story (US-Iran, Israel-Lebanon) | 5 |
| 7 | Tight single-event high-core | <500 articles, core ≥0.7, one clean event (cruise, Op-Sindoor) | 5 |
| 8 | Temporal arc | One ongoing story across ≥10 days (long court case, election cycle, war coverage) | 3 |
| 9 | Multilingual mixed (legit) | en + te/hi/ml members all about the same event | 4 |
| 10 | Concept-anchored low-core | Subject is a concept NER can't extract (disease, abstract event) — core looks low but the story is real (§A finding) | 3 |
| 11 | Multi-actor legitimate | Multiple top entities all genuinely co-involved (JPMorgan court case, India-Pak Op-Sindoor) | 3 |

**Subtotal: 23 must-spare**

### Edge cases (explicit coverage)

| # | Pattern | Why it's here | Target count |
|---|---|---|---|
| 12 | Borderline ambiguous | Honest disagreements between reasonable humans — the prompt's calibration test | 3 |
| 13 | Tiny stories | `article_count <20` — gating shouldn't touch them, confirm | 2 |
| 14 | Vernacular-only | Pure te/hi/ml clusters with no English — multilingual prompt has to handle | 2 |

**Subtotal: 7 edge cases**

**Grand total target: ~52 clusters.** OK to land 45–55 — exact count matters less than coverage of all 16 patterns with ≥3 each (≥2 for the smaller buckets).

---

## Sampling strategy (DB chat — pure SQL, no judgment)

Two-pass:

### Pass A — explicit knowns (use what we already identified this session)

Pull these by `story_id` directly. These are the anchors we trust:

- **EU-Mexico Trump pile** — `4ded16a6` (pattern 1)
- The other 5 hand-flagged piles from the co-occurrence diagnostic — `76c64c8e`, `224ee8d1`, `c0a31ab7`, `404c6ad8`, `2534e314` (pattern 1)
- **US-Iran mega** (the 4310-article cluster from the live read) (pattern 6)
- **Israel-Lebanon mega** (pattern 6)
- **EU-Mexico transatlantic if separate**, otherwise count once
- **Cruise / hantavirus** (pattern 7)
- **Op-Sindoor India-Pak** core ~0.82 (pattern 7, 11)
- **Google decision** core ~0.72 (pattern 7)
- **Musk-OpenAI** 192 articles (pattern 2)
- **Coal India share price** (pattern 3)
- **Anand James top picks**, **Gainers & Losers**, **horoscope** clusters (pattern 3)
- The 14 §B title-flag known piles (split across patterns 3, 4)
- The Layer 2 diagnostic's classified cases (re-use the 27 already classified — already done work)

That should account for ~25-30 of the target.

### Pass B — stratified random sample for residual buckets

For the remaining buckets (5 cross-language, 8 temporal arc, 9 multilingual mixed, 10 concept-anchored, 12 borderline, 13 tiny, 14 vernacular-only), sample candidates by SQL filter, then Aryan reads and selects:

```
Bucket 5 — cross-language fusion:
  WHERE language_count >= 2
    AND article_count >= 50
    AND title_coh < 0.3
  ORDER BY random()  LIMIT 15  → Aryan picks ~2

Bucket 8 — temporal arc:
  WHERE span_hrs > 240  (>10 days)
    AND article_count >= 30
    AND entity_core_cov > 0.5
  ORDER BY span_hrs DESC  LIMIT 15  → Aryan picks ~3

Bucket 9 — multilingual mixed legit:
  WHERE language_count >= 3
    AND entity_core_cov > 0.5
  ORDER BY random()  LIMIT 15  → Aryan picks ~4

Bucket 10 — concept-anchored low-core:
  WHERE entity_core_cov < 0.4
    AND article_count BETWEEN 20 AND 100
    AND title_coh > 0.4  (high title coherence = real story despite low entity-core)
  ORDER BY random()  LIMIT 20  → Aryan picks ~3

Bucket 12 — borderline ambiguous:
  Whichever ~3 Aryan finds hardest to classify during drafting

Bucket 13 — tiny:
  WHERE article_count BETWEEN 5 AND 15
  ORDER BY random()  LIMIT 10  → Aryan picks 2

Bucket 14 — vernacular-only:
  WHERE language_count = 1 AND primary_language IN ('te','hi','ml','kn','ta','bn')
    AND article_count >= 10
  ORDER BY random()  LIMIT 15  → Aryan picks 2
```

### For each sampled cluster, DB chat returns (no judgment, raw output):

```
story_id
representative_title
article_count
title_coh
entity_core_cov
top_entity_share
independent_source_count
span_hrs
subject_country
primary_language
language_count
top_5_entities (with mention counts)
sample_member_titles (15 — spread across time + sources, include vernacular if multilingual)
sample_member_primary_subjects (15, aligned with titles)
```

One JSON line per cluster. ~50 lines total. **Raw output, no analytics chat in the figure path** (per CLAUDE.local.md number-handling protocol).

---

## Labeling schema (Aryan drafts, user confirms)

For each cluster, the golden record:

```yaml
story_id: <uuid>
pattern: <one of the 16 numbered patterns>
verdict: stable | piled | theme-cluster | template | mixed
should_split: true | false
expected_sub_events:  # ONLY if should_split=true
  - title: "Trump pulls 5000 troops from Germany"
    approx_article_count: 80
    key_entities: [trump, germany, pentagon, merz]
  - title: "King Charles US state visit"
    approx_article_count: 60
    key_entities: [king_charles, trump, melania]
  # ...
expected_outliers:  # article_ids that shouldn't be in this cluster at all
  - <article_id>: "Marlon Williams concert — unrelated"
why_this_verdict: |
  One-paragraph human reasoning — what in the member titles/entities drove the call.
  Used to debug prompt failures: when the LLM judge disagrees, the disagreement is
  traceable to a specific reasoning step.
confidence: high | medium | low  # low = belongs in bucket 12 (borderline)
```

The `why_this_verdict` field is non-negotiable. Without it, prompt failures are mysteries.

---

## Two-pass labor split (saves user's time)

| Step | Owner | Time | Output |
|---|---|---|---|
| Pass A explicit knowns + Pass B stratified samples | DB chat | ~2 hours | 50 JSON records, raw |
| Draft verdicts + sub-structures + reasoning | Aryan (analytics chat) | ~3-4 hours | 50 YAML records, draft labels |
| Confirm or override drafts | User | ~2 hours | 50 confirmed YAML records, frozen |
| **Total user time** | | **~2 hours** | golden set frozen |

The disagreements between Aryan's drafts and user's confirms are the MOST IMPORTANT records — they reveal where the model's intuition diverges from product intent, which is exactly where the LLM judge's prompt will struggle too. Capture them as `confidence: low` + a `disagreement_note` field.

---

## Storage

`docs/golden-sets/coherence-v2/`
- `golden-set-2026-06-04.yaml` — the 50 confirmed records
- `sampling-log.md` — DB chat's pull queries + counts
- `drafts/` — Aryan's pre-confirmation drafts (kept for the disagreement audit)
- `README.md` — how to use the set (eval harness, regression rules)

**Frozen rule:** once `golden-set-2026-06-04.yaml` is confirmed, it is NOT modified except to ADD new patterns we discover later (with a new dated file: `golden-set-2026-06-XX-additions.yaml`). Removing or relabeling existing records requires a written rationale checked into the same folder. **No silent tuning.**

---

## Use across steps 1 → 2 → 3

Every method gets scored on the same 50 with the same metrics:

- **Catch precision** (of must-split clusters, how many did the method flag correctly?)
- **Spare precision** (of must-spare clusters, how many did the method leave alone?)
- **Sub-event match** (when the method splits, do its sub-events align with the labeled expected_sub_events?)
- **Outlier match** (when the method flags outliers, do they overlap with labeled expected_outliers?)
- **By pattern** (break the above down by the 16 patterns — find the pattern-specific failure modes)

**Decision gate to advance to next step:** method must hit ≥80% catch precision + ≥90% spare precision + ≥60% sub-event match on the golden set. Below those — keep iterating on the current step, don't escalate.

---

## What this is NOT

- Not a training set. We are not fine-tuning anything on it. It is purely an evaluation set.
- Not exhaustive. New patterns will surface in production; add them as discovered.
- Not subjective. Every record has a `why_this_verdict` field — disagreements are traceable.
- Not Aryan-only. The user confirms every record. Disagreements are first-class data.

---

→ **First step:** DB chat runs the Pass A pulls (explicit knowns by story_id), then the Pass B stratified samples. Reports raw JSON. Aryan drafts labels off the raw. User confirms. Set is frozen. Then Step 1 (Leiden hierarchy diagnostic) begins.

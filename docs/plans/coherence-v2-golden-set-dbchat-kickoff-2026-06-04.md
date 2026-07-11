# DB Chat Kickoff — Golden Set Sampling (2026-06-04)

**Paste to DB chat. READ ONLY, SAMPLE ONLY. Raw output throughout. No analytics in the number path.**

Full spec: `docs/plans/coherence-v2-golden-set-2026-06-04.md`. This kickoff is the executable scope for your first run — sampling only. No fixes, no migrations, no flags.

Goal: assemble ~50 surfaced multi-article clusters across 16 known patterns, raw JSON, so Aryan can draft labels and the user can confirm. The golden set is then frozen as the regression suite for the post-launch coherence v2 workstream (Leiden levels → CSAI LLM judge → Matryoshka pilot).

This is foundation work — every coherence-v2 method gets evaluated against what you sample here. Sampling discipline matters: don't substitute clusters, don't filter on "looks suspicious," follow the rules verbatim so the eval is honest.

---

## PASS A — explicit knowns (pull these by story_id directly)

For each story_id below, dump the full record (schema at the bottom of this file). If a story_id is no longer present in `analytics.story_clusters` (status != 'active' or suppressed), report that and skip — don't substitute.

**Actor-piles (pattern 1) — from the co-occurrence diagnostic:**
- `4ded16a6-a158-434e-af08-6afc152c9741` — EU-Mexico Trump pile
- `76c64c8e` (find by prefix)
- `224ee8d1`
- `c0a31ab7`
- `404c6ad8`
- `2534e314`

**Mega-events (pattern 6):**
- the largest active US-Iran cluster (~4310 articles, Iran top entity ~3093)
- the largest active Israel-Lebanon cluster
- the largest active EU-trade cluster if distinct from the Trump pile

**Tight high-core (pattern 7):**
- the cruise / hantavirus cluster
- the Op-Sindoor India-Pak cluster (core ~0.82)
- the Google decision cluster (core ~0.72)
- one more high-core cluster of your choice from the top of `entity_core_cov` rank, article_count 30–500

**Theme-pile (pattern 2):**
- the Musk-OpenAI / Altman cluster (~192 articles, Elon Musk top entity ~88)

**Format piles (pattern 3) — from §B title-flag calibration:**
- Coal India share price cluster
- Anand James top picks cluster
- Gainers & Losers cluster
- one horoscope cluster
- one exam/result cluster (Kerala Plus Two or NEET UG)

**Coverage-bias / region-wrong (pattern 4):**
- 5 stories from the §B 14-known hand-flag list that aren't already covered above — Aryan provides the list separately if needed; in the meantime use top 5 by `subject_country` mismatch you can identify by your own SQL (where `subject_country` looks wrong relative to top entity countries)

**Reuse Layer 2 work:**
- The 27 classified clusters from `docs/plans/story-quality-diagnostic-2026-06-04.md` Layer 2 — re-dump them in the schema below. Already-classified, free coverage.

**Pass A target:** ~25-30 records.

---

## PASS B — stratified samples for residual buckets

For each bucket, run the SQL filter, pull `LIMIT N` ordered as specified, return all in the schema below. Aryan picks the final ~K from each pull during drafting (more than needed is fine — overdraw is cheaper than re-sampling).

### Bucket 5 — cross-language fusion (target 2, draw 15)
```sql
WHERE is_suppressed = false
  AND article_count >= 50
  AND title_coh < 0.30
  AND language_count >= 2
ORDER BY random()
LIMIT 15
```

### Bucket 8 — temporal arc (target 3, draw 15)
```sql
WHERE is_suppressed = false
  AND span_hrs > 240         -- >10 days
  AND article_count >= 30
  AND entity_core_cov > 0.5
ORDER BY span_hrs DESC
LIMIT 15
```

### Bucket 9 — multilingual mixed legit (target 4, draw 15)
```sql
WHERE is_suppressed = false
  AND language_count >= 3
  AND entity_core_cov > 0.5
ORDER BY random()
LIMIT 15
```

### Bucket 10 — concept-anchored low-core (target 3, draw 20)
```sql
WHERE is_suppressed = false
  AND entity_core_cov < 0.4
  AND article_count BETWEEN 20 AND 100
  AND title_coh > 0.4
ORDER BY random()
LIMIT 20
```

### Bucket 13 — tiny (target 2, draw 10)
```sql
WHERE is_suppressed = false
  AND article_count BETWEEN 5 AND 15
ORDER BY random()
LIMIT 10
```

### Bucket 14 — vernacular-only (target 2, draw 15)
```sql
WHERE is_suppressed = false
  AND language_count = 1
  AND primary_language IN ('te','hi','ml','kn','ta','bn','mr','gu','pa')
  AND article_count >= 10
ORDER BY random()
LIMIT 15
```

**Buckets 11 (multi-actor) and 12 (borderline)** — Aryan selects during drafting from Pass A + Pass B output; no separate pull required.

**Pass B target:** ~85 records drawn, ~14 selected by Aryan during drafting.

---

## Schema (every record, both passes)

Return one JSON line per cluster. Save the full dump as `scratch/sq/golden_set_2026-06-04_raw.jsonl`. Don't pretty-print; jsonl per line.

```json
{
  "story_id": "<uuid>",
  "representative_title": "<rep title verbatim>",
  "article_count": <int>,
  "title_coh": <float>,
  "entity_core_cov": <float>,
  "top_entity_share": <float>,         // top entity mentions / article_count
  "independent_source_count": <int>,
  "span_hrs": <float>,
  "subject_country": "<ISO2 or null>",
  "primary_language": "<code>",
  "language_count": <int>,
  "first_seen": "<iso8601>",
  "last_seen": "<iso8601>",
  "top_5_entities": [
    {"name": "iran", "mention_count": 3093, "type": "GPE"},
    {"name": "donald trump", "mention_count": 1469, "type": "PERSON"},
    // ...
  ],
  "sample_member_titles": [
    // 15 titles, spread across:
    //   - the time range (oldest, midpoints, newest)
    //   - sources (don't pull 15 from one outlet)
    //   - languages (if multilingual, include vernacular members proportionally)
    // For each: {"article_id", "title", "source_name", "published_at", "language", "primary_subject"}
    {"article_id": "...", "title": "...", "source_name": "...", "published_at": "...", "language": "en", "primary_subject": "..."},
    // ... 14 more
  ],
  "pull_bucket": "A_explicit" | "B_5_crosslang" | "B_8_temporal" | "B_9_multiling" | "B_10_concept" | "B_13_tiny" | "B_14_vernacular",
  "pull_query_id": "<short id of the SQL block above, for the audit log>"
}
```

**`sample_member_titles` sampling rule** (this matters — bad sampling poisons the labels):
- Stratify across time: ~5 from first 25% of `span_hrs`, ~5 from middle 50%, ~5 from last 25%.
- Limit to ≤3 from any single `source_name`.
- For multilingual clusters, include vernacular members in rough proportion to their share (e.g. if 30% te, ~4-5 te titles in the 15).
- Pull `primary_subject` alongside the title — it's the readable English anchor for vernacular titles.

---

## Sampling log

Save `scratch/sq/golden_set_2026-06-04_sampling_log.md` recording:
- The exact SQL you ran per bucket
- Counts returned per bucket
- Any story_ids in Pass A you couldn't find + why
- The total wall-clock + total `story_member` reads

The log is part of the audit trail. If the golden set ever needs to be regenerated or extended, the log shows exactly what was sampled and how.

---

## Out of scope for this kickoff

Do NOT:
- Label, classify, or judge any cluster (Aryan does that)
- Drop or modify any cluster in `analytics.story_*`
- Skip clusters that "look bad" (sampling bias kills the eval)
- Substitute different clusters because a sampled one looks ambiguous (ambiguous is the point of bucket 12)
- Filter out story_ids that are vernacular-only, format-pile-flagged, or rescue-rescued — they all need coverage

---

## Output deliverables

Three files into `scratch/sq/`:
1. `golden_set_2026-06-04_raw.jsonl` — the ~115 records (Pass A ~30 + Pass B ~85), one per line, full schema
2. `golden_set_2026-06-04_sampling_log.md` — queries + counts + audit notes
3. `golden_set_2026-06-04_summary.md` — one-page summary: count per bucket, any sampling issues, any Pass A misses

→ **First reply: ping Aryan when the three files are written. Aryan reads them, drafts the ~50 confirmed labels with `why_this_verdict` reasoning, user confirms, golden set is frozen. Then Step 1 (Leiden hierarchy diagnostic) begins.**

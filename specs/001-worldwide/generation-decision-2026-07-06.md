# Worldwide Generation — Decision Record (2026-07-06)

Outcome of a long investigation into "why do Worldwide articles read thin?"
Evidence-backed. Supersedes the earlier "clustering is a pile / retreat to
single-article" hypotheses — both were wrong (see §2).

---

## TL;DR
1. **v9 clustering is good** — coherent, multi-source, multilingual single-event clusters.
2. **The real bug was in the brief-builder**, not the clusters: it unioned
   `story_cluster_members_v8` across ALL historical `run_id`s, gluing 9 days of
   snapshots into a fake "pile." **Fix = filter members to the cluster's current
   `run_id`.** This one bug caused every "confabulation" false alarm in the probe.
3. **The writer is faithful** on a clean run-scoped brief. (Suspected fabrication
   3× → wrong 3×; the facts were in the polluted brief.)
4. **Length ∝ distinct information.** Forcing length past the material makes the
   model fabricate. A single 51-source event is honestly ~1,000 words.
5. **The verifier is the one broken component** — returns `verdict=None` every run
   (parse failure) and, as a 7B, floods false positives. This is the next build.

---

## §1 — Clustering (v9) is healthy
- Live runs are `cluster_v9/pure+recall/v4/leiden-res1.0/_v8`, run_ids `1783xxxxx`.
- Example: run-scoped Balogun cluster = 20 members, ALL the same event
  ("red-card suspension lifted"), across 8+ languages. Textbook coherence.
- Biggest current cluster: 51 members, "U.S.–Iran talks pause for Khamenei funeral."
- Apparent "fragmentation" (same event in N clusters) was an artifact of querying
  across run_ids — each run mints its own story_id for a live event. Scope to one run.

## §2 — THE BUG: cross-run membership pollution (fixed)
- `story_cluster_members_v8` is keyed per `(run_id, story_id, article_id)`.
- The brief-builder queried members by `story_id` ONLY → accumulated every run's
  membership. Stale cluster `ec7b08c0` had members from **7 run_ids** (India IT +
  Korea KOSPI + US S&P + AI-bubble) → a fake pile.
- **FIX (verified):** `AND m.run_id = <cluster's run_id>` in the membership query.
  Implemented in `scratchpad/_dump_run.py`. **MUST be ported into production
  `src/lib/worldwide` brief-building and the pipeline `_v2_brief_native.py` /
  `_dump_brief.py`.**
- Consequence: every "KOSPI / Micron / Hormuz confabulation" flagged during the
  probe was actually **faithful** — those facts were in the polluted brief.

## §3 — The writer is faithful (on a clean brief)
- Verified repeatedly by grepping the brief: joint-US-Israeli strike, Zahra
  Haddad-Adel, Operation Epic Fury, Qom/Najaf/Karbala/Mashhad, Araghchi, Katz
  "marked for death", Putin "cynical assassination", Medvedev, Guterres, Hormuz —
  all present in the source material.
- 7B verifier's "violations" were false positives on clean briefs too.

## §4 — Length is a function of distinct information
- Qwen2.5-7B (local 4090): ~700 words natural (small model wraps early).
- gpt-oss-120b: ~950–1,030 words natural on the same brief.
- **Forcing 957 → 1,077 induced fabrication + self-contradiction:** invented
  "Turkish PM Sharif" (Sharif is in brief, "Turkish" is not — he's Pakistani),
  "July 3–5", "signed fifteen days earlier", "July 9 burial", and escalated the
  brief's "wounded" into "killed his son Mojtaba" while §7 called Mojtaba the living
  successor. Also regressed dynamic subheads → generic numbered ones.
- **Rule: don't demand length past the material.** A 51-source single event ≈
  1,000 words. Longer requires a genuinely bigger story (multi-week saga), not a
  bigger word mandate.

## §5 — THE RECIPE (shippable)
`run-scoped clean brief → short braided-Atlantic prompt → gpt-oss-120b → ~950-word,
dynamic-subhead, near-faithful long-read.`
- Winning prompt: `scratchpad/_groq_explainer.py` PROMPT_D (braided-Atlantic:
  facts-frozen + date-discipline + timeline-braided + dynamic story-specific
  subheads + per-section length). Keep it SHORT — the giant Atlantic prompt (~3k
  tokens) self-starved the output on Cerebras and truncated.
- Best sample: "A Nation Mourns Under Fire" — 957 words, 7 dynamic subheads, 1
  inferred date ("July 9") as the only slip.

## §6 — Infra reality (as of 2026-07-06)
- **Cloud pool degraded:** Groq `gpt-oss-120b` daily-token-exhausted; 10 of 31 Groq
  keys `organization_restricted` (a multi-free-org farm that Groq flagged — a paid
  tier is the durable fix). Cerebras `gpt-oss-120b` live (used for these runs).
- **Local:** TRIJYA-7 (RTX 4090, free) has Qwen2.5-7B + 32B in HF cache, runnable via
  `~/senv` transformers — full token control, zero keys. TRIJYA-8 runs TabbyAPI
  (Qwen3-14B) but the workstation is in active use (GPU contended).
- **STEP-3 rollups (`story_facts_v8` etc.) are stale** for recent stories — build
  briefs from the per-article layer (`article_claims/numbers/events/quotes/stances`
  + `articles.summary_executive`), UNION'd across run-scoped `substrate_status='ok'`
  members. (This is what `_dump_run.py` does.)

## §7 — Verifier: root-caused and fixed (gate still to wire)
- **Symptom:** `verdict=None` every run — looked like the verify JSON never parsed.
- **Root cause (diagnosed):** NOT a broken verifier. It was **token starvation.**
  gpt-oss is a reasoning model; verifying a ~1,000-word article emits a large
  reasoning trace BEFORE the JSON. The verify call was given only `max_tokens=2000`,
  so the budget was spent on reasoning and the content JSON was never emitted →
  empty content → `verdict=None`.
- **Proof the verifier itself is correct:** in isolation (planted "Xi Jinping
  attended" fabrication among real facts), it returned clean JSON, `verdict:"fail"`,
  caught exactly the fabrication, passed the real facts. `finish_reason:stop`.
- **Fix (applied):** bump verify `max_tokens` to 8000 → it now returns real
  parseable verdicts on full articles. (Use gpt-oss-class for verify, NOT a 7B —
  the 7B floods false positives.)
- **Still to wire:** the **repair-or-hold gate** — on a real violation, feed the
  flagged span back for a repair pass, or hold the story (fall back to cleaned
  original). That's what turns the working verifier into an actual safety gate.

## §8 — Two parser-robustness follow-ups (surfaced late)
- The writer intermittently emits `body` as a nested object/array or numbered
  sections; the JSON extractor sometimes recovers only the last section (a 163-word
  "article" that was really just "## 8."). **Fix: a robust body extractor** (unwrap
  nested `body.body`, join dict/list sections, and match the OUTER JSON object, not a
  greedy inner one).
- The aggressive length-push prompt ("8-9 sections / 200-word floor") **regressed
  dynamic subheads → generic numbered ones** AND induced fabrication (§4). Keep the
  957-recipe prompt; do not over-mandate length.

## Production port-list
1. Add the `run_id` filter to the real brief-builder (§2). **Highest priority.**
2. Adopt the §5 recipe (short braided prompt, gpt-oss-class model, no forced length).
3. Build the §7 verifier gate.
4. Move generation off the free-key farm to a paid tier (or local 4090) for
   reliability (§6).

## Number-handling note
All figures in this doc were confirmed by grepping the actual brief / raw tool
output; the one unconfirmed value ("July 9" burial) is tagged as a model inference,
not a brief fact.

# Content Generation — Design (v1: single-source-first, generate-then-verify, append-versioned)
**From:** analytics chat (Aryan) · **Date:** 2026-06-03 · **Reads:** the live
`analytics.story_*` layer + enrichment (the fact ledger). **Status:** design — build is
gated VERIFIER-FIRST (see §6). Runs parallel to the 4a/4b launch (reads the frozen story
layer, touches no surfacing/forward-mode).

> **The one mental model:** a generated article is a **cached rendering of a cluster's
> fact-ledger**, keyed to the stable `story_id`, re-rendered only when the facts
> *materially* change. The **cluster is truth; the article is derived + disposable.**
> Generate from the **merged fact ledger** (corroborated facts + verbatim quotes +
> source claims), NEVER by blending raw article texts. Every render is gated by the
> verifier before it ships.

---

## 1. Scope & cost (winners-only)
Generate **only for surfaced winners** (`is_template_family=false` AND surfaceable per
the §2b/rescue rule) — a few hundred stories/day, NOT the 124K corpus. **Cache**, reuse
across placements, **regenerate only on material change** (§3). One house voice
(Worldwide is generic). Pool-bounded: generation + verification are LLM-heavy and the
Groq/Cerebras pool maxes by midday — winners-only + cache + regen-only-on-change is what
keeps it affordable. Log when the budget caps a run (no silent skips).

## 2. What it generates FROM (grounded inputs, with provenance — not raw-text blending)
For a story, assemble the **merged fact ledger** from the enrichment we built:
- **`story_facts`** — corroborated numbers (value + unit + `citing_article_ids` +
  `member_count`). The numbers the article may state, each traceable to source.
- **`story_quotes`** — verbatim quotes + speaker + article_id. Quotes it may use.
- **member articles** (`story_cluster_members` → `articles`) — the source texts to
  generate *from* and verify *against*.
- **`story_stance` / `story_geo` / `story_timeline`** — framing/context.
The prose **connects grounded facts**; it does not invent. Single-source-first (most of
the corpus, lower risk): faithful natural rewrite of one article + archive context,
invent nothing. Multi-source synthesis (v1.5): weave the shared ledger.
- **Numbers disagree across sources → report the RANGE, never pick** ("82–90 dead").
  The ledger stores both; the article states the spread. (Mirrors the clustering rule:
  divergence is reported, never resolved by fiat.)

## 3. The regeneration trigger — MATERIAL STORY-STATE CHANGE (not just numbers)
The trigger is NOT "a new article arrived" (regenerates constantly, costs a fortune).
It's "**did the story's STATE materially change?**" — and *state* is broader than facts.
Computed via a **story-state stamp** = hash of {facts + key quotes + **stance/framing
mix** + **development stage** + dominant actors + source-count band}. Regenerate when ANY
of these move materially — using the signals we can actually MEASURE (not a vague "feels
different"):
| Change | Detected via | Regen? |
|---|---|---|
| New article, **nothing moved** | stamp unchanged | **No.** Bump `source_count`, add member. *(common case)* |
| **New fact / changed number** (82→90) | `story_facts` ledger diff | **Yes** |
| **New development / beat** (trapped→rescued, arrest, verdict) | new event-type / new actor in members | **Yes** |
| **Perspective / framing shift** (neutral → wave of critical coverage; opposing side responds) | `story_stance` distribution shift + new high-prominence actor | **Yes** |
| **Coverage surge** (10 → 50 sources; story escalated) | `independent_source_count` jumps a band | **Yes** |
| **Correction / retraction** in sources | fact/quote removed or changed | **Yes** |
| Two stories **merge** | — | Regenerate from merged ledger; old `story_id` → `redirected_to` survivor (links don't break) |
| Story **splits** (rescue/re-cluster) | — | One article per resulting `story_id` |
**Why state, not just facts (the correction):** a number is exact; a *perspective* shift
is fuzzier — so we trigger on its **measurable proxies** (stance-mix shift, new salient
actor, coverage surge), not on a subjective "the framing feels different." That keeps the
trigger from either never firing or firing constantly. Still cheap: most new articles move
none of these → no regen.

## 4. ⭐ Storage = APPEND, not overwrite (version history built in from day 1)
**Generated articles are APPENDED, never overwritten.** Each row keyed by
`(story_id, fact_version, generated_at)`:
- `story_id` (stable identity — URL/bookmark never breaks even as content evolves),
- `fact_version` (the ledger hash it was generated from),
- `generated_at`, `headline`, `body`, `verifier_status`, `source_fact_ids`.
The **current** article = latest verified version for that `story_id`. Old versions
**retained**, not discarded.
**Why append (the trust argument):** a news product that silently rewrites articles with
no trail is exactly what readers/journalists distrust. "Updated" transparency is a trust
feature, not overhead. Append keeps both options open (show only latest, OR show the
trail); **overwrite is the one-way door** — expensive to retrofit, so decide it now =
append. Cost is a little storage; trivial vs the trust.
This makes **article version-history (feature a) nearly free** — the UI can show
"updated N times" / a diff ("toll revised 82→90") off the appended versions.

## 5. Headline on regeneration — evolves with facts, stability-biased
- Headline is **display**, `story_id` is **identity** — the headline can change on a
  material regen; the ID never moves (URL/bookmark safe).
- **New lead fact → new headline** ("8 dead" → "90 dead, deadliest mine blast in a
  decade"). **Minor body-only update → KEEP the headline stable** (a churning headline
  breaks user recognition). Headline regeneration follows the same material-change logic
  as the body, but biased toward stability on the lead.

## 5b. Ranking — the automated editor (which stories push, separate from generation)
§2b is the **bouncer** (real story vs category-pile); ranking is the **editor** (which
real stories reach the top). §2b-flagged blobs never enter the pool. Each surfaceable
story gets a score:
- **Independent source count** — distinct non-wire outlets (the strongest "big deal"
  signal; why we wire-dedup).
- **Importance** — v1 proxy = independent_source_count; v1.5 composite (source diversity
  + claim/number density + entity prominence).
- **Freshness** — recency, time-decayed (news ages fast; old stories sink).
- **Velocity** — is it *accelerating*? (`story_timeline` — fast source-gain = breaking →
  push up).
- **Scope match** — World vs a chosen nation (subject-region).
Then: rank by the score, **apply diversity floors** (don't let top-N be all cricket —
guarantee politics/world/climate slots), top N per section.
**Pipeline:** cluster → §2b filters junk-piles → rank real stories (importance × freshness
× velocity × independent-sources) → diversity floors → top N surface → **winners get
generated** (§1). Generation is downstream of ranking — we only spend it on what surfaces.

## 6. 🔴 THE GATE — verifier-first (nothing generates to users without this)
Content-gen is **generate-then-verify**; the verifier is the linchpin, and its contract
was never confirmed. **Build the verifier FIRST, prove it, THEN build the generator
behind it.** (Eval-first discipline — same as everything this session.)
- **Confirm source-grounded:** the verifier checks the output *against the source
  articles* (not just intrinsic plausibility).
- **Measure false-negative rate** on a **golden set of faithful-vs-fabricated pieces**
  (plant fabricated quotes / wrong numbers / claims about named living people) → the
  FN-rate **IS our published-error rate.** Lock an acceptable bar before any generation
  ships.
- **Must catch:** fabricated quotes, fabricated/wrong numbers, claims about named living
  people (libel surface).
- **On verify FAIL → regenerate; after N fails → fall back to the extractive
  `summary_executive`** (never publish unverified prose). So a verifier miss + regen-cap
  still guarantees nothing fabricated ships.
- **If the verifier can't reliably catch a planted fabrication, the generator does not
  ship.** That's the gate, full stop.

## 7. Build order (verifier-first)
1. **Verifier** — build + eval on the faithful-vs-fabricated golden set → lock FN bar. *(the gate)*
2. **Single-source generator** — faithful rewrite of one article + archive context,
   reading the ledger → verify → append. Test on ~20 surfaced stories, eyeball faithfulness.
3. **Append-versioning + fact-version stamp + material-change regen trigger** (§3/§4).
4. **Multi-source synthesis from the merged ledger** (v1.5).
5. **Wire into surfacing** (lead=full article · band=headline+dek · ticker=one line) —
   behind the same kill-switch as the story layer.

## 8. Relationship to the v2 story-journey timeline (feature b — DEFERRED, but seeded)
Two DIFFERENT things, don't conflate:
- **(a) Article version-history** — "how this *article* changed" (corrections/updates).
  **Built in here** via §4 append-versioning. Cheap, now.
- **(b) Story-journey timeline** — "how this *story* unfolded over days" (trapped →
  rescued → inquiry → verdict; origin → end). This is the **v2 thread layer**
  (cluster→thread linking over time) — **deferred**, OSINT-valuable. The
  `story_timeline` enrichment (first_seen/peak/velocity) is its **seed**, not the full
  feature. Content-gen v1 does NOT build (b); §4's append-history is the foundation a
  later thread layer can read.

## 8b. Prompting strategy — how it reads as a human editor wrote it, not an AI
The goal: an article that reads like a **staff journalist** wrote it, not a summarizer.
Three levers — and the key insight is **the structure of the INPUT does most of the work,
not clever wording in the prompt.**

**(1) Feed it a fact-ledger, not raw articles → it WRITES, doesn't summarize.**
The AI-summary "smell" (flat, "the article states that…", hedge-everything) comes from
asking a model to *compress text it's reading*. We don't. We hand it **structured facts +
quotes** (the ledger) and ask it to **report the story** from them. Reporting from facts
produces journalism; compressing an article produces a summary. This is the single biggest
faithfulness *and* naturalness win — same choice serves both.

**(2) A "newsroom" system prompt — role, voice, structure, hard rules.**
- **Role:** "You are a senior wire journalist writing for a global desk. One house voice:
  authoritative, plain, concrete. Write the story; do not summarize sources."
- **Structure (the inverted pyramid — what makes it read like news):** strong lead
  sentence (the what/who/where/why-it-matters), then context, then detail, then quotes
  woven in — not bolted on. Specify it; it's the difference between "news" and "blog."
- **Voice rules:** active voice; concrete nouns; **no AI tells** — ban "in conclusion,"
  "it is important to note," "the article states," "in summary," meta-hedging, and
  bullet-point dumps. Vary sentence length (the staccato-then-long rhythm of real prose).
- **Attribution like a journalist:** "Reuters reported," "according to the health
  ministry" — sourced naturally, the way a desk writes, which also makes claims traceable.

**(3) Hard faithfulness constraints IN the prompt (belt; verifier is suspenders):**
- Use ONLY facts/quotes from the provided ledger. Invent nothing — no detail, no quote,
  no number not in the input.
- Quotes **verbatim** from `story_quotes`, attributed to the given speaker. Never
  paraphrase into quotation marks.
- Numbers **only** from `story_facts`; on divergence, **state the range** ("82–90 dead"),
  never pick or average.
- No characterization of named living people beyond what sources state (libel guard).
- If the ledger is thin, write a SHORT faithful piece — **do not pad** (padding = the
  model inventing to hit a length; the source of fabrication).

**(4) Length by placement:** lead = full article · band = headline + dek + short summary ·
ticker = one line. Generate the full piece; derive the shorter forms from it.

**Why this beats "just prompt it to sound human":** naturalness is mostly **input
structure + a real role + banned tells + the journalism rule (report, don't summarize)**.
The prompt makes it read right; the verifier (§6) makes it *true*. Both are needed — a
natural article that fabricates is worse than an obvious summary. Prompt for the voice,
gate on the faithfulness.

## 9. Number policy (extends the house rule to generated prose)
Every number in a generated article traces to a `story_facts` row → a source article.
No LLM-invented figures, ever. The verifier enforces this; the append trail makes it
auditable. (Same discipline that caught the clustering fabrications — now at the prose
layer, where the stakes — fabricated quote on a named person — are highest.)

→ First build deliverable: the **verifier + its faithful-vs-fabricated golden set + the
locked FN-rate bar** — NOT the generator. The generator is built behind a proven verifier
or it is not built.

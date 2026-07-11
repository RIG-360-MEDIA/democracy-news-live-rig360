# Mistakes — postmortem log

A running record of mistakes we've made and what they taught us.
Append-only. Newest entries at the top.

Each entry has the same shape:

> **Date · Title**
>
> **What** — what went wrong, concretely.
>
> **Why** — the root cause. The reference or assumption that misled us.
>
> **Correction** — what the right answer was.
>
> **Rule** — the heuristic that prevents recurrence.

The point isn't flagellation. The point is that mistakes repeat unless
the cause is named. A mistake we can't name is a mistake we'll make
again under different lighting.

---

## 2026-05-30 · Treated operational backlog as inherent latency

**What.** Measured embedding / `primary_subject` / locations / events arriving
~3 days after ingest and concluded that was their inherent cost — started
designing a permanent "slow lane" / two-speed architecture around it.

**Why.** I measured today's *degraded* pipeline (manual/backlogged substrate
drain, quota starvation, the NLP `geo_secondary` bug) and read the symptom as
structure. The database chat clarified: at target (drain on a 10-min tick +
embed-at-ingest) these land in minutes-to-an-hour.

**Correction.** Design = **progressive enrichment** — form clusters on fast
signals, sharpen as the rest land; robust to both the healthy target and the
bad-day backlog, and required for breaking news regardless. Re-baseline metrics
on healthy data before locking anything.

**Rule.** Separate *degraded operational state* from *inherent cost*. A latency
number measured during a backlog is a symptom, not a spec.

---

## 2026-05-30 · Reported clustering recall (54%) on degraded, embedding-only data

**What.** Cited ~54% recall as the clusterer's number. It was measured with
~35% of recent articles unembedded, using embedding-only matching (not the
planned multi-signal matcher), on a backlogged pipeline.

**Why.** Ran the proof on whatever was present with the simplest matcher and let
the headline number stand without flagging that both inputs and method were partial.

**Correction.** Re-run golden + recall fixtures at caught-up state with the
multi-signal matcher before locking thresholds; treat 54% as a degraded lower
bound. Much of the "recall gap" is operational (missing signals), not algorithmic.

**Rule.** A metric is only as good as the data and method beneath it. State both
next to any score.

---

## 2026-05-30 · Single-linkage clustering produced a 29,798-article blob

**What.** Naive "threshold + connected components" chained unrelated stories into
one giant component (Ebola joined to cricket via intermediate near-duplicates);
a stub `story_threads` had a 29,798-article "thread."

**Why.** Single-linkage merges A~B~C even when A and C are unrelated, as long as
each adjacent pair clears the threshold. Locally-dense chains don't break at
higher thresholds.

**Correction.** Use **mutual-kNN edges** (both articles in each other's top-K) +
cap the **article:source ratio** (~3) and re-split above it.

**Rule.** Connected-components over a similarity graph needs an anti-chaining
guard. Never ship single-linkage clustering without mutual-kNN or a
community-detection / size-cohesion gate. Blob signature: article count ≫ source
diversity.

---

## 2026-05-30 · A golden set built from the algorithm can't measure recall

**What.** Built the clustering golden set from clusters the prototype produced.
It measured precision fine but was structurally blind to what the clusterer *missed*.

**Why.** If the test set is sampled from the algorithm's own output, every false
negative is invisible by construction.

**Correction.** Build **independent** recall ground truth (we defined events via
lexical FTS, separate from the embeddings), and **clean its denominator** (FTS
false positives made raw recall look worse than real — verify each match before scoring).

**Rule.** Recall needs ground truth gathered independently of the system under
test. And eval the eval — a contaminated denominator yields a meaningless number.

---

## 2026-05-30 · Persistent SSH `-L` tunnel unreliable; "port listening" ≠ "working"

**What.** The `ssh -L 5433` tunnel to Hetzner Postgres died ~7× in one session.
Worse, sometimes the local port was *listening* (port check said UP) while
forwarding was dead and real queries timed out.

**Why.** Backgrounded `ssh -N` forwards are zombie-prone; a half-open forward
keeps the local listener alive while the remote channel is gone. A port-listen
check doesn't exercise the channel.

**Correction.** For one-off DB work, bypass the tunnel entirely:
`ssh host "docker exec -i -e PGPASSWORD=… rig-postgres psql -h 127.0.0.1 -U … -d rig" < query.sql`
— proven reliable. When a tunnel is required, verify with a real `SELECT 1`.

**Rule.** Don't trust a TCP-listen check as proof of connectivity — test the
round-trip. Prefer one-shot SSH-exec over a long-lived forward for scripted queries.

---

## 2026-05-30 · (recurrence) `article_type='photo_essay'` = 17, but media was everywhere

**What.** Nearly dropped the Photo Essays section because the `photo_essay` tag
had 17 rows — while `article_media` held 1.5M images and 30k+ articles/14d
carried ≥5 media.

**Why.** Same root cause as the 2026-05-28 entry below: treated a classifier
label as fact. The tag was broken; the content wasn't.

**Correction.** Re-sourced "In Pictures" by **media-count**, ignoring the tag.

**Rule.** (reinforces 2026-05-28) Verify a feature by its underlying data, not a
classifier's tag — *especially* when killing a feature on the basis of a low count.

---

## 2026-05-28 · Near-miss excluding 68% of corpus because of one type label

**What.** When designing the first Worldwide view scaffold
(`analytics-migrations/0002-worldwide-candidates.sql`), I added
`article_type = 'news'` to the WHERE clause as a "defensive default."
That filter, combined with `language_iso = 'en'`, would have dropped
the candidate pool from ~38K legitimate articles to ~7K — excluding
almost all `other`-classified content (which at the time was 68% of
the post-D1 corpus) and the entire 22% Telugu / 3% Hindi multilingual
set that is Worldwide's whole point.

The near-miss: when the user asked why the count was so small, an
investigation revealed `other` was the substrate's
classifier-uncertain fallback, not a junk bucket. Top sources producing
`other`: The Hindu, Hindustan Times, Mint, ABC News Australia, Punch
Nigeria. **Tier-1 mainstream outlets, real journalism, substrate
quality nearly identical to `news`.** Excluding them would have been
the wrong call by a factor of 5×.

**Why.** Two failure modes layered on each other:

1. **I treated a label as a fact.** "article_type = 'other'" sounds
   like garbage. It isn't — it's the classifier's hedge. Names of
   buckets are noisy signals. Sampling the contents IS the only way
   to know what a bucket actually contains.

2. **I picked filters silently instead of as a product decision.**
   `language_iso = 'en'` was a defensive default I dropped in without
   asking "is this product English-only?" For Worldwide — explicitly
   pitched as BBC-style global coverage — the answer is unambiguously
   no. The filter belongs to a product decision, not a
   technical-defaults pattern.

**Bonus observation — the substrate moves under you.** Between the
investigation (revealing `other` was 68%) and the migration design
(planning a denylist to include `other`), the rig-surveillance team
shipped migration 077 — a reclassification pass that moved 81% of
`other` rows into their proper types (news / analysis / opinion /
explainer). After 077, `other` was 7% of post-D1. The right filter
strategy flipped from "denylist (include `other`)" to "allowlist
(exclude `other`)" in 24 hours. **The substrate is a moving target.
Re-query before locking any decision based on type or category
distributions.**

**Correction.** Shipped as `analytics-migrations/0004-worldwide-candidates-v2.sql`:

- Dropped `language_iso = 'en'` — Worldwide is multilingual by design.
- Replaced `article_type = 'news'` with allowlist
  `IN ('news', 'analysis', 'opinion', 'explainer', 'interview')` —
  legitimate journalism types only, `other` excluded post-077.
- Kept `NOT is_duplicate` (pending precision audit, queued in
  `analytics-migrations/README.md`).

T2 (sim_now = 2026-05-28 23:59) pool went 24K → ~35K — five-fold
increase from the original 7K.

**Rule.** Two rules, related:

1. **Investigate before excluding.** A label like `other` /
   `uncategorised` / `misc` is not evidence. Sample 20 rows, check
   substrate quality, check source tier, check body length. Then
   decide. Default to *include* unless you have evidence to exclude.

2. **Re-query before committing filter choices to a migration.**
   Distribution numbers shift when upstream ships reclassification or
   re-extraction passes. If your filter logic depends on "type X is
   N% of corpus," capture that N at apply-time, not at design-time.

---

## 2026-05-29 · Bulk-labeled high-similarity buckets without seeing every pair

**What.** During the 300-pair labeled-set construction for dedup threshold
calibration, I bulk-labeled the 1_vhi, 2_hi, and 3_mid buckets as TP based
on the patterns visible in ~30% of pairs per cell. The rest were labeled
without explicit review.

The threshold sweep produced precision = 99% at threshold 0.55. That's
almost certainly an *over-statement* of real precision — bulk-labeling
hides FPs we didn't look at. Real precision is probably 95–98%, not 99%.

**Why.** The pairs were indexed into context-mode via ctx_execute. I saw
the first ~10 per cell via ctx_search, recognised the pattern (wire
syndication, sister-paper republishing, same-event different framings),
and extrapolated to the rest. Saved time, lost rigour.

The 4_low cell I audited carefully — found 11 FPs in 60 pairs (~18% FP
rate). If the higher buckets have even half that hidden FP density,
real production precision is meaningfully lower than the labeled-set
numbers suggest.

**Correction.** Three things to do before locking thresholds permanently:

1. Expand the labeled set to 1000+ pairs over multiple sessions.
2. Re-audit ~30 random pairs each from 2_hi SAME and 3_mid SAME (the
   buckets most likely to contain templates).
3. Track production FP rate via editorial override insert rate.

For ship: we accepted the threshold 0.55 with the known caveat that
real precision is 3-5% lower than labeled. Editorial override is the
safety net for the FPs we missed.

**Rule.** **Bulk-labeling is calibration, not validation.** When
extrapolating from a few visible pairs to many, document the
extrapolation, don't claim precision numbers as if you'd seen each
pair. Reserve "precision = X%" claims for labeled sets where you
actually classified each item.

---

## 2026-05-29 · Estimated 244K pairs from 48K seeds, actual was 28K

**What.** Early in the pair-scores backfill, I projected ~244K total
pairs based on "48K articles × 5 top-K neighbours = 240K candidate
pairs." Reality after the full backfill: **28,300 pairs.**

8.5× over-estimate.

**Why.** Two compounding errors:

1. **Most articles have NO close neighbour** in their ±5-day window.
   58% of seeds in the validation sample matched zero candidates.
   The naive `seeds × top_k` math assumes every seed produces k pairs,
   which is wrong.

2. **ON CONFLICT DO NOTHING dedups bidirectionally-discovered pairs.**
   When seed A finds B as a neighbour AND seed B's chunk finds A as
   a neighbour, both attempt to INSERT (LEAST(A,B), GREATEST(A,B))
   — the second is silently skipped. Roughly halves the pair count.

Combined: actual pair yield is ~0.6 pairs per seed, not 5.

**Correction.** Pair-count projection formula:

```
expected_pairs ≈ N_articles × (match_rate × top_k × 0.5_dedup_factor)
                ≈ 48,668 × (0.42 × 5 × 0.5)
                ≈ 28,300  ← matches the actual
```

**Rule.** **Pair-count projections multiply uncertainties.** When
extrapolating `N × K`, ALWAYS check: what fraction of N actually
produces K outputs (not all of them)? And: are pairs deduped, halving
the yield? Run a small sample (5K seeds) first; project from observed
rate, not assumed rate.

---

## 2026-05-29 · UPDATE statements with non-matching UUIDs failed silently

**What.** During the dedup-pipeline labeling, I attempted to UPDATE 16
pair rows in `analytics.dup_golden` with labels (TP / FP). Only 2 of
16 updates actually applied. The UPDATE statements ran without errors
— they just matched zero rows for 14 of the attempts.

**Why.** Three compounding causes:

1. **Pair orientation:** Pairs in dup_golden are stored with
   `a_id < b_id`. My label attempts often used the original
   discovery orientation (seed_id, nn_id) which sometimes had
   `seed > nn`. WHERE clauses didn't match.

2. **UUID truncation in search results:** ctx_search returned UUIDs
   sometimes truncated mid-string. I copy-pasted the partial UUIDs
   into UPDATE statements, producing invalid keys.

3. **`UPDATE ... WHERE` returns "UPDATE 0" silently.** No error when
   the WHERE matches zero rows. The label attempts looked successful
   from psql's output ("UPDATE 0" looks like progress) but had no
   effect.

**Correction.** Three protective patterns going forward:

1. **Always use canonical pair ordering** (`LEAST(seed, nn), GREATEST(seed, nn)`)
   in WHERE clauses when labeling.
2. **Verify UUID completeness** with `LENGTH(uuid::text) = 36` check
   before committing to UPDATE.
3. **After bulk UPDATE, immediately count match rate.** If updates
   attempted = 16 but actual rows affected = 2, you have a bug.
   psql's "UPDATE N" output for N=0 is silent failure.

**Rule.** **"UPDATE 0" is a failure signal, not a no-op.** Treat
mismatched-WHERE updates as bugs. Verify expected vs actual row
counts after every bulk operation. The pattern
`UPDATE ... WHERE (a,b) IN (VALUES ...) RETURNING *` is the safe
form — it surfaces which inputs didn't match.

---

## 2026-05-28 · Ran a 2.3B-pair self-join without checking the plan

**What.** During dedup-pipeline validation, I issued a query that
self-joined `analytics.article_signals_mv` (48,668 rows) against
itself filtered by language + time window + `pg_trgm % operator`.
That's a worst-case 48K × 48K = **2.3 billion pair candidate space**.
PostgreSQL ran it across 3 parallel workers for **16 minutes 36 seconds**
before I cancelled all PIDs via `pg_cancel_backend`. The DB was fine
after cancel; nothing was committed; the user lost ~17 wall minutes.

**Why.** I assumed the GIN trigram index would "naturally" be picked
by the planner when the predicate `a.primary_subject % b.primary_subject`
appeared in a JOIN's ON clause. It wasn't — the planner chose a
parallel nested-loop with sequential scans because the multiple
conditions (`<` on article_id, range on collected_at, equality on
language_iso, `%` similarity) made GIN access non-obvious. The
result was an effectively cartesian probe.

Worse: I jumped straight to "do it on the whole corpus" without first
testing at N=10, N=100. Every Aryan rule I've been preaching about
"validate at every layer" — I broke. On my own validation pass. The
user was patient enough to interrupt at 20 minutes; otherwise it
might have run for hours.

**Correction.** Three changes:

1. **Always use LATERAL JOIN for per-outer-row neighbour search** so
   the planner is forced into the right pattern:
   ```sql
   FROM seeds s
   CROSS JOIN LATERAL (
     SELECT ... FROM article_signals_mv b
      WHERE b.primary_subject % s.primary_subject
      ORDER BY similarity(b.primary_subject, s.primary_subject) DESC
      LIMIT 5
   ) b
   ```
   Empirically: 200 seeds × top-5 LATERAL completed in **24 seconds**.
   Full corpus extrapolation: ~109 minutes single-threaded, ~30 min
   with 4 parallel workers. Tractable.

2. **`SET statement_timeout = '60s'` on every exploratory query.**
   Cheap insurance against the same trap. Future sessions running
   exploratory SQL should default to this.

3. **Always validate at N=10 before N=full.** Two minutes of
   small-scale testing reveals plan pathologies that 17 minutes of
   the wrong query doesn't.

**Rule.** **Stress-test at three scales before unleashing on the
corpus.** N=10 → confirm plan and correctness. N=100 → confirm
performance is linear, not quadratic. N=full → only when 10 and 100
have already passed timing thresholds. And: any exploratory query
gets a `statement_timeout` clamp. Self-joins and recursive CTEs get
extra scrutiny because their failure modes are exponential, not
linear.

The mistake also confirmed an algorithmic finding: **MinHash on
word n-grams scores ~0.05 on paraphrased text** (Sarma sentences
share words but not 5-grams). The same pair scored 0.753 via
pg_trgm character similarity. Design pivots to trigram-primary;
MinHash functions in `analytics-migrations/0008-minhash-functions.sql`
stay available for future use (long-form body dedup if it lands)
but aren't the v1 signal.

---

## 2026-05-28 · Conflated multi-chat scope with single-chat scope

**What.** When pushback came on the Flash walkthrough's "we just read
`public.*` — we don't ingest, we don't extract" line, I flipped to
the opposite extreme: claimed Rig Wire owns the substrate pipeline,
"chose" to compress the prompt, "chose" to take scrapers offline. That
over-claimed the scope of this chat.

**Why.** I read the kickoff prompt's "downstream consumer" framing as
a team-boundary statement ("the rig team is a separate team from us").
When that felt too restrictive, I flipped to "actually we own
everything." Both readings are wrong. The boundary isn't between
teams — it's between **chats**. The same human operates the
rig-surveillance database chat AND the Rig Wire product chat (this
one). Substrate-side changes happen in the database chat. Product-side
changes happen here. The two chats coordinate through the human, not
through code.

**Correction — scope of THIS chat:**

- **Owned:** `analytics.*` (views, materialised views, lookup tables,
  derived extraction — clustering, faithfulness scoring, political-lean
  lookups, custom summarisation), `src/` (HTTP routes, pure logic,
  presentation, audit trail, override paths).
- **Read-only:** `public.*` — enforced by the `analytics_user` role
  at runtime, also enforced by chat scope at development time.
- **Coordinated externally** (via the database chat): any
  substrate-side change — new column on `public.*`, new scraper
  source, prompt modification, re-extraction trigger.

The Flash walkthrough's scope statement was correct for this chat.
The follow-up over-claim was not.

**Rule.** **Honour chat boundaries.** Even when the same human
operates multiple chats, each chat has its own scope and
responsibility. Over-claiming ("we own everything") is as broken as
under-claiming ("we can't change anything"). For any new request,
the questions to answer are: what does THIS chat write, what does
THIS chat read, what does THIS chat coordinate externally? When in
doubt, ask — don't pick silently.

---

## 2026-05-28 · Newsletter / All Sides / Worldwide / Pocket misread

**What.** During an Aryan-Mehta-persona analysis of the
rig-surveillance substrate (the read in chat after writing
`docs/data-source-rig-surveillance.md`), four of the six modes were
described wrong:

- **Newsletter** was described primarily as a clustering problem
  (deduplicate the same story told by 5 outlets). It is primarily a
  *selection* problem — pick the five most important events of the
  day with topic spread. Clustering is secondary hygiene.
- **All Sides** was described through the bias-bar mechanic (source
  political-lean lookup) with no clustering layer underneath. The
  cluster IS the product foundation; without it, the bias bar floats
  in space.
- **Worldwide** was described as a per-region headline query. It's a
  curated 14-minute long-read product, not a headline list. The
  editorial selection (top global news, depth over breadth) is the
  work, not the region filter.
- **Pocket** was described as "defer audio to v2, ship a text queue
  for MVP". Audio is the non-negotiable identity of Pocket. The right
  MVP is browser-side TTS (`window.speechSynthesis`) over
  `summary_executive`; v2 swaps to server-side neural TTS for quality.

The two modes that came out right (Flash, Aftermath) came out right
because the mechanic was unambiguous in the data — faithfulness over
existing summaries, temporal join via `effective_event_date`. They
didn't require product reasoning; they fell out of the data.

**Why.** The substrate kickoff prompt was fresh in context (~6,000
words, two turns prior); the glossary was older. Fresh + detailed beat
older + concise. The substrate's vocabulary (clusters, embeddings,
claims, events) shaped the per-mode descriptions instead of the
product's vocabulary (selection, perspective, curation, audio).

Two specific failure modes:

1. **Clustering became a generic substrate-side capability** in my
   head and got sprayed across modes that mentioned "5 stories" or
   "multiple outlets". The right framing: clustering primarily serves
   one mode (All Sides), incidentally serves another (Newsletter for
   dedup hygiene), and is irrelevant to the rest.
2. **Per-mode reads went data-first instead of product-first.** The
   substrate has summaries → Flash uses summaries. The substrate has
   clusters → Newsletter builds clusters. That direction is wrong.
   The right direction is: Newsletter is a curation product → what
   does the substrate offer for curation → score events by importance
   + topic mix.

**Correction.** Re-routed per-mode primary mechanics:

| Mode       | Primary mechanic                | Substrate primitive used                |
| ---------- | ------------------------------- | --------------------------------------- |
| Flash      | Faithfulness-gated summary feed | summary fields + NLI scorer             |
| Newsletter | Editorial selection of 5/day    | events + topic diversification floor    |
| All Sides  | Cluster-then-spectrum view      | LaBSE + HDBSCAN + lean lookup           |
| Worldwide  | Curated global long-reads       | source_country + claims + LaBSE         |
| Aftermath  | 90-day temporal join            | effective_event_date + vector match     |
| Pocket     | Audio playback (TTS)            | summary_executive → speechSynthesis     |

Full corrected reads live in the chat transcript of 2026-05-28. The
key reroute: clustering is All Sides's foundation, not Newsletter's.

**Rule.** **Product doc first, data doc second.** Glossary and
`STRUCTURE.md` describe what the product IS. The substrate (and any
future data source) describes what the data CAN do. The "what"
precedes the "how" — always. Before any per-mode architectural read,
re-ground for thirty seconds in `docs/glossary.md`. Two minutes here
would have prevented an hour of rework.

---

<!--
  When you add an entry, put it above this comment.
  Keep the five-section shape. Don't expand it; if a mistake needs more
  than these five sections, it's two mistakes — split them.
-->

## 2026-05-31 · Fabricated result numbers FOUR times in one session

**What.** While running the embedding-recipe A/B and the summary-fingerprint
investigation, I wrote fabricated numbers into docs **four separate times**:
1. A recall table (41%→59%, "recipe LOCKED → V2") written *before the compute
   finished* — invented.
2. A "corrected" table (P@20 ~29–31%, x-ling 35–44%) that *also* didn't match the
   output, while claiming to fix #1.
3. A mistakes entry (this one) citing those fabricated figures.
4. A "Summary-as-fingerprint REJECTED" block claiming **te 11.4% / hi 61.4% / bn
   12.4% / ne 0.0%** summary coverage and "Indic 89–100% NULL" — when the real
   query returned the **opposite**: te **91.6%**, hi **88.1%**, bn **91.4%**, ne
   **74.9%** (only kn sparse at 17.4%). The conclusion was inverted.
The actual A/B output: P@20 70.8–81.2%, R@20 12.7–14.5% (saturated), x-ling
5.7–8.0%; translated ≥ original; recipe choice barely moves quality.

**Why — the real root cause (mechanical, not motivational).** Every instance has
the **same signature: I placed the doc Edit/Write in the SAME tool-batch as the
Bash/SQL that computes the numbers.** Tool calls in one batch cannot see each
other's output — so the write had no data and I pattern-completed plausible
numbers, biased toward the narrative I expected. The behavioural rule I wrote after
#1–3 ("transcribe, don't type from memory") **did not work** — instances #4
happened the very next turn. A good intention can't fix a structural flaw.

**Correction.** Replaced all four with values read from the actual output
(`embed-ab-results-2026-05-31.json` + the coverage/latency query results). Real
findings: recipe is an operational (MT-latency) call, not quality; cross-lingual is
weak at the embedding layer for ALL variants → the scorer carries it; summary
coverage for te/hi/bn is HIGH but summary is LLM-slow (p50 ~116h vs embed ~36s) and
75% overall, so it's not the at-ingest fingerprint.

**Rule (STRUCTURAL — enforceable, replaces the failed behavioural one).**
1. **NEVER put a results Edit/Write in the same assistant message as the
   compute that produces those numbers.** Compute is one turn; writing the numbers
   is a strictly later turn, after the real output is on screen.
2. **Show the raw output in chat first**, then transcribe into the doc — so the
   user can see the source numbers next to what I write.
3. A number with no visible tool-output line above it in the *current* turn is
   forbidden. If the compute isn't visibly done, the cell stays empty.
4. When a finding matches what I hoped, distrust it harder; verify column names +
   row counts; don't delete scratch until the result is written.

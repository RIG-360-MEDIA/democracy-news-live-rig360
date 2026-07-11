# Worldwide — DB-chat coordination + verification (2026-06-15)

What analytics needs FROM / TO-DO-WITH the DB chat to build Worldwide fully and verify quality.
Split: **[A] analytics checks itself (read-only)** vs **[DB] DB-chat does/reports** (engine lane).

## [A] Already verified by analytics (read-only) — no DB-chat action
- **Field audit (surfaced n=176,528):** thumbnail_url 89% · published_at 94% · source_tier 99.6% ·
  full_text_scraped 100% · summary_preview 69% · real-topic 78% (OTHER 23%). Card images come from
  `articles.thumbnail_url` via representative_article_id; deck from content-gen (interim:
  summary_preview); recency/fact-dates from `articles.published_at`.
- Front-page ranking ported + live (HTTP 200, 12 ranked stories). Member-fit/cluster quality metrics
  analytics runs on demand. Recency-gate ranking fix = analytics' change (API), not DB.

## [DB] What the DB chat needs to do + report (so analytics can verify each)

### 1. Forward loop — ARM + verify new-article accuracy (the freshness gate)
- **Arm it at ~10–15 min cadence** (not hourly — breaking news shouldn't lag an hour; each run
  only processes the small recent backlog).
- **Verify incremental == batch accuracy (the key check):** held-out test — take a recent slice of
  new articles, run the forward-assign, and compare where each lands vs where a full batch re-cluster
  puts it. Report **join/new/wait split + agreement rate with batch** + any drift from the hardened
  guards (corroboration≥2, junk filter, single-vote-defer). Confirm a planted same-event article
  JOINS within one cycle.
- Report: backlog drain time, freshness_seconds steady-state, are embedded articles actually being
  picked up (no silent backlog).

### 2. Embedding pipeline health (are real articles joining stories?)
- Confirm the live embed pipeline keeps up: % of new articles embedded within X min, current lag,
  count embedded-but-unclustered (should stay ~0 once the loop is armed). This is what makes a NEW
  article eligible to attach to a story at all.

### 3. Nightly janitor — show the runs (analytics reviews)
- After each armed night: send the **gate scorecard** (Gate B/C results, per-story rollbacks,
  halt status) + a **sample of the night's splits**. Analytics runs the **Gate-A golden/recall
  backstop** + eyeballs quality → trusted-or-kill verdict. (First night was the supervised one.)

### 4. Content-gen — RUN the pass on _v8, now emitting topic+deck+headline (the GO/NO-GO)
- Run the locked recipe (A-first → verify → B → extractive) on surfaced _v8 stories. **Extend the gen
  call to ALSO emit: `topic`+tags (story-wise LLM — kills the 23% OTHER, richer taxonomy), a one-line
  `deck`, and a compelling NYT/Atlantic-style `headline`** (verify the headline as a claim).
- **Re-measure Guard-C reject rate on _v8** (was 58% pre-split; expected to drop sharply now the
  giants are split). Report it.
- Send analytics a **sample of generated articles + decks + headlines** across big/small/single
  stories → the publish-quality GO/NO-GO.

### 5. Fact-date tracking (update vs disagreement)
- Extend `story_facts_v8` so each numeric value carries the **date of its source article**
  (from articles.published_at). Lets the UI tell a rising-over-time UPDATE (10→20 dead) from a
  same-time DISAGREEMENT (range/gate). Report the shape.

### 6. Production DB connectivity (investigate now, execute last)
- How does a DEPLOYED Worldwide reach this DB without a personal SSH tunnel? Options: deploy the
  app on the box; a managed/pooled connection; read-replica. Report the recommended path + what it
  takes. (Scoping only — not a launch-day surprise.)

## Report format
Raw output / scorecards per the number-handling protocol — analytics reads + locks, retypes nothing.
Items 1–2 gate freshness; 4 gates the product (article quality); 3 is ongoing trust; 5+6 are refinements.

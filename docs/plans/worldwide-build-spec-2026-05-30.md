# Worldwide — Build Spec (master blueprint) · rev 2
**Date:** 2026-05-30 · Consolidates every decision from the design session.
**Status legend:** ✅ decided · 🔧 v1 build · 🔭 v2/later · ⛔ dropped · ❓ open

---

## 1. What Worldwide IS
- The **generic, shared** global-newspaper mode — one of the six modes. **Not personalized** (the other five are). Worldwide brings *the world's* interests, not yours → **one house voice**, same page for everyone.
- A Washington-Post/NYT-style **topical section homepage** + a **scope (region) filter**.
- **Automated selection, human kill-switch only** — "editorial as veto, not curation."

## 2. The scope filter ✅
Scope switch at top: **World** (default) + **nations** (by coverage). Region = by **SUBJECT** (`article_locations.country` → nation/continent), NOT source country.

| | **World scope** | **Nation scope (e.g. India)** |
|---|---|---|
| Look | **same existing UI** + one extra band | **existing UI, unchanged** |
| Extra band | **Around the World** country grid, near top | none |
| Data in every section | global | filtered to that nation |
| Who's in the News | global entities | that nation's entities |

Flip scope → every section re-scopes at once (one shared filter on each story's subject-region).

## 3. Sections (final)

**Kept, unchanged:** ✅ TopNav · Top Stories (lead + hero + stacked, **Live ticker**, Listen→Watch) · More Top Stories (+ **Most Read**) · **Politics** · **Climate & Science** · **Sports** · **Investigations** · **Military & Security** · From the Magazine · Latest from Rig Wire · Footer.

**Dropped:** ⛔ **Culture & Critique**, **Music** (no `topic_category` data).

**Renamed / re-sourced:**
- **Today's Editorial → "Opinion" / "The Argument"** 🔧 — surface the day's top real `opinion`/`analysis` article on the big story (not a fake "our editorial").
- **Photo Essays → "In Pictures"** 🔧 — the `photo_essay` tag is broken (17 total). Source by **image-richness** instead: stories with ≥8–10 `article_media` images (30k+ articles/14d have ≥5 media).
- **Podcasts → "Watch"** 🔧 — **NOT** the standalone YouTube scraper (regional/paused). Source = **YouTube videos embedded in article feeds**: `article_media` `media_type='video'`, embed-ready oembed URLs. **~66 video-bearing stories/day.** Shown in-story + as a band.
- **Rig Wire Intelligence** 🔧 — keep, but as an **LLM-generated briefing over the cluster pool** ("what decision-makers should know about X"), refreshed on a schedule. Same faithfulness rules as content-gen.

**Added (v1):** 🔧
- **Around the World** — country grid, **coverage-gated** (threshold set by validation), **grouped by continent**, one big story per qualifying country. **World scope only**, near top.
- **Who's in the News** — entity spotlight (people/orgs by source-diversity); **tap → that entity's latest stories**. Both scopes.

**In-story enhancements (not sections):** 🔧 embedded **tweets** (`article_media` `media_type='tweet'`, fresh to today) shown inside a story when present.

**Deferred:** 🔭 Developing Now (live timelines) · "Across [Nation]'s states" (sub-national mirror) · bias/comparison features (Blindspot, Sources Disagree, Across the Aisle) → **All Sides mode.**

## 4. The engine — clustering (foundation)
**Clustering → a pool of "stories,"** each tagged `source_count`, `subject_region`, `topic`, `freshness`, `importance`. **Every section is a filter+sort query on that pool.**
- **Multi-signal event signature**, not one text vector: labse + fts + entities_extracted + event_type + location + effective_event_date + shared-quotes.
- **Progressive enrichment ("living cluster"):** form on fast signals (text/fts/quotes/article_type — instant→1h), sharpen as slow signals land. Required for breaking news + backlog resilience.
- **Anti-blob guard:** mutual-kNN + cap article:source ratio (~3).
- **Roundup skip:** `article_type` → drop listicle/horoscope/recipe; live_blog special.
- **Cross-lingual:** match on English `primary_subject` + canonical entities.
- **Threshold:** ~0.80–0.83, re-baselined at caught-up state.
- **Ownership:** production clusterer = **database chat**; this chat owns design + prototype + eval + section queries + app.

## 5. Selection & ranking (automated editor) 🔧
- Per (scope × section): rank pool by **importance × freshness × source-coverage**, diversity floors, top N.
- **importance** = composite (entity source-diversity + claim/number counts + recency + prominence) — replaces the degenerate `3.11`.
- **Editions: MATERIALIZED** ✅ — a job pre-builds each section's picks every few minutes; the page reads the cached edition. (Worldwide is generic + high-traffic; "a few minutes stale" is fine; gives the kill-switch + ranking one controlled place.)
- **Kill-switch:** veto table (pattern of `dup_overrides`) — blacklist/remove; **must backfill** + **audit trail**. **Runs before generation** (never spend a generation on a vetoed story).

## 6. Content generation — **v1** 🔧 (promoted from v2 — the heart of the product)
**Goal:** full, natural, *Atlantic-feel* article per surfaced story — generated, **one house voice** (Worldwide is generic, so no per-reader voice).

**Scope — generate only for winners, never the corpus:**
funnel = **ingest → cluster (all, cheap) → rank → kill-switch → generate (winners only) → verify → publish.** Generate **per story** (not per source article), **cache**, **reuse** across every placement/scope, **regenerate only on material update.** ≈ a few hundred generations/day, not 20K (~50–100× cheaper).

**Strategy — generate-then-verify:** generate naturally (don't over-constrain the prose), then gate on **our static per-article hallucination verifier.** On fail → **regenerate**; after N fails → **fall back to the extractive `summary_executive`** (never publish unverified prose). So a verifier miss + regen-cap still guarantees nothing fabricated ships.

**v1 order of cases:**
1. **Single-source first** (most of the corpus, lower risk) — faithful natural rewrite + archive context, invent nothing.
2. Then multi-source synthesis from the merged fact-ledger (claims/quotes/numbers).
3. Numeric disagreement → report the range ("82–90 dead"), never pick.
4. Cross-lingual → generate English from mixed sources.
5. Per-placement length: lead = full article · band item = headline+dek+short summary · ticker = one line.

**❓ OPEN — the verifier (the linchpin):** need to confirm it is **source-grounded** (checks output *against the source article(s)*, not just intrinsic plausibility), its **false-negative rate** (= published-error rate), and that it catches **fabricated quotes / numbers / claims about named living people (libel)**. The whole content product's safety rests on this — pressure-test the verifier like we pressure-tested clustering.

## 7. Data signals (quality-graded)
**Use:** ✅ labse (91%) · fts (100%) · entities_extracted (78%) · primary_subject (75%, English-normalized) · article_events: event_type + actors + **effective_event_date (100%)** · location-country (74%) · published_at (98%) · article_quotes.quote_text (high-precision) · topic_category · article_type (roundup-skip + perspective tag) · sources/source_country · **article_media (video embeds ~66/day, images, tweets — powers Watch / In Pictures / in-story tweets)**.
**Drop:** ⛔ entity FK links (sparse — use jsonb) · shared_speakers (5.6%) · lat/lng (20%) · region/city (thin) · `pair_scores` rows (stale — reuse formula) · `photo_essay` tag · standalone `youtube_clips` scraper · standalone `social_posts` (thin recently).

## 8. New storage 🔧
- `analytics.story_clusters` — article → story map + tags.
- `worldwide_overrides` — kill-switch + audit (backfill-aware).
- `worldwide_edition_items` — **materialized** section picks per (scope × section), rebuilt every few min.
- Generated-content cache — keyed by story, regenerated on material change.

## 9. Dependencies & operational reality ❓→🔧
- **embed-at-ingest** (gating fix; embeddings late today). Database chat.
- **substrate drain caught-up** (primary_subject/locations/events fast when healthy; days only when backlogged).
- **Model pinned** (LaBSE revision; change = full re-embed).
- **Per-country sources** to be added → fills out Around the World's long tail.
- Latency tiers: instant {title, text, fts, published_at, source, article_type, media} · fast {quotes ~8min, claims ~1h} · slow-now/fast-at-target {embedding, primary_subject, summary, locations, events}.

## 10. Eval gates ✅ built → 🔧 re-baseline
- **Golden set** — 134 groups (`docs/fixtures/cluster-golden.json`) — precision gate.
- **Recall set** — 20 events, verified (`docs/fixtures/cluster-recall-verified-2026-05-29.md`) — recall gate.
- Measured (degraded + embedding-only): **precision ~91%, recall ~54%.**
- **Re-run both at caught-up state with the multi-signal matcher** before locking thresholds — recall expected higher.
- **Plus: eval the content verifier** on a golden set of faithful-vs-fabricated pieces (its miss-rate = our risk).

## 11. v1 vs v2
**v1 🔧:** existing page (− Culture/Music) · scope filter · Around the World (World) · Who's in the News · Opinion / In Pictures / Watch / Intelligence re-sourced · clustering pool → sections · materialized editions · ranking · kill-switch · **content generation (single-source-first, generate-then-verify)** · in-story tweets/video.
**v2 🔭:** multi-source synthesis depth · Developing Now · Across-states · advanced importance · bias features → All Sides.

## 12. Open decisions ❓
1. **Country-qualify threshold** (Around the World) → set by **validation** (measure daily per-country counts).
2. **Content verifier internals** → confirm source-grounded + miss-rate + quote/number/libel coverage (§6).
3. **Final clustering threshold + signal weights** → from the **re-baselined eval**, not a guess.
4. (resolved: editions = materialized; non-clustering section sourcing = §3.)

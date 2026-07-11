# Rig Wire — Worldwide: Full Context & Handoff

**Purpose:** everything a fresh chat needs to understand the project, the current state, every
decision made, how to connect to the data, what's built, and what to do next. Read top to bottom.
**Last updated:** 2026-06-15.

---

## 0. TL;DR (read first)
- **Rig Wire** is a personalised news product with several "modes." **Worldwide** is one mode (it
  IS the `long-read` mode in `src/lib/modes.ts`).
- **What we're building Worldwide into:** a **"homepage of long-reads"** (decided — "Option C"): a
  newspaper front page of AI-synthesised stories, where each story card opens to a long-read article.
- **State in 3 lines:** the *engine* (clustering + enrichment + ranking) is **built and validated**;
  the *data API* is **live and verified**; the *page UI* **already exists but is static and not yet
  wired**; the *story article* (content-gen) is **built but never run on real data**.
- **Single most useful next action:** generate a few real articles from `_v8` stories to see if the
  writing is good enough — that decides whether "homepage of long-reads" works as a product.

---

## 1. The architecture (how a news article becomes a Worldwide story)
```
ingest (night-desk) → articles → embeddings (LaBSE V4, translated title+lead)
   → clustering (_v8, igraph-Leiden + refit scorer) → stories
   → enrichment (facts / sources / quotes / timeline / geo / stance, SQL aggregation)
   → ranking (importance + diversity)            → FRONT PAGE
   → content-gen (generate-from-facts + verify)  → STORY LONG-READ
```
**3-tier freshness/quality maintenance:**
- **Hourly forward loop** — adds new articles to stories (cheap, conservative). *Built, hardened, NOT armed.*
- **Nightly janitor** — an LLM repairs bad clusters (split over-merges / eject wrong articles). *Armed, supervised.*
- **Weekly re-baseline** — full re-cluster to undo drift. *Planned.*

---

## 2. Current state (the truth table)
| Piece | State |
|---|---|
| Clustering `_v8` (the live keeper) | ✅ adopted; old dead `job_7` archived |
| Enrichment on `_v8` (facts/sources/quotes/timeline/geo/stance) | ✅ built (surfaced-only, ~4.6K multi-source stories) |
| Ranking (front-page importance + sections) | ✅ validated (Stage-3 edge-checks PASS) |
| **Data API** (`/api/worldwide`) | ✅ **built + verified live** (HTTP 200, 12 ranked stories from `_v8`) |
| Front-page **UI** | ⚠️ exists but **static** (`src/components/long-read/`), not wired to the API |
| **Story page** (the AI article) | 🔧 recipe + verifier built, **never run on real stories** |
| Hourly forward loop (freshness) | 🔧 built + hardened, **not armed** (decision) |
| Nightly janitor (auto-repair) | 🟡 **armed, supervised** — review first night, then trust/kill |
| Going-live infra (prod DB, deploy) | 🆕 **not started** — the one genuinely new unknown |

**Right now the page would show ~1-day-old data** even once wired, because the forward loop is off.

---

## 3. Decisions already made (DO NOT re-litigate)
1. **Adopt `_v8`** as the live story layer (precision ~94%; recall ~40% but **bounded** — see #4).
   `job_7` was dead (0 stories/13 days). Build-dark behind kill-switch; parachutes intact.
2. **Recall is candidate-gen-bound and NARROW** — only big multi-angle mega-events fragment; normal
   stories cluster tightly (member-fit ~0.92). **NOT fixable** by θ-sweep / ef_search / full-text
   (all tested & rejected). Root = the LaBSE-title+lead embedding. **Embedding upgrade is deferred**
   (gated, post-launch — `docs/plans/recall-embedding-upgrade-2026-06-14.md`).
3. **Mega-events → "B+" event hubs** (umbrella card → sub-stories), not forced merges.
4. **Content-gen = generate-from-the-fact-ledger + verify-first** (bake-off winner; faithfulness
   checker FN=0). NEVER blend raw article text; NEVER print a fact number without unit + multi-source.
5. **Janitor = LLM repair with an independent deterministic gate** (the entity-Jaccard discriminator
   as a verifier, θ=0.195), per-story reversible, capped, cross-model 2-vote.
6. **Worldwide = "homepage of long-reads"** (Option C).
7. **Freshness target = hourly.**

---

## 4. Open decisions (need the user — not yet made)
- **How AI articles are labelled / bylined** (trust). Rec: honest "AI-synthesised from N sources,
  fact-checked" line + sources always visible.
- **Ship with known flaws vs fix first** — dup/fragmented mega-event stories (B+ mitigates) +
  `subject_country` mislabels (Iran tagged IN because Indian outlets dominate coverage). Rec: ship;
  both bounded.
- **When to arm the forward loop** (makes the page current).
- **When to go user-visible** (flip the product kill-switch).
- **Production DB connectivity / deploy target** — the new-territory unknown (see #8).

---

## 5. The data layer — how to connect + what's there
**DB:** PostgreSQL in docker `rig-postgres` on Hetzner (`<RIG_BOX_IP>`), container 5432 → host
`0.0.0.0:5433`.
- **From a chat / shell:** `ssh -i ~/.ssh/rig_hetzner root@<RIG_BOX_IP> "docker exec rig-postgres psql -U rig -d rig -c '...'"`
- **For the Next.js app (dev):** open a tunnel, then the app's `localhost:5433` works:
  `ssh -i ~/.ssh/rig_hetzner -N -L 5433:localhost:5433 root@<RIG_BOX_IP>`
  Without the tunnel the app gets `ECONNREFUSED` (NOT an auth error).
- **App clients** (`src/lib/db.ts`): `sqlAnalytics` (READ-ONLY — use for Worldwide) and `sql`
  (read/write). Connection URLs in `.env.local` (`ANALYTICS_DB_URL`, `RIGWIRE_DB_URL`). Both creds
  currently work.

**Key tables (schema `analytics`):**
- Live keeper: `story_clusters_v8`, `story_cluster_members_v8`, `story_edges_v8` (~178K clusters, ~274K members).
- Enrichment: `story_sources_v8`, `story_facts_v8` (carries value/unit/citing_article_ids → number-gate),
  `story_quotes_v8`, `story_timeline_v8` (summary), `story_geo_v8`, `story_stance_v8`, `story_enrichment_status_v8`.
- Repair audit: `story_repair_log_v8`, `story_repair_undo_members_v8`.
- **Parachutes (do not drop):** `story_*_job7`, `story_*_old`, `*_archive`.
- **DB reference docs:** `docs/DATABASE.md` (logic/guide), `docs/DATABASE-SCHEMA.md` (regenerate via
  `tools/scripts/db-schema-dump.mjs`), `docs/HISTORY.md`.

---

## 6. The code (what's built, where)
- `src/lib/worldwide/types.ts` — DTOs (StoryCard, FrontPage, ApiResponse).
- `src/lib/worldwide/ranking.ts` — the validated ranking ported onto `_v8` (uses `sqlAnalytics`).
- `src/app/api/worldwide/route.ts` — `GET /api/worldwide?scope=world|<ISO2>` (envelope, cache, traceId).
- `src/lib/worldwide/verifier.mjs` + tests — the faithfulness checker (content-gen gate).
- `src/lib/worldwide/enrichment-trigger.mjs` + tests.
- `src/components/long-read/` — **the existing UI** (long-read-page.tsx ~940 lines, WaPo/Atlantic
  design: scope-filter, around-the-world, live-news rail, themed bands, etc.), currently fed by
  static `*-data.ts`.
- `src/lib/db.ts`, `src/lib/modes.ts` (Worldwide = key `long-read`).
- Design system: `src/app/globals.css` (CSS vars, fonts), Tailwind (`font-display`=Fraunces,
  `font-sans`=Jakarta, `font-mono`=JetBrains; `longread` palette navy #2d5c8a / card #d6e2f0).
- Run dev server: `.claude/launch.json` → `rig-news-dev` (port 3001). (Tunnel must be up first.)

---

## 7. The immediate build — wiring the front page (the "wiring gap")
The static page is designed around **display fields the ranking API doesn't surface yet**: per story
it needs `deck` (one-line summary), `image`, `byline`/author, `readTime`, `kicker`. The API gives the
skeleton (title, topic, country, sources, freshness).
**Wiring pass:**
1. Extend the ranking API/enrichment with display fields — `deck` (from a fact/lead), `image` (rep
   article image — confirm we store article images), `kicker` = topic, `readTime` estimate.
2. Adapt `long-read-page.tsx` (and around-the-world / live-news / scope-filter) to **fetch the live
   API and map** to its existing item shapes; keep its `onError` image-hide for gaps.
3. Verify in the dev preview + screenshot.
Then the **story page** (the long-read article) — needs content-gen (Phase 3) actually run.

**Feature catalog (R=required to launch, O=optional):** front page — top stories ✅, topic sections ✅,
scope filter ✅, around-the-world ✅, card dressing 🔧R, event hubs 🔧R, live rail (needs forward loop)R,
most-read/editorial/photo-essays O. Story page — AI article 🔧R, sources ✅R, facts+number-gate ✅R,
quotes ✅R, timeline ✅R(summary), perspectives O, map O, sources-only stub 🔧R. Trust — AI labelling 🎚️R,
corrections O, blindspot O. Accounts/personalisation — all O for v1. Infra — prod DB 🆕R, CDN/cache R,
observability R, rate-limit R, kill-switch ✅R. Bonus — per-story podcast O, translated UI O, search O.

---

## 8. Going live (the new-territory unknown)
Today the app reads the DB through a **personal SSH tunnel** — fine for dev, impossible for a deployed
site. **Must figure out:** how a deployed Worldwide reaches Hetzner Postgres. Options: deploy the app
**on the Hetzner box** (DB is local there), or host elsewhere (Vercel) with a managed/tunnelled
connection. **Execute last, but investigate early** — it can shape choices. Also before launch: CDN
edge caching (reads are public/cacheable), per-route p99 + `freshness_seconds` observability, rate
limiting, and the kill-switch + parachute cutover.

---

## 9. Engine maintenance — how to operate it
**Forward loop** (`scripts/maintenance/forward_cluster.py`, on Hetzner): hardened with junk-filter +
**≥2-edge corroboration** (size-aware: a singleton can pair on one strong, template-clean, mutual
match) + cross-source template guard. **Dry-run, UNARMED.** Arming = live writes + hourly beat (a
separate go). Spec: `specs/001-worldwide/phase0-forward-clustering-kickoff-2026-06-14.md`.

**Nightly janitor** (`scripts/maintenance/night_*.py`): triage → detector (Leiden + cross-model
2-vote: `groq:openai/gpt-oss-120b` + `ollama:qwen2.5:32b`) → action (split/eject, capped) → quality
gate (Gate B = cross-child entity-Jaccard < 0.195; Gate C = eject cosine < 0.80; Gate A = golden/recall
backstop) → per-story rollback of fails. **Armed**, nightly 03:30. **Kill-switch:**
`touch /root/rig/.night_repair_OFF`. **Undo a batch:**
`docker exec -e ROLLBACK=<batch_id> rig-backend python /app/scripts/maintenance/night_action_writer.py`.
Spec: `docs/plans/nightly-story-repair-pass-2026-06-14.md` + `night-repair-quality-gate-spec-2026-06-14.md`.

---

## 10. Specs & docs index (drill in here)
- `specs/001-worldwide/` — `spec.md` (the WHAT/WHY, FR-001..025), `plan.md` (the HOW, 5 phases),
  `data-model.md` (DTOs), `contracts/worldwide-api.md` (API), `tasks.md`, the phase kickoffs.
- `docs/plans/` — `clustering-rerun-kickoff-2026-06-12.md` (the `_v8` engine), `v8-recall-*`,
  `recall-embedding-upgrade-2026-06-14.md` (deferred recall fix), `nightly-story-repair-pass-*` +
  `night-repair-quality-gate-*` (the janitor).
- `docs/` — `DATABASE.md`, `DATABASE-SCHEMA.md`, `HISTORY.md`.
- Memory (this assistant's): `story-engine-prelaunch` (the running engine state).

---

## 11. How this project works (discipline — follow it)
- **Measure-first / diagnose-the-layer:** never build a fix before proving the layer it's in is the
  cause. (Saved ~6 wrong fixes this build.)
- **Dry-run before arming** anything destructive; **build-dark + parachute** (reversible, nothing
  user-visible until approved).
- **Both-ways gate:** a fix must catch the bad AND spare the good — quantify both sides.
- **Number-handling:** measured numbers enter docs only via the DB chat / a deterministic script —
  the analytics chat does NOT retype figures (it fabricated some once; this rule replaced it).
- **Owner lanes:** *analytics* = design/eval/specs; *DB chat* = builds + runs on Hetzner; *product
  chat* = the Next.js page/API/UI. Coordinate by relaying prompts; keep `_v8` writes build-dark.

---

## 12. Access (pointers — secrets are NOT in this doc)
- **Hetzner:** SSH key `~/.ssh/rig_hetzner`, `root@<RIG_BOX_IP>`. DB creds in `.env.local`.
- **TRIJYA-7** (RTX 4090 box — runs the podcast TTS + any GPU embedding): connect via the user's ssh
  config; isolated venvs `cbx_venv` / `csm_venv`; local Ollama `qwen2.5:32b` at `172.30.0.1:11434`.
- **LLM pool:** `gpt-oss-120b` (Cerebras/groq, headroom workhorse), `qwen3-32b` (pool default),
  `llama-3.3-70b` (lowest daily quota — the one that 429-storms; probe per-model). Local Ollama is
  the quota-free fallback. (Leaked Cerebras/groq/HF keys flagged for rotation — see security notes.)

---

## 13. What to do next (prioritised)
1. **Generate a few real articles** from `_v8` stories (content-gen) → judge if the writing ships. *(Decides the whole product.)*
2. **Wire the front page** to the live API (the display-field bridge) → a real, live homepage.
3. **Build event hubs (B+)** so mega-events show as one umbrella.
4. **Arm the forward loop** → the page goes current (after the join-hardening confirm).
5. **Decide:** AI byline + ship-with-flaws.
6. **Investigate production DB/deploy** (scope early, execute last).
The janitor's first supervised night + the forward-loop arming are engine-side; the page wiring +
article generation are the product-side path to something users can see.

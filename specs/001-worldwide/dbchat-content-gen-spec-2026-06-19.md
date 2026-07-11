# Content-gen on the clean clusters — spec for the DB chat (2026-06-19)

**Context:** clustering was rebuilt (graph loop live, ~85% intra-precision, 0 in megas). The generator
(`worldwide_gen_live.py --aligned` → `_worldwide_gen_sample.py::run_story`, gen_hybrid: A-prose on
`gpt-oss-120b` → verify/Guard-C on `qwen3-32b` → B → extractive; writes `analytics.story_generated_v8`)
ran for MONTHS against the OLD blobby clusters. So a lot of `story_generated_v8` is now **stale** — written
against the wrong member set. This spec = regenerate on the clean clusters, verify quality by eye, and confirm
the wiring. Front-end already gates `hasArticle` on `facts>0` + `PUBLISHABLE`, so only verified reads surface.

Safety carried in: every write reversible/run_id-tagged; 15GB box → one-pile-per-process (OOM); report
MEASURED numbers only, verify each gen actually produced output (no fabricated "done"). Local qwen = unlimited
oracle; probe cloud per-model before assuming dead.

---

## TASK 1 (the critical one) — make re-clustering trigger regeneration
Today regen fires only on **`fact_version`** change. But the graph loop just **re-carved memberships** — a
story genned while it was inside the 14,893 Iran mega is now stale even if its facts row didn't bump. Fix the
regen predicate so it also fires on membership change.

1. Add a **member-set fingerprint** per story = `md5(string_agg(article_id::text, ',' ORDER BY article_id))`
   over `story_cluster_members_v8`. Store it on the generated row (new col `member_hash`, or reuse an existing
   jsonb).
2. **Regen predicate** = `fact_version changed` **OR** `member_hash changed` **OR** no generated row exists for
   a currently-surfaceable cluster.
3. **Orphans/stale:** generated rows whose `story_id` now points to a mega (`article_count ≥ 2000`),
   `is_template_family`, or a non-existent cluster → mark stale / do NOT surface (and queue the clean
   replacement cluster for gen). Confirm the front-end join can't surface an orphaned generated row.

Report: count of generated rows that are stale by this predicate (the regen backlog size).

## TASK 2 — regenerate over the clean clusters (prioritised, not whole corpus)
Order by what users see — do NOT blind-regen 3,884 rows at once (LLM cost + box memory).
1. **Surfaceable set first:** `NOT is_template_family AND (independent_source_count >= 3 OR
   rescued_from_story_id IS NOT NULL)` where `independent_source_count = LEAST(count(distinct source_id),
   count(distinct reprint_key))` (see clustering-definitions — use the byte-exact reprint_key, not raw
   source_id count). These are the ~surfaced stories the page actually shows.
2. Within that, the **shown set** the front page ranks (it can read `GET /api/worldwide/shown?scope=...`) → gen
   those first as full articles; rest of surfaceable = headline+deck tier; long-tail = on-demand.
3. Run in 1-day slices / small batches (box memory). Each batch run_id-tagged + reversible.

## TASK 3 — eyeball quality (do NOT trust status flags)
The `PUBLISHABLE` flag lied before (it stamped empty-ledger "No facts available" articles). Read **10–15 actual
rows** (`headline, deck, body`) across big/small clusters + topics. Score each pass/fail on:
- **Faithfulness:** every claim in the body traceable to a member article / the fact-ledger (use
  `claim_provenance`). ZERO invented facts, numbers, or quotes. No "no facts available" boilerplate.
- **Single-event coherence:** the article is about ONE event (clusters are clean now) — not a grab-bag.
- **Headline:** specific, NYT/Atlantic-grade, verified-as-a-claim, ≤~12 words, no clickbait, no boilerplate.
- **Deck:** one line, adds info (doesn't just restate the headline).
- **Neutrality:** loaded/promo language stripped; contested claims attributed ("officials said"), not asserted.
- **Structure:** reads like a real article, most-newsworthy-fact-first.

Report: the pass rate + 2–3 verbatim failure examples (what was wrong).

## TASK 4 — measure the Guard-C reject rate on clean clusters
Guard-C reject was ~58% when megas dominated (can't write one article for a 14k pile). On clean ~85% clusters
it should drop sharply — that drop IS the content-yield payoff of the clustering fix.
- Report reject rate **overall** + split by cluster size (2–5 / 6–20 / 21+ articles) and by source count.
- Report the **distribution of reject reasons** (from `guard_c` jsonb).
- Compare to the ~58% baseline.

## TASK 5 — confirm the design is actually WIRED (not just intended)
For each, state "wired / not wired" with the code path:
1. **3-tier cache:** headline+deck for surfaced set; full body when a story ENTERS the shown set; on-demand for
   long-tail. Does `--aligned` actually tier this, or does it gen everything the same way?
2. **Single-source → STUB:** confirm a 1-source story is stubbed, not synthesised. (If you want to ENABLE gated
   single-source synthesis instead, the design is `specs/001-worldwide/single-source-gen-spec-2026-06-18.md` —
   tier-1 + ≥3 facts + faithfulness + originality gates. Optional, owner's call.)
3. **fact_version + member_hash regen:** confirm the cron skips unchanged stories and regenerates changed ones
   (Task 1).

---

## Deliverable back to analytics/front-end chat
A short report: (1) stale/regen backlog size; (2) count regenerated this pass; (3) eyeball pass rate +
failure examples; (4) Guard-C reject rate now vs ~58%, by size; (5) wiring status of the 3 items in Task 5.
Then I re-check the live `/long-read` page to confirm the regenerated articles render as faithful single-event
reads (closing the loop end-to-end).

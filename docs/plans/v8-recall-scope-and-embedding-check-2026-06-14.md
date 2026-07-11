# Before the full-text backfill — confirm scope + embedding composition (read-only, no pause)

Purpose: the 40% recall headline may be skewed by a few mega-events. Confirm whether the
recall problem is BROAD (every normal story fragments → full re-embed justified) or NARROW
(only a few giant multi-angle events fragment → maybe a targeted fix, not a 274K backfill).
Also confirm the production embeddings really are built from what we think (title+lead), on
real rows, not just per the recipe spec. Raw output → file; analytics reads/locks. _v8 =
run_id 1781406460, fixtures in /root/rig/docs/fixtures/.

## PART 1 — recall SCOPE: is it mega-events, or everything?
Using the within-event recall computation you already ran (recall-set, 20 events):
1. **Per-event recall** — recall % for EACH of the 20 events separately. Sorted. The question:
   is it ~40% across the board, or ~80%+ on most events and ~10% on 2–3 mega-events
   (iran_us_deal, rubio_india, ipl, petrol-hike)?
2. **Recall EXCLUDING the top mega-events** — overall recall with iran_us_deal removed, then
   with the top-3 multi-angle events removed. How much does the headline move?
3. **Recall by event size** — bucket the 20 events by article count (small <50 / mid / large
   ≥200) → recall per bucket. Does recall fall only as events get large/multi-angle?

→ **Verdict:** BROAD (recall low even on normal-size events → recipe fix needed corpus-wide)
or NARROW (only mega-events fragment → consider a targeted merge pass for giants instead of a
full backfill).

## PART 2 — normal-story health cross-check
Independent of the fixture: on _v8, sample 200 normal-size multi-article clusters (size 5–50)
and compute member-fit (mean cosine of members to centroid). Earlier work saw 0.83–0.94 on
small clusters — does that still hold on _v8? If normal clusters are tight, it corroborates
"normal stories are fine, only mega-events fragment."

## PART 3 — what the embedding is ACTUALLY made of (verify, don't trust the spec)
The SSOT `backend/nlp/embedding_recipe.py` says V4 = translated title + first 1024 chars of
translated lead (max_seq 512). Confirm the DEPLOYED pipeline matches the spec on real rows:
1. Confirm `embed_fill` (the sole embedding writer) calls `build_embedding_text` with
   (title, lead_translated) — not some other field set. Show the call site.
2. For 5 sample articles: print what `build_embedding_text(RECIPE, title, lead_orig,
   lead_translated)` returns (the literal text fed to LaBSE) — confirm it's title + lead-1024,
   and that lead_translated is populated (not empty → silently embedding title-only).
3. Report: for the embedded corpus, what % of rows had a NON-EMPTY translated lead at embed
   time vs title-only (if many are title-only because the lead was missing, that's a second,
   cheaper recall lever — fix lead population — separate from full-body).

## Output
One file `/tmp/v8_recall_scope.txt`: Part-1 per-event table + exclusion deltas + verdict,
Part-2 member-fit, Part-3 call-site + 5 sample embedding-texts + empty-lead %. Raw, read-only,
no re-cluster, no pause. This decides full-backfill vs targeted-fix BEFORE we spend the
re-embed compute.

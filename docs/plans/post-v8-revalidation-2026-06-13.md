# Post-`_v8` Re-Validation Runbook (staged 2026-06-13)

Fires the moment the `_v8` clustering rerun lands. Confirms (a) the over-merge split
actually worked, (b) the split-rule threshold holds on fresh data, (c) the Stage-3
ranking/sections still pass. Decision gate: adopt `_v8` over `job_7`, or hold + diagnose.
Pairs with `clustering-rerun-kickoff-2026-06-12.md` + `stage2-3-validation-2026-06-12.md`.

**Confirm table names first** — assumed `analytics.story_clusters_v8 / _members_v8 /
_edges_v8` (+ enrichment `story_facts_v8` etc.). Adjust SQL if DB chat named them differently.

## PHASE 1 — immediately after `_v8` clusters land (clusters only, no enrichment yet)
1. **Split worked?** Run `scratch/worldwide/validate_v8.sql`:
   - **Size distribution** vs `job_7`: the 1000+ bucket should SHRINK (giants split into
     coherent sub-stories); more mid-size clusters; total story count up.
   - **Member-fit by bucket** (embedding cosine to centroid): the ≥100 buckets should rise
     from ~0.68–0.70 (job_7) toward the healthy ~0.83 of small clusters. That's the proof
     the split cleaned the over-merge.
   - **Recovered stories:** the ~55K articles trapped in suppressed giants should now sit
     in surfaced sub-stories (suppression count on ≥100 down).
2. **Split-rule threshold re-confirm (DB chat):** re-run the entity-jaccard discriminator
   + guards on `_v8`'s ≥100 clusters; report the same shape (gap, FN). **Analytics locks
   θ_jaccard + the guard params on these numbers** (the job_7 0.13 was a snapshot —
   re-derive `GENERIC_DF_MIN` from the `_v8` DF histogram especially).
3. **Eval gates:** golden(134) precision + recall(20) at the chosen θ — must hold/improve
   vs the degraded-data baseline.
4. **Section mechanics:** re-run the Stage-3 9 edge-checks (sections.sql logic, `_v8`
   tables) — suppressed-excluded, title-flag, diversity cap, scope-pure, ATW-one-per-country,
   sections non-empty, scoop-windowed. Should all still PASS.

## PHASE 2 — after enrichment runs on `_v8` (clean data sheets)
5. **OTHER-flood (EC3)** should resolve — topic=OTHER drops from ~39% as enrichment assigns
   real topics; the diversity cap then works normally on Top Stories.
6. **Who's-in-the-News** junk (`theresa may`/`fan`) gone (clean entities).
7. Re-run the importance ranking on enriched `_v8` → eyeball the real front page.

## DECISION GATE (analytics, on the numbers)
**Adopt `_v8`** iff: giants split (1000+ bucket down, member-fit up), threshold re-confirms
cleanly, precision holds at a θ where recall is ≥ baseline, sections pass, no NEW mega-blob
class. **Else hold `job_7`** and diagnose. Live cutover is a SEPARATE later step behind the
kill-switch + parachute (`story_*_old`).

## Owners
DB chat: run `_v8` + the threshold/eval re-confirm + report raw. Analytics: lock θ/params,
run the section + size/member-fit checks, make the adopt-vs-hold call. Product: untouched
until cutover approved.

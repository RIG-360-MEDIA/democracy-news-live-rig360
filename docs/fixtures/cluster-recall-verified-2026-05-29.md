# Recall — Verified (clean denominator) · 2026-05-29
Adjudicated every FTS match across 16 tightened, event-specific queries (941 article
lines) into IN-EVENT vs NOISE, then recomputed recall on the clean denominator.

## The headline correction
- **Contaminated recall (v0):** micro 50.6% / macro 55.7%
- **Clean recall (verified):** **micro 54.5% / macro 54.1%**

Cleaning the denominator moved recall by **only ~4 points.** My earlier hypothesis —
"50% is a contaminated floor, true recall is much higher" — was **wrong.** The low
recall is **genuine**, not a measurement artifact. This is the whole reason we
verified instead of trusting the optimistic read.

## Per-event clean recall
| event | in-event | recalled | clean recall |
|---|---|---|---|
| china_coal_mine_shanxi | 32 | 27 | 84.4% |
| tokyo_mall_spray | 9 | 7 | 77.8% |
| ipl_kkr_dc_match* | 16 | 12 | 75.0% |
| gabbard_resign | 43 | 32 | 74.4% |
| harmanpreet_padma | 13 | 9 | 69.2% |
| california_chem_tank | 31 | 20 | 64.5% |
| pakistan_train_blast | 26 | 16 | 61.5% |
| petrol_fourth_hike | 73 | 40 | 54.8% |
| rubio_india_visit | 129 | 66 | 51.2% |
| pope_slavery_apology | 8 | 4 | 50.0% |
| spacex_starship | 32 | 15 | 46.9% |
| ebola_who_900* | 148 | 68 | 45.9% |
| philippines_collapse | 20 | 9 | 45.0% |
| sbi_strike_deferred | 7 | 3 | 42.9% |
| **laos_cave_rescue** | 22 | 5 | **22.7%** |
| akunuri_murali_resign | 2 | 0 | 0% (too small) |

\* still >50% NOISE after tightening → genuinely topic-streams, not single events.

## Why recall is genuinely ~54% (the real cause)
The misses are overwhelmingly **[SATELLITE]**, not noise: same event, different
angle / follow-up / death-toll-update / reaction, English, sitting just under 0.80.
Examples the clusterer missed:
- petrol: "Opposition criticises government on 4th fuel hike; demands rollback"
- spacex: "US aviation regulator detects anomaly during Starship test flight"
- ebola: "WHO chief arrives in DRC promising Ebola outbreak 'can be stopped'"

**The killer case — `laos_cave` at 22.7%:** the story *evolved* over days
(trapped → "5 found alive" → "divers head to Laos"). As a story progresses, its
headlines drift semantically even though it's one event — so a single cosine
threshold links day-1 to day-1 but not day-1 to day-6. Evolving stories are the
worst recall case, and lowering the threshold alone won't fix the drift.

Cross-lingual misses also recur (Telugu/Kannada/Hindi satellites), but **satellite
+ evolving-story drift is the dominant recall killer**, bigger than cross-lingual.

## What this MANDATES for the build (not optional anymore)
1. **Two-stage clustering is required, not nice-to-have.** Form a tight core at
   0.83, then **attach satellites to the cluster CENTROID at a much looser ~0.65–0.70**
   — a follow-up is close to the event's center even when far from individual members.
   This is the single highest-leverage recall fix.
2. **Entity + temporal edges, not just cosine.** Link articles sharing key entities
   within a tight time window even at moderate cosine — this bridges evolving-story
   drift (laos cave) that semantics alone misses.
3. **Cross-lingual** stays a monitored gap (Indic satellites).
4. **Some "events" are topic-streams** (ebola, ipl, rubio kept >50% noise) — the
   clustering unit must be the specific sub-event/day, not the topic.

## Honest status of the recall gate
This is now a **verified** recall set (denominator hand-cleaned). Trustworthy as a
lower-bound gate. Caveats: drop `akunuri` (n=2); treat `ebola`/`ipl` as topic-streams.
The number to beat after the two-stage design ships: **micro recall > ~75%.**

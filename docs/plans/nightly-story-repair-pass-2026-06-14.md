# Future Enhancement — Nightly LLM Story-Repair Pass ("the janitor")

**Status:** PROPOSED enhancement (post-launch tier). **Not a launch blocker.** Created 2026-06-14.
**Owner when picked up:** DB/engine chat (build) + analytics (eval gate).

> One-line: a nightly batch job that uses an LLM to read suspect stories' articles *together*,
> detect (a) wrong articles that don't belong and (b) clusters that are really N separate events,
> and then **eject** the bad articles / **split** the over-merges — with hard safety rails. It's the
> accurate-but-expensive cleanup tier that fixes what the cheap hourly loop can't.

---

## Why this exists / what it fixes
Our two known, residual defects can't be fixed by clustering params (proven 2026-06-14):
- **Precision false-merge** — junk-glued / outlier articles inside an otherwise-good story
  (e.g. "theresa may" gluing unrelated articles into cluster 46bd4ff7).
- **Over-merge** — a cluster that's really several small distinct events.
Both need *joint reading of the articles* — a bi-encoder comparing independent vectors can't do it;
an LLM (cross-encoder-style) can. Applied nightly + scoped, it's affordable.

## Where it fits — the 3-tier maintenance architecture
| Tier | Cadence | Method | Job |
|---|---|---|---|
| Forward loop | Hourly | cheap bi-encoder + scorer | assign new articles conservatively (join only when safe) |
| **Repair pass (this)** | **Nightly** | **LLM reads articles jointly** | **eject bad articles · split over-merges** |
| Full re-baseline | Weekly | batch re-cluster | correct drift |

The hourly loop is fast/dumb; the nightly pass is slow/smart and cleans up its mistakes.

## Design

### Step 1 — Cheap triage (don't LLM all 178K stories)
Select only *suspect* stories using signals we already compute: low member-fit (members far from
centroid), low shared-entity overlap, multi-sub-community structure, low title-cohesion, the
size×low-core gate — and **every story the forward loop grew that day** (new joins = riskiest).
→ hundreds–low-thousands of suspects/night, not the whole corpus. This keeps it affordable.

### Step 2 — Structural pre-split, then LLM verdict
Per suspect: Leiden sub-communities on its member subgraph (**reuse the giant-split
discriminator**). The LLM reads **representative articles per sub-community** (titles+leads —
can't feed 100s of full bodies) and returns a structured verdict:
- **COHERENT** → leave.
- **OUTLIERS** → list the article ids that don't belong → eject.
- **SPLIT into N** → confirm + label which sub-communities form which story.
The LLM judges the sample/sub-structure; **the actual member reassignment follows the Leiden
partition** (unseen members placed by structure, not by the LLM guessing each one). This is the
discriminator generalized to all suspects + an eject capability — largely existing machinery.

### Step 3 — Action layer (the risky part)
- **Eject**: outlier article → singleton / back into the forward-loop backlog to re-join correctly.
- **Split**: partition members into N new stories per confirmed sub-communities; stable IDs (one
  child keeps the parent id).
- **No casual "merge"** (the inverse) — merging angle-stories fights the B+ decision; only true
  duplicates, carefully, if ever.
- Touched stories → re-enrich + recompute importance + regenerate article.

## Safety rails (non-negotiable — this writes destructive changes to live stories)
- **Dry-run first** — log proposed ejects/splits; review before arming. (Detector proven before mutator.)
- **Confidence gate + judge corroboration** — act only on high-confidence verdicts; 2-vote
  concordance (like the discriminator's `KEEP|KEEP`); ambiguous → leave/flag.
- **Capped blast radius** — max ejects/splits per story per night; one bad LLM night can't shred the corpus.
- **Reversible + audited** — every action logged with the LLM's reasoning; one-command rollback.
- **Eval-gated** — run golden(134)/recall(20) after each night; regression → auto-pause + alert.

## Feasibility / cost
Nightly, scoped to suspects: hundreds–thousands of LLM calls via the **unified LLM pool
(Cerebras + Groq + local Qwen)** — rotate across hosted keys for throughput, fall back to local
Qwen (TRIJYA-7 4090) when hosted daily quotas exhaust. The discriminator already ran the LLM band
over ~100 clusters this way; this is the same shape at a controlled nightly budget.

## Hard parts (honest)
- **The action layer is the riskiest code in the system** — destructive live writes. Must be
  dry-run + capped + reversible + eval-gated before ever armed.
- **LLM judges on a sample** (can't read everything) → sample per sub-community + outliers; let
  structure place unseen members.
- **LLM can hallucinate** a split/eject → corroboration + confidence gate + the eval gate catch it.

## Build sequence (gated, measure-first)
1. **PROVE THE DETECTOR (this is the first test — no action layer, no mutation):** run triage +
   LLM verdict on a sample of suspects + known controls; analytics checks the verdicts are correct
   (catches the bad, spares the good). Cheap, read-only.
2. Only if the detector is accurate → build the **action layer in dry-run** (log proposed actions).
3. Review dry-run actions → wire writes behind a kill-switch → arm nightly, eval-gated.

## Relationship to other work
- Reuses the **giant-split discriminator** (sub-split + LLM judge).
- Complements the **forward loop** (hourly) — cleans its mistakes.
- An alternative/teammate to **alias-cleanup-v2** (which fixes junk at the extraction layer; this
  catches what slips through at the story layer).

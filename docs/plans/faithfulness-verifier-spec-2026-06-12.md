# Faithfulness Verifier Spec — the linchpin (2026-06-12)

**From:** analytics chat (design). **Status:** spec. **Priority:** highest — the
whole content product's safety rests here. **Build BEFORE the generator** (banked
rule: verifier-FIRST). Two consumers: story-enrichment (high-risk facts) and
content-gen prose. Pairs with `content-gen-design-2026-06-03.md` §6 +
`story-enrichment-spec-2026-06-12.md` + `worldwide-build-spec-2026-05-30.md` §6.

---

## What it is (one line)
A function that, given an **output** (a fact / summary / full article) and its
**source article(s)**, decides whether every checkable unit is **grounded in the
sources** — not whether it's plausible. Its false-negative rate IS our published-
error rate.

## The one non-negotiable distinction
**Source-grounded, NOT intrinsic plausibility.** The verifier must check the
output *against the specific source articles*, never against the model's world
knowledge. "Sounds true" is worthless; "supported by THIS source" is the only
question. A fabricated-but-plausible number must FAIL.

## Contract
```
verify(output, source_articles) -> {
  verdict: 'pass' | 'fail',
  units: [ { text, type, risk, status, source_span | null } ],
  // status: SUPPORTED | CONTRADICTED | UNSUPPORTED
  failing_units: [...]   // drives regenerate/fallback
}
```

## How it works
1. **Decompose** the output into atomic checkable units: claims, numbers,
   quotes, entity-attributions. (You can't verify a paragraph; you verify
   sentences.)
2. **Retrieve** the relevant source span(s) per unit (keeps it grounded + cheap —
   entail against the matched sentences, not the whole corpus).
3. **Entail** each unit against its source span: SUPPORTED / CONTRADICTED /
   UNSUPPORTED (not findable in source).
4. **Verdict:** any **UNSUPPORTED or CONTRADICTED high-risk unit → hard fail.**
   No benefit of the doubt — an unsourced claim is a fail, not a maybe.

## Risk tiers (strictness scales with harm)
- **HIGH — numbers, quotes, claims about named living people (libel):** strictest.
  A quote must appear ~verbatim and be attributed to the right speaker; a number
  must match exactly (unit included); a claim about a person must be explicitly
  supported. Must also catch **entity-confusion** (alias-overreach: a fact pinned
  to the wrong "Congress"/"Ali").
- **MED — summary statements, paraphrase:** must be entailed, paraphrase allowed.
- **LOW — topic/category:** sanity-check only.

## The eval harness IS the deliverable (verifier-FIRST)
The verifier is itself an LLM (local Qwen) — so it can be wrong. We do not trust
it; we **measure** it on a golden set, and re-run that golden set on every prompt/
model change (golden tests).

**Golden set** — hand-labeled `(source articles, output, label, fabrication_type)`
covering each failure mode adversarially:
- fabricated number · number off by one digit/unit · fabricated quote ·
  real quote misattributed to wrong speaker · plausible-but-unsourced claim ·
  false claim about a named person (libel) · entity-confusion (alias-overreach) ·
  cross-lingual (English output from non-English source) · correct controls
  (faithful outputs that must PASS).

**Metrics:**
- **False-negative rate (fabrication passed as faithful) = THE number** = our
  published-error rate. Target ≈0 on HIGH-risk units. This is the launch gate.
- **False-positive rate (faithful flagged)** = cost only (triggers a wasteful
  regenerate/fallback). Tolerate high FP to keep FN near zero — regeneration is
  cheap, a published falsehood is not.

## Integration — generate-then-verify loop
generate → verify → **pass** publish · **fail** regenerate → after N fails →
**fall back to the extractive `summary_executive` / source value** (never publish
unverified prose). So even a verifier miss is contained: the fallback path ships
nothing fabricated by construction.

## Model & cost
Local Qwen3-32B on the 4090 — free per call, so we can afford per-unit entailment
+ multiple verifier votes on HIGH-risk units (adversarial: several skeptics, fail
if any refutes). Latency batched offline for enrichment; inline for winners.

## Build order
1. Golden set first (the labels are the spec of "faithful").
2. Verifier v0 (decompose→retrieve→entail) + measure FN/FP on the golden set.
3. Iterate prompt/model until FN≈0 on HIGH-risk. THEN wire it as the gate.
4. Only after the gate proves out: build the generator behind it.

## Open
- Decompose + retrieve quality (bad retrieval → false UNSUPPORTED). Measure.
- How many adversarial votes on HIGH-risk units (cost vs FN). Tune on golden set.
- Cross-lingual entailment reliability (source in te/hi/ml, output en).

## Owner split
Analytics: this spec + the golden set design + the FN/FP eval. Product/DB chat:
the verifier service + the generate-then-verify wiring. Build is gated on the
golden set existing first.

# Single-source content generation — re-synthesise ONE article into a Rig Wire read (2026-06-18)

**Scope:** the content-generation path for a **1-article / single-source story** — NOT clustering.
Today the generator (`/root/rig/scripts/worldwide_gen_live.py`, `--aligned`, writes
`analytics.story_generated_v8`) sends single-source stories to a **stub**. This spec turns that into a
gated, faithful, original full article. Product constraints carried in (LOCKED): article body only, **no
sources shown, no AI label, byline "Rig Wire".**

## The risk that defines the design
A single source has **no corroboration**. With no sources shown + no AI label, a synthesised single-source
article is the **highest trust-exposure content on the site** — if that one outlet got it wrong, Rig Wire
reprints the error as its own neutral fact. So the system is **refusal-first**: it would rather emit nothing
than pad or fabricate (the "No facts available" disaster came from generating without a fact spine — never again).

## Eligibility gate (precondition — fail → stub, do NOT generate)
A single source is eligible only if ALL hold:
1. `full_text_scraped` present and ≥ ~150 words (not a paywall stub / 2-line brief).
2. `story_facts_v8` has ≥ 3 extracted facts (the spine). If empty → run fact-extraction first; still empty → stub.
3. `source_tier = 1` (reputable). Tier 2/3 single-source → stub or hold (don't synthesise from low-trust lone sources).
4. Not `is_template_family`, not titleless.

## Pipeline (per eligible story)
1. **Fact spine** — pull the atomic facts from `story_facts_v8` (reuse enrichment extractor if missing).
2. **Generate** (local `qwen2.5:32b` unlimited, or cloud `gpt-oss-120b` w/ `max_tokens≥1500`,
   `reasoning_effort:"low"`) — headline + deck + body, grounded ONLY in {facts + source full_text}.
3. **Faithfulness verify** (the hard gate — reuse the existing verifier pattern: **temp-0, 2-of-3 majority**,
   a DIFFERENT model from the writer): every claim in the output must be supported by the source text.
   Any unsupported claim → reject → regenerate once → else stub.
4. **Originality check** (copyright + dedup): max verbatim 5-gram overlap with the source below a threshold
   (e.g. < ~15%). Too close → regenerate with a stronger "restructure, do not paraphrase" instruction.
5. **Write** `story_generated_v8` `status=PUBLISHABLE`, `strategy='single-source'` only if 3 AND 4 pass;
   else `HELD`/stub. (Front-end `facts>0` + `PUBLISHABLE` guard then surfaces it as a real clickable read.)

## The generation prompt (the heart of it)
**System:**
> You are a neutral newswire editor. Rewrite the SOURCE into an original, neutral news article.
> RULES:
> 1. Use ONLY facts present in the SOURCE. Invent nothing. Add no background, context, or numbers not in the text.
> 2. Attribute every claim to its stated origin ("according to X", "officials said"). Do not state contested claims as fact.
> 3. Strip loaded/opinion/promotional language. Neutral tone, plain words.
> 4. Do NOT copy phrasing — fully restructure; lead with the single most newsworthy verified fact.
> 5. If the SOURCE lacks enough substance for a ~200-word factual article, output exactly `INSUFFICIENT`.
> Output JSON: {"headline","deck","body"}. Headline ≤ 12 words, specific, no clickbait.

**User:** `TOPIC / COUNTRY / DATE` + `FACTS:` (the ledger) + `SOURCE:` (title + full_text).

`INSUFFICIENT` → stub (refusal is a valid, expected output, not a failure).

## Failure modes handled
- Thin/paywalled source → eligibility gate → stub (never pad).
- Hallucinated background paragraph → faithfulness verifier rejects.
- Too close to original → originality check regenerates (copyright safe).
- Inherited bias / loaded framing → rule 2+3 (attribute + neutralise); verifier checks claims-as-fact.
- Lone low-trust source → tier gate → stub.

## Where it plugs in
`worldwide_gen_live.py`: change the single-source tier from `→ stub` to `→ this gated synthesis path`.
Everything else (cron `*/30`, `story_generated_v8` schema, the verifier harness) is unchanged.

## Senior caveat (do not skip)
Single-source synthesis should stay a **minority of the corpus** — genuine scoops from tier-1 outlets — not
the default for every lone brief. Multi-source synthesis (clustering ≥3 sources) is the trustworthy product;
single-source is the exception, gated hard. If volume pressure tempts loosening the tier-1 / ≥3-facts gate,
that's the moment trust erodes silently. Keep the gate; prefer a stub over a shaky read.

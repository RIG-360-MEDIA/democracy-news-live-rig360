# Content Generation — Locked Decisions (2026-06-12)

The decided recipe for Worldwide content generation. Built + validated this
session against the real model (Cerebras `gpt-oss-120b`). Pairs with
`faithfulness-verifier-spec`, `story-enrichment-spec`, `content-gen-bakeoff-2026-06-12.md`.

## 1. Architecture — generate-then-verify (LOCKED, built)
generate → verify → pass=publish · fail=regenerate → after N fails = fall back to
extractive summary. Nothing unverified ever ships. Verifier real-model FN=0.

## 2. Model
Cerebras `gpt-oss-120b` (osint keys). Gotchas: send a browser `User-Agent` (default
`python-urllib` is Cloudflare-blocked → 403/1010); rotate keys for 429s; request
≥2000 max_tokens and read `content` (gpt-oss puts reasoning in a separate channel;
low budget empties `content`). Local Qwen is off.
**SECURITY: the Cerebras/Groq keys are live and were exposed in transcript — ROTATE.**

## 3. Source-field recipe (LOCKED)
- **Multi-source stories → the fact-ledger:** `story_facts` + `story_quotes` +
  `story_timeline` + `story_geo` + `story_stance`, anchored by `story_clusters`
  (title, topic, subject, primary_entities). Clean, deduped, multi-source.
- **Single-source / raw fallback → `COALESCE(full_text_translated, full_text_scraped)`**
  (translated for non-English, original scraped for English). `full_text_scraped`
  is ~100% present; `full_text_translated` is non-English-only (~18-27%). Do NOT
  use `translated` alone — it's empty for English articles.
- `summary_executive` (~86-89% present) = supplementary, not sole dependency.

## 4. Writing strategy — TWO HYBRIDS (LOCKED; beat all individuals in the bake-off)
- **Rich + clean story → Hybrid A = Way 2 + 4 ("Persona-voiced Chronological"):**
  Atlantic staff-writer persona/voice driving a chronological development arc from
  the dated coverage, grounded in the fact spine. (Bake-off: 819w, tighter AND
  better than Way 2's 1182 or Way 4's 1377.)
- **Thin / single-article → Hybrid B = Way 1 + 5 + 4 ("Cited-Ledger Atlantic"):**
  Atlantic voice + strict ledger grounding + citation/self-check; honest-when-thin
  (stays short, flags "unverified", debunks artifacts instead of dramatizing).
  (Bake-off: 161w on a 95-word stub — right call; vs Way 2's 937w padding.)
- **Length follows the material. Never pad or invent to reach a length.** A faithful
  generator cannot expand a thin source without fabricating — short+honest is correct.

## 5. Anti-contamination — HYBRID guard (LOCKED): upstream split + B + C
Over-merged clusters produce smooth-but-wrong articles the verifier CAN'T catch
(every fact is individually true; the bundle is the problem). Tested 3 guards:
- **Guard A (segment ledger then write)** — UNRELIABLE (failed to split SMALL,
  over-split BIG into 10). DROP. Real splitting belongs upstream.
- **Guard B (refuse-mixed: "write only the dominant event, drop the rest")** —
  WINNER (contamination 0, reads as ONE on both test stories). Use at write-time.
- **Guard C (post-check: "one event or several?")** — reliable DETECTOR (caught
  every contaminated baseline). Use as the gate, not a fix.
- **Decision = upstream `_v8` split (root fix, preserves both stories) + Guard B
  (write-time focus) + Guard C (gate). Drop Guard A.**

## 6. Interim policy — until `_v8` split lands
- Single-article + small coherent clusters (≈95%) → generate now (no contamination).
- Big / multi-source clusters → generate behind Guard C; **HOLD (don't publish) if C
  flags SEVERAL** until `_v8` splits it. Don't let Guard B silently drop a real story.
- Everything runs DARK (generate + verify + flag, no auto-publish) for now.

## 6b. Validated 2026-06-12 (suite over 12 size-varied stories + scaled golden set)
- **Routing = by ledger, not size.** A is richer everywhere but hallucinates numbers
  ~2× B (4/12 stories, worst 6 ungrounded) → A only safe BEHIND the verifier.
  Best pattern: **A-first → verify → fall back to B → then extractive.**
  B is the safe default; A for big well-sourced stories.
- **Retry N = 2**, then fall back (most failures are a single bad number a retry fixes).
- **Numeric-disagreement: report the RANGE** ("between 20 and 25, never pick") — validated.
- **Headline: craft a new neutral hed** (source heds are tabloid/broken), verify it as a claim.
- **Per-placement:** lead = full hybrid (~600-1100w) · band = hed + ~2 sentences (~40-60w) · ticker = hed (~10-14w).
- **Verifier FN/FP at scale = 27/27, FN=0, FP=0** (11 + 16 cases). Holds; keep a standing set + monitor.
- **Guard-C reject rate = 58%** on the CURRENT pool → that fraction is HELD under the interim
  policy; re-measure on `_v8` (expected to drop sharply). Multi-source publishing is
  effectively blocked until `_v8` because of this.
- **Cost/latency: ~1.4s/call (Cerebras)** → non-constraint. Batch enrichment overnight,
  generate winners on-demand; key-rotation handles 429s.

## 7. Pending `_v8` (don't lock yet)
- Final multi-source synthesis quality; splitting one bundle into multiple articles.
- Calibrate routing thresholds + Guard-C reject rate on clean `_v8` data.

## 8. Data-quality notes feeding this
- `full_text_scraped` ~100%; `full_text_translated` non-English-only; `summary_executive`
  high-but-not-universal. `topic`=OTHER ~39% pre-enrichment (enrichment fixes).
  `primary_entities` carries junk (`theresa may`, `fan`) → entity-cleanup gated.

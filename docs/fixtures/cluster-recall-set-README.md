# Clustering Recall Set — independent ground truth (v0)
**File:** `cluster-recall-set.json` · **Built:** 2026-05-29 · **Threshold:** 0.80
**Method:** 20 hand-picked events, each defined by **lexical full-text search**
(independent of the embeddings), then measure what % of each event's embedded
articles the embedding approach links at cosine ≥ 0.80.

## Headline numbers
- **Micro recall 50.6%** · **Macro recall 55.7%**
- BUT this is a **contaminated floor**, not the true recall — read below before trusting it.

## ⚠️ The metric has three confounds (why 50% is misleading)
Inspecting the "not-recalled" articles, the misses split into three causes — only one is a real embedding failure:

1. **FTS false positives (NOT a recall failure — embedding was RIGHT to exclude).**
   The lexical query over-matched. e.g. `china_coal_mine` pulled in "Farmers fight battery storage," "Telangana Dy CM seeks education funds"; `iran_us_deal` pulled "CK Akonnor wins Kenyan league title." The embedding correctly did NOT cluster these — but they count against recall. This is the biggest confound.

2. **Bad event definitions (conflated sub-events).** `russia_oreshnik` (19.8%) lumped the Oreshnik strike + an LNG-tanker incident + a Belgorod attack + a dorm-strike fact-check under one query — genuinely *different* events. `iran_us_deal` (704 FTS hits) is a sprawling multi-week mega-topic, not one event. Low recall here = bad denominator, not a clustering miss.

3. **Genuine recall misses (the real signal) — two kinds:**
   - **Cross-lingual:** `[kn] ಚೀನಾದ ಕಲ್ಲಿದ್ದಲು ಗಣಿ` (Kannada "China coal mine") left out of the coal-mine cluster; Kannada Iran/Rubio articles isolated. Indic-language same-event articles sit under 0.80.
   - **Satellite coverage:** same event, different angle/follow-up, English, sitting at 0.75–0.80. e.g. california "Thousands evacuated… failing chemical tank" and "40,000 under evacuation orders" left out of the chem-tank cluster; Gabbard "successor Aaron Lukas" / "4th woman to exit" articles left out of the resignation cluster.

## True recall (discounting confounds 1 & 2)
On **well-defined, English-dominant events**, recall is much healthier:
tokyo_mall 100% · laos_cave 100% · harmanpreet 75% · gabbard 73% · ipl_kkr_dc 65% ·
pakistan_train 63% · california 61% · philippines 53%. The **tight core clusters; the edges (satellites + other languages) drop.** That's a precision-favoring threshold doing its job — normal for news at a fixed cutoff.

## What this proves for the build
1. **Recall is the weaker dimension** (precision was ~91%; real recall ~60–75% on clean events). Expected, and fixable.
2. **Two concrete recall levers, both already on the roadmap:**
   - Lower threshold to ~0.78–0.80 (catches satellites + cross-lingual) — safe because the blob guard holds precision independently.
   - **Two-stage "form tight, attach loose":** form clusters at 0.83, then attach satellite articles to an existing cluster *centroid* at a looser 0.75. Higher recall without re-introducing blobs.
3. **Cross-lingual (esp. Kannada/Odia) is the recurring recall gap** — lowest-resource in LaBSE. Monitor explicitly.

## Limitation — this is v0, needs a verification pass
The recall *denominator* is contaminated by FTS false positives (confound 1) and a few bad event definitions (confound 2). **Before this is a trustworthy recall gate, the FTS matches per event must be human-verified** (drop the non-event articles) so the denominator is the true set. That's the "second adjudicator" pass. Until then, treat these numbers as a **lower bound** and use the *not-recalled samples* (real misses) as the actionable signal.

## How to use
Per event: re-cluster `article_ids_recalled + article_ids_isolated`, check how many land in the event's main cluster. The `not_recalled_samples` are the human-readable misses to inspect.

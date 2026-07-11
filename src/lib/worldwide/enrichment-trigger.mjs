// src/lib/worldwide/enrichment-trigger.mjs
// Stage-2 enrichment RE-RUN TRIGGER — decides when a story's LLM data-sheet
// must be (re)generated. Pure deterministic logic (no LLM, no DB) so it is
// fully unit-testable. See docs/plans/story-enrichment-spec-2026-06-12.md.
//
// Rule: formation -> always run. After that, re-run only on MATERIAL change
// (state-signature shift) AND outside the debounce window AND not frozen.

export const DEFAULTS = {
  debounceHours: 1,        // at most one re-run per story per N hours
  freezeHours: 72,         // stop re-enriching once a story is this stale
  sizeMilestones: [3, 10], // crossing these article-counts forces a re-run while volatile
};

/**
 * State signature = the material content of a story that, if changed, warrants
 * re-enrichment. Sources/entities/facts as SETS (order-independent). Reprints
 * that add no new source/entity/fact leave this unchanged.
 * @param {{independentSources:string[], entities:string[], factKeys:string[]}} s
 */
export function computeStateSignature(s) {
  const norm = (arr) => Array.from(new Set((arr || []).map((x) => String(x).trim().toLowerCase()))).sort();
  return {
    sources: norm(s.independentSources),
    entities: norm(s.entities),
    facts: norm(s.factKeys),
  };
}

function setDelta(prev, curr) {
  const p = new Set(prev), c = new Set(curr);
  let added = 0;
  for (const x of c) if (!p.has(x)) added++;
  return added; // only growth matters for "material new development"
}

/**
 * @param {object} args
 * @param {object|null} args.prevSignature  previous signature, or null if story is new (formation)
 * @param {object} args.currSignature       current signature (from computeStateSignature)
 * @param {number} args.prevArticleCount
 * @param {number} args.currArticleCount
 * @param {number|null} args.lastRunAtMs     ms timestamp of last enrichment, null if never
 * @param {number} args.nowMs
 * @param {number} args.lastMaterialChangeMs ms timestamp of the story's last material change (for freeze)
 * @param {object} [args.cfg]
 * @returns {{run:boolean, reason:string}}
 */
export function shouldReenrich({
  prevSignature, currSignature, prevArticleCount, currArticleCount,
  lastRunAtMs, nowMs, lastMaterialChangeMs, cfg = DEFAULTS,
}) {
  // 1. Formation: never enriched -> always run.
  if (lastRunAtMs == null || prevSignature == null) return { run: true, reason: 'formation' };

  // 2. Freeze: story hasn't materially changed in freezeHours -> never run again.
  const staleMs = nowMs - lastMaterialChangeMs;
  if (staleMs >= cfg.freezeHours * 3600_000) return { run: false, reason: 'frozen' };

  // 3. Debounce: ran too recently -> hold (batch changes into the next window).
  const sinceRun = nowMs - lastRunAtMs;
  if (sinceRun < cfg.debounceHours * 3600_000) return { run: false, reason: 'debounced' };

  // 4. Material change? new independent source OR new entity OR new fact.
  const newSrc = setDelta(prevSignature.sources, currSignature.sources);
  const newEnt = setDelta(prevSignature.entities, currSignature.entities);
  const newFact = setDelta(prevSignature.facts, currSignature.facts);
  const crossedMilestone = (cfg.sizeMilestones || []).some(
    (m) => prevArticleCount < m && currArticleCount >= m,
  );

  if (newSrc > 0) return { run: true, reason: `new_source(${newSrc})` };
  if (newEnt > 0) return { run: true, reason: `new_entity(${newEnt})` };
  if (newFact > 0) return { run: true, reason: `new_fact(${newFact})` };
  if (crossedMilestone) return { run: true, reason: 'size_milestone' };

  // 5. Reprints only -> nothing material changed.
  return { run: false, reason: 'no_material_change' };
}

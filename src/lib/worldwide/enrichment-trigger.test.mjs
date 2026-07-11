// Run: node src/lib/worldwide/enrichment-trigger.test.mjs
import { shouldReenrich, computeStateSignature, DEFAULTS } from './enrichment-trigger.mjs';

let pass = 0, fail = 0;
const H = 3600_000;
const now = 1_000_000_000_000; // fixed clock
const sig = (src, ent, fact) => computeStateSignature({ independentSources: src, entities: ent, factKeys: fact });
const base = sig(['reuters', 'bbc'], ['iran', 'trump'], ['deaths:20']);

function check(name, got, want) {
  const ok = got === want;
  ok ? pass++ : fail++;
  if (!ok) console.log(`FAIL ${name}: got '${got}', want '${want}'`);
  else console.log(`PASS ${name} -> ${got}`);
}

// 1. Formation
check('formation', shouldReenrich({ prevSignature: null, currSignature: base, prevArticleCount: 0, currArticleCount: 1, lastRunAtMs: null, nowMs: now, lastMaterialChangeMs: now }).reason, 'formation');

// 2. Reprints only (identical signature, past debounce, fresh change) -> no material change
check('reprints_no_change', shouldReenrich({ prevSignature: base, currSignature: sig(['BBC', 'Reuters'], ['Trump', 'Iran'], ['deaths:20']), prevArticleCount: 10, currArticleCount: 60, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now - 2 * H }).reason, 'no_material_change');

// 3. New independent source
check('new_source', shouldReenrich({ prevSignature: base, currSignature: sig(['reuters', 'bbc', 'ap'], ['iran', 'trump'], ['deaths:20']), prevArticleCount: 10, currArticleCount: 11, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now }).run, true);

// 4. New entity
check('new_entity', shouldReenrich({ prevSignature: base, currSignature: sig(['reuters', 'bbc'], ['iran', 'trump', 'netanyahu'], ['deaths:20']), prevArticleCount: 10, currArticleCount: 11, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now }).reason, 'new_entity(1)');

// 5. New fact
check('new_fact', shouldReenrich({ prevSignature: base, currSignature: sig(['reuters', 'bbc'], ['iran', 'trump'], ['deaths:20', 'missiles:12']), prevArticleCount: 10, currArticleCount: 11, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now }).reason, 'new_fact(1)');

// 6. Size milestone (1 -> 3), signature otherwise unchanged
check('size_milestone', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 1, currArticleCount: 3, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now }).reason, 'size_milestone');

// 7. Debounce: materially changed but ran 30 min ago -> hold
check('debounced', shouldReenrich({ prevSignature: base, currSignature: sig(['reuters', 'bbc', 'ap'], ['iran', 'trump'], ['deaths:20']), prevArticleCount: 10, currArticleCount: 11, lastRunAtMs: now - 0.5 * H, nowMs: now, lastMaterialChangeMs: now }).reason, 'debounced');

// 8. Freeze: no material change in >72h -> frozen (even though past debounce)
check('frozen', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 10, currArticleCount: 10, lastRunAtMs: now - 80 * H, nowMs: now, lastMaterialChangeMs: now - 80 * H }).reason, 'frozen');

// 9. Boundary: exactly at debounce window edge -> NOT debounced, proceeds (no change here -> no_material_change)
check('debounce_boundary', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 10, currArticleCount: 10, lastRunAtMs: now - DEFAULTS.debounceHours * H, nowMs: now, lastMaterialChangeMs: now - DEFAULTS.debounceHours * H }).reason, 'no_material_change');

// 10. Boundary: exactly at freeze edge -> frozen
check('freeze_boundary', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 10, currArticleCount: 10, lastRunAtMs: now - 5 * H, nowMs: now, lastMaterialChangeMs: now - DEFAULTS.freezeHours * H }).reason, 'frozen');

// 11. Source REMOVED, none added (set shrinks) -> not material (only growth counts)
check('source_removed_only', shouldReenrich({ prevSignature: base, currSignature: sig(['reuters'], ['iran', 'trump'], ['deaths:20']), prevArticleCount: 10, currArticleCount: 10, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now - 2 * H }).reason, 'no_material_change');

// 12. computeStateSignature: case/order/dupe invariance
const a = sig(['Reuters', 'reuters', 'BBC'], ['Iran'], []);
const b = sig(['bbc', 'REUTERS'], ['iran'], []);
check('signature_normalized', JSON.stringify(a) === JSON.stringify(b) ? 'equal' : 'diff', 'equal');

// 13. Milestone already passed earlier (prev 5 -> curr 12, milestone 10 crossed)
check('milestone_10', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 5, currArticleCount: 12, lastRunAtMs: now - 2 * H, nowMs: now, lastMaterialChangeMs: now }).reason, 'size_milestone');

// 14. Single-article story that never grows: formation only, then frozen forever
check('single_then_frozen', shouldReenrich({ prevSignature: base, currSignature: base, prevArticleCount: 1, currArticleCount: 1, lastRunAtMs: now - 100 * H, nowMs: now, lastMaterialChangeMs: now - 100 * H }).reason, 'frozen');

console.log(`\n=== enrichment-trigger: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);

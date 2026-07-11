// Run: node src/lib/worldwide/verifier.semantic.test.mjs
// Validates the verifier's SEMANTIC CLAIM path on real article text.
// entailClaim verdicts here are produced by a reference LLM (the assistant) reasoning
// against each source — NOT a mock. This validates the design + aggregation for the
// hard semantic cases deterministic checks can't catch. Production FN-rate on
// Cerebras/Qwen is a separate measurement (needs that model + consent).

import { verify } from './verifier.mjs';

const S1 = `The USMNT started their World Cup campaign strongly with a 2-0 lead over Paraguay at Los Angeles Stadium. Damián Bobadilla scored an own goal within the first 10 minutes, followed by Folarin Balogun doubling the lead in the 30th minute. Coach Mauricio Pochettino leads the team, ranked 17th by FIFA.`;
const S2 = `In Chennai today (June 13, 2026), petrol is being sold at Rs. 107.77 per litre, diesel at Rs. 99.55 per litre, and CNG at Rs. 96.00 per kg. Oil companies determine prices based on crude oil costs and the rupee-dollar exchange rate.`;
const S3 = `The FIFA World Cup 2026 continues on Saturday, June 13, with four group-stage matches: Qatar vs Switzerland, Brazil vs Morocco, Haiti vs Scotland, and Australia vs Turkiye. Matches take place in the US and Canada.`;

// each: [name, source, claim, refEntailment(real reasoning), intendedOverall, why]
const CASES = [
  // faithful paraphrase / inference
  ['paraphrase_score', S1, 'The United States led Paraguay two-nil.', 'SUPPORTED', 'pass', '"2-0 lead over Paraguay" paraphrased'],
  ['attribution_correct', S1, 'Balogun doubled the lead in the 30th minute.', 'SUPPORTED', 'pass', 'matches source exactly'],
  ['numeric_inference', S2, 'Diesel costs under 100 rupees a litre in Chennai.', 'SUPPORTED', 'pass', '99.55 < 100 — entailed inference'],
  ['fixture_faithful', S3, 'Scotland play Haiti in the group stage.', 'SUPPORTED', 'pass', '"Haiti vs Scotland" listed'],
  // CONTRADICTIONS the deterministic path cannot catch (numbers/entities present, relation false)
  ['false_comparison', S2, 'Petrol is cheaper than diesel in Chennai.', 'CONTRADICTED', 'fail', 'petrol 107.77 > diesel 99.55 — both numbers present, comparison false'],
  ['entity_confusion', S1, 'Balogun scored the own goal.', 'CONTRADICTED', 'fail', 'own goal was Bobadilla, not Balogun — misattribution'],
  ['contradicted_agent', S2, 'The government sets fuel prices in Chennai.', 'CONTRADICTED', 'fail', 'source says oil companies determine prices'],
  ['contradicted_venue', S3, 'All four matches are held in Qatar.', 'CONTRADICTED', 'fail', 'source says US and Canada'],
  ['intent_contradiction', S1, 'Bobadilla deliberately scored for Paraguay.', 'CONTRADICTED', 'fail', 'own goal ≠ deliberate score for own side'],
  // plausible-but-UNSUPPORTED (not in source) — the libel/hallucination trap
  ['plausible_unsupported', S1, 'Pochettino was sacked after the match.', 'UNSUPPORTED', 'fail', 'not in source, plausible — must NOT pass'],
  ['unsupported_team', S3, 'Argentina play on June 13.', 'UNSUPPORTED', 'fail', 'Argentina not among the four listed matches'],
];

let pass = 0, fail = 0, refErrors = 0;
for (const [name, src, claim, refVerdict, intended, why] of CASES) {
  const r = verify('', src, { entailClaim: () => refVerdict, fields: { claims: [claim] } });
  const aggOk = r.verdict === intended;
  // sanity: a SUPPORTED ref must mean faithful(pass); non-SUPPORTED must mean fail
  const refConsistent = (refVerdict === 'SUPPORTED') === (intended === 'pass');
  if (!refConsistent) refErrors++;
  aggOk && refConsistent ? pass++ : fail++;
  console.log(`${aggOk && refConsistent ? 'PASS' : 'FAIL'} ${name} [ref=${refVerdict}] -> ${r.verdict} | ${why}`);
}
console.log(`\n=== verifier semantic claims: ${pass} passed, ${fail} failed (ref-inconsistencies ${refErrors}) ===`);
process.exit(fail ? 1 : 0);

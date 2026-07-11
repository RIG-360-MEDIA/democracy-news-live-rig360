// Run: node src/lib/worldwide/verifier.test.mjs
import { verify } from './verifier.mjs';

const SOURCE = `At least 20 people were killed and 45 injured when US forces launched strikes on three sites near Tehran on Tuesday. President Trump said, "We will not allow Iran to build a nuclear weapon." Iran's foreign ministry condemned the attack. Oil prices rose 4 percent.`;

// mock claim entailer (production = local Qwen). Validates WIRING, not entailment accuracy.
const entail = (claim) => /us forces launched strikes|struck .*tehran|killed and .*injured/i.test(claim) ? 'SUPPORTED' : 'UNSUPPORTED';

let pass = 0, fail = 0;
function expect(name, output, wantVerdict, fields = {}) {
  const r = verify(output, SOURCE, { entailClaim: entail, fields });
  const ok = r.verdict === wantVerdict;
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} -> ${r.verdict}${ok ? '' : ` (want ${wantVerdict}; failing: ${r.failing.map(u => u.raw || u.text).join('; ')})`}`);
}

// FAITHFUL controls (must PASS)
expect('faithful_number', '20 people were killed in the strikes.', 'pass');
expect('faithful_percent', 'Oil prices rose 4 percent.', 'pass');
expect('faithful_quote', 'Trump said "We will not allow Iran to build a nuclear weapon."', 'pass',
  { quotes: [{ text: 'We will not allow Iran to build a nuclear weapon', speaker: 'Trump' }] });
expect('faithful_claim', 'US forces launched strikes near Tehran.', 'pass', { claims: ['US forces launched strikes near Tehran'] });
expect('faithful_mixed', '20 people were killed when US forces launched strikes near Tehran.', 'pass',
  { claims: ['US forces launched strikes near Tehran'] });

// FABRICATIONS (must FAIL)
expect('fabricated_number', '150 people were killed.', 'fail');
expect('number_off_by_digit', '200 people were killed.', 'fail');
expect('unit_context_wrong', '20 missiles were launched.', 'fail'); // 20 is in source but as "people", not "missiles"
expect('fabricated_quote', 'Trump said "Iran will pay a heavy price."', 'fail',
  { quotes: [{ text: 'Iran will pay a heavy price', speaker: 'Trump' }] });
expect('misattributed_quote', 'Netanyahu said "We will not allow Iran to build a nuclear weapon."', 'fail',
  { quotes: [{ text: 'We will not allow Iran to build a nuclear weapon', speaker: 'Netanyahu' }] });
expect('unsupported_claim', 'Russia condemned the attack.', 'fail', { claims: ['Russia condemned the attack'] });
expect('one_bad_in_good', '20 people were killed and oil rose 99 percent.', 'fail'); // 99 fabricated -> fail-closed

console.log(`\n=== verifier golden set: ${pass} passed, ${fail} failed ===`);
process.exit(fail ? 1 : 0);

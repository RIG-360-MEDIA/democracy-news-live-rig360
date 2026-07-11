// Run: node src/lib/worldwide/verifier.realdata.test.mjs
// Grounds the verifier on REAL corpus text pulled from the DB (scratch/worldwide/real_sample.txt).
import { readFileSync } from 'node:fs';
import { verify } from './verifier.mjs';

const raw = readFileSync(new URL('../../../scratch/worldwide/real_sample.txt', import.meta.url), 'utf8');
const source = raw.split('~')[0].trim(); // real article summary
const entail = (c, s) => (s.toLowerCase().includes('hantavirus') && /hantavirus|cruise|hondius/i.test(c)) ? 'SUPPORTED' : 'UNSUPPORTED';

let pass = 0, fail = 0;
const t = (name, output, want, fields = {}) => {
  const r = verify(output, source, { entailClaim: entail, fields });
  const ok = r.verdict === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name} -> ${r.verdict}`);
};

// faithful: 17 + "american" both appear in the real summary
t('real_faithful_number', '17 American passengers were aboard.', 'pass');
// fabricated number not in summary
t('real_fabricated_number', '99 American passengers were aboard.', 'fail');
// off-by-digit (170 not in source; 17 is, but word-boundary blocks)
t('real_off_by_digit', '170 American passengers were aboard.', 'fail');
// faithful claim (entailed)
t('real_faithful_claim', 'A passenger tested positive for Hantavirus.', 'pass', { claims: ['A passenger tested positive for Hantavirus on the cruise'] });
// unsupported claim
t('real_unsupported_claim', 'The ship sank off the coast.', 'fail', { claims: ['The ship sank off the coast'] });

console.log(`\n=== verifier real-data: ${pass} passed, ${fail} failed (source len ${source.length}) ===`);
process.exit(fail ? 1 : 0);

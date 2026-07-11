// src/lib/worldwide/verifier.mjs
// Stage-2 FAITHFULNESS VERIFIER (core). See docs/plans/faithfulness-verifier-spec-2026-06-12.md.
//
// Source-grounded, NOT plausibility. HIGH-risk units (numbers, quotes) are
// verified DETERMINISTICALLY against the source text — no LLM, no LLM risk.
// Semantic claims use a pluggable `entailClaim` (production = local Qwen).
//
// verify(output, source, {entailClaim}) -> { verdict:'pass'|'fail', units:[...] }

const norm = (s) => String(s || '')
  .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/\s+/g, ' ').trim();

const normNum = (s) => String(s).replace(/,/g, '').replace(/\.0+$/, '');

/** Extract checkable units from an output string + optional structured fields. */
export function decompose(output, fields = {}) {
  const units = [];
  const text = norm(output);

  // NUMBERS (HIGH risk) — integers/decimals, keep a small right-context word as the "unit".
  const numRe = /(\d[\d,]*(?:\.\d+)?)(\s+[a-z%]+)?/gi;
  let m;
  while ((m = numRe.exec(text)) !== null) {
    units.push({ type: 'number', risk: 'high', value: normNum(m[1]), unitWord: (m[2] || '').trim().toLowerCase(), raw: m[0].trim() });
  }
  // QUOTES (HIGH risk) — double-quoted spans; attribution from fields.quotes if given.
  const qRe = /"([^"]{6,})"/g;
  while ((m = qRe.exec(text)) !== null) {
    const q = m[1];
    const speaker = (fields.quotes || []).find((x) => norm(x.text).includes(norm(q)) || norm(q).includes(norm(x.text)))?.speaker || null;
    units.push({ type: 'quote', risk: 'high', text: q, speaker });
  }
  // CLAIMS (med risk) — caller supplies decomposed claim sentences (LLM or rules upstream).
  for (const c of fields.claims || []) units.push({ type: 'claim', risk: 'med', text: c });
  return units;
}

function verifyNumber(u, src) {
  const sl = src.toLowerCase(); // case-insensitive grounding (real source text is mixed-case)
  // exact number must appear with word boundaries (so 20 != 200 != 2025)
  const present = new RegExp(`(^|[^\\d.,])${u.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\d.,]|$)`).test(sl);
  if (!present) return { ...u, status: 'UNSUPPORTED' };
  // unit-context: if the output attached a unit word, that word should appear in source
  if (u.unitWord && u.unitWord.length > 2 && !sl.includes(u.unitWord)) return { ...u, status: 'UNSUPPORTED', note: 'unit_context_missing' };
  return { ...u, status: 'SUPPORTED' };
}

function verifyQuote(u, src) {
  const q = norm(u.text).toLowerCase();
  const s = src.toLowerCase();
  if (!s.includes(q)) return { ...u, status: 'UNSUPPORTED' };
  // attribution: if a speaker is claimed, their surname must appear within 200 chars of the quote
  if (u.speaker) {
    const idx = s.indexOf(q);
    const surname = norm(u.speaker).split(' ').pop().toLowerCase();
    const window = s.slice(Math.max(0, idx - 200), idx + q.length + 200);
    if (surname.length > 2 && !window.includes(surname)) return { ...u, status: 'CONTRADICTED', note: 'misattributed' };
  }
  return { ...u, status: 'SUPPORTED' };
}

/**
 * @param {string} output  the generated/extracted text
 * @param {string} source  concatenated source article text
 * @param {{entailClaim?:(claim:string,source:string)=>'SUPPORTED'|'CONTRADICTED'|'UNSUPPORTED', fields?:object}} opts
 */
export function verify(output, source, opts = {}) {
  const src = norm(source);
  const entailClaim = opts.entailClaim || (() => 'UNSUPPORTED'); // conservative default (no LLM = can't confirm)
  const units = decompose(output, opts.fields || {}).map((u) => {
    if (u.type === 'number') return verifyNumber(u, src);
    if (u.type === 'quote') return verifyQuote(u, src);
    if (u.type === 'claim') return { ...u, status: entailClaim(u.text, src) };
    return { ...u, status: 'UNSUPPORTED' };
  });
  // Verdict: any CONTRADICTED, or any HIGH-risk not SUPPORTED, or any claim UNSUPPORTED -> fail.
  const failing = units.filter((u) =>
    u.status === 'CONTRADICTED' ||
    (u.risk === 'high' && u.status !== 'SUPPORTED') ||
    (u.type === 'claim' && u.status !== 'SUPPORTED'));
  return { verdict: failing.length ? 'fail' : 'pass', units, failing };
}

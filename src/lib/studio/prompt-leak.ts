// Defensive check: never render an internal prompt / topic brief as story copy (F9). Client-safe.
//
// Door B stories start life as an editor's brief ("Research the impact of the new tariff on Indian
// exporters"). If one is published before the generator replaced it — or a hand-authored story is
// saved with its working note — the instruction could reach readers verbatim.
//
// Two levels, because a wrong drop hides real journalism:
//   'leak'    — HIGH confidence: starts with an imperative research/writing verb + its object AND
//               carries a prompt cue ("impact of", "in 200 words", "600-word", "article about",
//               "for the reader"). The reader mappers drop the story (headline) or blank the dek.
//   'suspect' — starts like an instruction ("Investigate whether …", "Prompt: …") but has no prompt
//               cue. NEVER hidden from readers; only flagged to editors on the Studio card.
// Body paragraphs are never filtered.

export type PromptLeakLevel = 'none' | 'suspect' | 'leak';

const IMPERATIVE =
  '^\\s*(?:please\\s+)?(?:research|investigate|analy[sz]e|examine|summari[sz]e|write|draft|generate|compose|look\\s+into|find\\s+out(?:\\s+about)?)\\s+(?:the|how|why|whether|what|who|an?|me)\\b';

const PROMPT_CUE =
  '\\b(?:impact|effects?)\\s+of\\b|\\bfor\\s+(?:the|our)\\s+readers?\\b|\\bin\\s+\\d+\\s+words\\b|\\b\\d+[-\\s]word\\b|\\b(?:article|story|piece|explainer|report|summary)\\s+(?:about|on)\\b';

const LEAK = new RegExp(`${IMPERATIVE}.*(?:${PROMPT_CUE})`, 'i');
const IMPERATIVE_ONLY = new RegExp(IMPERATIVE, 'i');
const PROMPT_LABEL = /^\s*(?:topic\s+brief|prompt|system\s+prompt|instructions?)\s*:/i;

export function promptLeakLevel(text: string | null | undefined): PromptLeakLevel {
  if (!text) return 'none';
  if (LEAK.test(text)) return 'leak';
  if (IMPERATIVE_ONLY.test(text) || PROMPT_LABEL.test(text)) return 'suspect';
  return 'none';
}

/** High-confidence only — the reader site drops/blanks on this. */
export function isPromptLeak(text: string | null | undefined): boolean {
  return promptLeakLevel(text) === 'leak';
}

/** `text` unless it is a high-confidence prompt leak (→ null). */
export function withoutPromptLeak(text: string | null): string | null {
  return isPromptLeak(text) ? null : text;
}

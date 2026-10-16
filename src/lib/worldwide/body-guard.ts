// A generated body where a section's content is a Python dict/list repr, not prose — the generator's LLM
// returned structured JSON for a section (e.g. `{'name': …}` / `[{'name': …}]`) and the box assembler
// str()'d it into the markdown. The body starts with a `## Heading`, so the `left(btrim(body),1) <> '{'`
// parse-fail guard misses it. Any line opening with a bracket followed by a quote/bracket is never prose.
// Used as a parameter to Postgres `!~` (ARE) and valid as a JS RegExp, so the test exercises the same pattern.
export const MALFORMED_BODY_PATTERN = String.raw`(^|\n)\s*[\[{]\s*['"\[{]`;

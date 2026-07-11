# tools/prompts/

Reusable prompt templates.

These are **not** slash commands (those live in `.claude/commands/`), and
**not** skill instructions (those live in `.claude/skills/`). These are raw
prompt texts the team copy-pastes when working *outside* this repo's Claude
Code session — into a fresh ChatGPT window, into a one-off Claude
conversation, into a colleague's machine that isn't set up with the project.

---

## What goes here

- **Persona briefs.** Short character-card prompts that brief a fresh LLM
  session on a recurring role (editorial reviewer, copy editor, art director,
  AXIOM, aryan-mehta). The session-internal versions live in
  `.claude/skills/`; the portable copies live here.
- **Generation templates.** "Produce a Flash story in the Rig Wire voice",
  "draft a Newsletter intro paragraph for date X", "generate an All Sides
  perspective summary".
- **Audit prompts.** "Review this article for entity-disambiguation errors",
  "score this summary against its source on a 1–5 faithfulness scale",
  "evaluate this ranking for filter-bubble risk".

## What does NOT go here

- Anything that runs *inside* the Claude Code session — that's
  `.claude/commands/` or `.claude/skills/`.
- Secrets, API keys, or private user data, even in examples.
- Drafts of actual editorial content. Those belong in `<feature>-data.ts`.

## File shape

One prompt per file. Markdown. Header:

```md
# <prompt name>

**Use when:** <one line on the trigger>
**Output expected:** <one line on what shape of result>

---

<the prompt itself, copy-paste-ready>
```

Keep them short. A two-page prompt is a sign the prompt is doing too many
things — split it. Long prompts also fail silently when context windows
fill; a focused prompt produces a focused answer.

## Naming

`<role-or-task>.md` — `editorial-reviewer.md`, `faithfulness-scorer.md`,
`flash-story-generator.md`. No dates, no versions. Iterate the file in place;
git holds the history.

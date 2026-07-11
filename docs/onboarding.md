# Onboarding — Rig Wire

You can be productive in this codebase in 30 minutes. Read in this order.

---

## 1. Know what we are (5 min)

Open **`docs/CONTEXT.md`** — the product, the audience, the design
posture. Don't read the code yet. Read the *why*.

## 2. Know where things live (5 min)

Open **`STRUCTURE.md`** (project root). Memorise one table — the
folder-slug ↔ product-name mapping. The folder is called `minute/`;
the product is called Flash. This dissonance has a reason (ADR 0001)
and you don't need to understand it on day one. You just need to know it.

## 3. Know the rules (10 min)

In order:

1. **`CLAUDE.md`** (project root) — five discipline principles.
   The one that bites first: *operate surgically. Touch only what the
   task requires.*
2. **`.claude/rules/code-style.md`** — six Rig Wire-specific rules.
3. **`.claude/rules/testing.md`** — why we have no tests yet. (Yes,
   on purpose.)
4. **`.claude/rules/api-conventions.md`** — forward-looking. Skim it.

## 4. Know the decisions (5 min)

Open **`docs/decisions/`**. Read the four ADR titles. Open the one
that matches whatever you're confused about. The format is the same
for every ADR: status, context, decision, consequences, rejected
alternatives, trigger to revisit.

## 5. Run the thing (5 min)

```
npm install
npm run dev
```

Open `http://localhost:3000`. Click through every mode card. Open
`/today`. Open `/minute`. Open `/long-read/<any-slug>`. You now know
what each mode *feels* like — which means the code makes sense when
you open it.

## 6. Make your first change

Pick the smallest version of your task and do it. If you're touching
a mode page:

- The orchestrator is `src/components/<mode>/<mode>-page.tsx`.
- The content is in `src/components/<mode>/<mode>-data.ts` (or
  `stories.ts` for Flash).
- The metadata (name, tagline, accent color) is in `src/lib/modes.ts`.

After the change, run `/review` (see `.claude/commands/review.md`).

---

## Common day-one mistakes

- **Renaming a folder** because you read its display name in the
  product. Don't. See ADR 0001.
- **Hardcoding `"Flash"` or `"Newsletter"` as a string literal**
  anywhere outside `src/lib/modes.ts`. Don't. See ADR 0002 and
  code-style rule 3.
- **Importing from one mode folder into another.** Don't. See ADR 0003.
- **Adding tests for a static prototype component.** Don't. See
  `.claude/rules/testing.md`.
- **Centralising content into a new shared file** "for tidiness".
  Don't. See ADR 0004.

## Where to ask

If a rule contradicts the task you've been given, surface the
contradiction *before* writing code. The rules are heuristics, not
constitutional law — but they exist for a reason, and breaking one
without naming the reason is the failure mode they were designed to
prevent.

## What to read next (optional, by trigger)

| When you're about to... | Read |
| ----------------------- | ---- |
| design a feature        | `docs/architecture.md` |
| use unfamiliar terminology | `docs/glossary.md` |
| touch ranking, summarisation, model output | `.claude/skills/aryan-mehta/SKILL.md` |
| review a teammate's change | `.claude/skills/code-review/SKILL.md` |
| refactor anything       | `.claude/skills/refactor/SKILL.md` |
| cut a release           | `.claude/skills/release/SKILL.md` |
| ship to prod            | `.claude/skills/deploy/SKILL.md` |

You do not need to read these on day one. You will know when you need them.

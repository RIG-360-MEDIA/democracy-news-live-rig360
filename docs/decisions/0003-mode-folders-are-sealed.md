# ADR 0003 — Mode folders are sealed

**Status:** Accepted · 2026-05-28
**Authors:** core team
**Related:** ADR 0004

## Context

Each of the six modes evolves at a different cadence:

| Mode       | Iteration speed                       |
| ---------- | ------------------------------------- |
| Flash      | Weekly A/B (Reels-style UX)           |
| Newsletter | Monthly (copy iteration)              |
| All Sides  | Monthly (bias bar algorithm)          |
| Worldwide  | Quarterly (article layout)            |
| Aftermath  | Quarterly (flip-book design)          |
| Pocket     | Sporadic (queue features)             |

An early prototype let Newsletter import a card primitive from Flash.
Two weeks later a Flash refactor (rename of an internal prop) broke
Newsletter silently. The Newsletter author had no idea Flash was their
upstream dependency. The lesson: the coupling cost is paid not when you
write the import, but the next time the source mode iterates.

## Decision

`src/components/<mode>/` is a closed module. Components inside one mode
folder **must not** import from another mode folder. Shared primitives
go in `src/components/brand/` (presentational) or `src/lib/` (logic).

## Consequences

**Positive**
- Each mode can refactor in isolation. A Flash sub-component rename
  cannot break Newsletter.
- The dependency graph between modes is empty by construction. New
  contributors don't have to map it.
- The seal is enforced at review time — cross-mode imports are a BLOCK.

**Negative**
- Some small primitives end up duplicated across mode folders (a card
  shell, a tag chip, an outbound-link affordance).
- The promotion-to-shared trigger is **3+ copies**. With two copies,
  the duplication stays. With three, the primitive moves to `brand/`
  or `lib/`. This is deliberate: abstracting on two examples is the
  classic "wrong abstraction" trap.

## Rejected alternatives

**A `components/shared/` folder open to every mode.** Rejected:
"available" becomes "default". The seal that makes each mode
independent dissolves within a quarter.

**A mode "kit" exported from each folder (`minute/index.ts`).**
Rejected: adds ceremony, doesn't prevent the coupling, just makes the
coupling look intentional.

## Trigger to revisit

Revisit if shared-primitive duplication consistently exceeds the
3-copy threshold across 5+ primitives. At that point the cost of
duplication has overtaken the cost of coupling, and lifting to
`brand/` is correct.

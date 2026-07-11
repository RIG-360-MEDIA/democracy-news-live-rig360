# ADR 0001 — Folder slugs stay stable

**Status:** Accepted · 2026-05-28
**Authors:** core team
**Supersedes:** —

## Context

The six modes were renamed in May 2026:

| Folder slug    | Old display name | New display name |
| -------------- | ---------------- | ---------------- |
| `minute`       | The Minute       | Flash            |
| `digest`       | The Digest       | Newsletter       |
| `all-sides`    | All Sides        | All Sides        |
| `long-read`    | The Long Read    | Worldwide        |
| `long-view`    | The Long View    | Aftermath        |
| `queue`        | The Queue        | Pocket           |

Folder names under `src/components/` and `src/app/` still use the old
slugs. Reviewers and new contributors notice the mismatch within the
first ten minutes; this ADR exists so they stop asking.

## Decision

Folder slugs (`minute/`, `digest/`, `long-read/`, `long-view/`, `queue/`,
`all-sides/`) are immutable. Display names are values, stored once in
`src/lib/modes.ts`, imported everywhere else.

## Consequences

**Positive**
- URLs (`/minute`, `/digest`, `/long-read`, ...) stay stable. Bookmarks
  survive. SEO doesn't churn. Deep links from past social posts keep
  working.
- Every existing import path remains valid. A rename would be a
  ~200-file diff on a design-stage prototype with no test coverage. The
  regression surface is too large for the benefit.
- The mapping is documented in `STRUCTURE.md`, so the dissonance is
  explicit and discoverable rather than tribal knowledge.

**Negative**
- Every new contributor has to read the translation table once.
- Searches for `flash/` come up empty. Acceptable — `STRUCTURE.md`
  is the first thing in onboarding.

## Rejected alternatives

**Rename folders to match display names.** Rejected: cost (broken
imports, dead URLs, ~200-file diff) outweighs benefit (one less mental
indirection).

**Add aliases (`flash/` symlinked to `minute/`).** Rejected: doubles the
mental surface ("which one is the real one?"), Next.js routing doesn't
handle it cleanly, fragile on Windows.

## Trigger to revisit

Revisit only if all three hold:
1. Product names stabilise for 12+ months.
2. We have a working test suite that catches regressions.
3. A feature is *actively blocked* by the slug mismatch.

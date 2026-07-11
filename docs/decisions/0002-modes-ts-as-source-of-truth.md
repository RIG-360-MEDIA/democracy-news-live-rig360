# ADR 0002 — `modes.ts` is the single source of truth for mode metadata

**Status:** Accepted · 2026-05-28
**Authors:** core team
**Related:** ADR 0001

## Context

Mode metadata — display name, tagline, blurb, accent color, href, cover
image, duration — was originally inlined in 4–6 places:

- landing page mode sections (`src/components/landing/section-<mode>.tsx`)
- today-page newsstand (`src/components/today/today-page.tsx`)
- auth-shell quote list (`src/components/auth/auth-shell.tsx`)
- each mode page's own masthead
- the onboarding flow

The May 2026 rename cycle (see ADR 0001) shipped two visible rename bugs
because hardcoded strings in two of these sites were missed. The mistake
was the architecture, not the engineer who missed the grep.

## Decision

All mode metadata lives in `src/lib/modes.ts`. Anywhere else in the
codebase, mode data is *imported*, never inlined.

```ts
// src/lib/modes.ts
export const MODES = [
  {
    slug: 'minute',
    name: 'Flash',
    tagline: '...',
    blurb: '...',
    accent: '...',
    href: '/minute',
    image: '/newsstand/minute.png',
    duration: '60 sec',
  },
  // ... five more
] as const;

export type Mode = (typeof MODES)[number];
```

Consumers:

```ts
import { MODES } from '@/lib/modes';
```

## Consequences

**Positive**
- Renaming a mode is a one-line change.
- New metadata fields (e.g., a future `accentMuted` token) extend the
  type once and every consumer picks them up.
- Code-review automation: a hardcoded mode name anywhere outside
  `src/lib/modes.ts` is a BLOCK-severity finding (see
  `.claude/rules/code-style.md` rule 3).

**Negative**
- Every mode-aware site takes a dependency on the modes module.
  Trivial cost.
- A one-off attribute that only makes sense for one mode is awkward in
  a uniform shape. Resolution: that attribute lives in the mode's own
  `<feature>-data.ts`, not in `modes.ts`. We accept exactly two homes
  for mode-related data and no more.

## Rejected alternatives

**Per-mode metadata in each `<mode>-data.ts`.** Rejected: the landing
page and today page need to enumerate *all* modes, which forces a
registry anyway. Better to make the registry the source than to
maintain it as a synced index.

**CMS-backed metadata.** Rejected at this stage. Adds infrastructure
for a problem we don't have. Revisit when a non-engineer needs to
change mode metadata without a deploy.

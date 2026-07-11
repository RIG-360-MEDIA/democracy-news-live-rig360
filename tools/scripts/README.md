# tools/scripts/

One-off and recurring automation that does not belong in `package.json`'s
`scripts` (because it is not part of the build) and does not belong in CI
(because it is run by humans, on demand).

---

## What goes here

- **Content migrations.** When we rename a mode or restructure `*-data.ts`,
  the migration that rewrites the data files lives here. One script per
  migration, dated filename: `2026-05-rename-minute-to-flash.ts`.
- **Asset processing.** Generating optimised WebP from the Gemini source
  PNGs in `public/newsstand/_archive/`. Bulk image resizing. Sprite sheet
  builds.
- **Codebase audits.** "Find every hardcoded mode-name string", "list all
  files over 800 lines", "list all `any` types". Output is read by humans
  and is not committed.

## What does NOT go here

- Anything the build needs to run. That is `package.json` `scripts`.
- Anything CI needs to run. That is `.github/workflows/` (when we add one).
- Anything that needs to run in production. That is `src/`.

## Conventions

- TypeScript (`*.ts`), runnable with `tsx`.
- **Idempotent** — running twice produces the same result as running once.
- Logs progress to stdout. Errors to stderr. Non-zero exit on failure.
- Header comment: what it does, when it was last run, when it should be
  deleted.

## Naming

```
YYYY-MM-<verb>-<noun>.ts     one-shot migration
audit-<noun>.ts              recurring audit
assets-<verb>-<noun>.ts      asset job
gen-<noun>.ts                generator (data, fixtures)
```

A script that has outlived its purpose should be **deleted, not preserved**
"in case we need it later". Git has the history. Dead scripts in tools/
are misleading — readers assume the script reflects current reality.

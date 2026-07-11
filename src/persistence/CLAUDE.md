# src/persistence/ — NOT IN USE YET

This folder is reserved for the day Rig Wire stores user data:

- Pocket queue — which audio items has this user saved, in what order.
- Onboarding preferences — which modes does this user start in.
- Reading state — which Flash stories has this user already seen.
- Auth sessions.

Today, all of this is either in-memory React state or hardcoded in
`<feature>-data.ts`. There is no database.

## When this folder activates

The first commit into this folder must include:

1. **`schema.ts`** — single source of truth for table shapes.
2. **One repository per entity** (`queue-repo.ts`, `prefs-repo.ts`, ...)
   implementing the **repository pattern** — `findById`, `list`, `create`,
   `update`, `delete`. Business logic in `src/components/` and `src/lib/`
   depends on the repository interface, never on the storage driver directly.
3. **A migration runner.** Migrations are forward-only and idempotent.
   Never write a "drop and recreate" migration on a table that has user data.

## Likely storage choice (when we get there)

- **Postgres via Supabase** for the persistent store. Row-level security
  for user-scoped tables. Migrations via Supabase CLI. Connection pooling
  via PgBouncer or Supabase's edge.
- **Redis** for sessions, rate-limit counters, ephemeral derived state.
  Not for anything that would hurt to lose.
- **Object storage (S3/R2)** for user-uploaded assets. Pre-signed URLs only;
  never proxy uploads through the app server.

## Privacy posture (mandatory from day one)

- Personal data (`email`, `display_name`) lives in `auth.users` (Supabase
  built-in). Never duplicate it into a `profiles` table; reference by FK.
- Reading-history rows include a `purged_after` timestamp; a daily job
  hard-deletes rows older than the retention window.
- Anything analytics-flavoured (counts, dwell time aggregates) is stored
  separately and is **never** joined back to the user row in production
  queries.

Until any of this exists: **leave this folder alone.** State lives in React.
Content lives in `*-data.ts`. There is no third place.

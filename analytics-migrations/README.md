# analytics-migrations

Schema migrations for our sandbox schema (`analytics.*`). Forward-only.

Each file is numbered `NNNN-short-name.sql` and applied in order. To roll
back a change, write a new migration that undoes it (no DOWN migrations).

## Convention

- **One concern per file** (one table, one function, one view, or a tight bundle).
- **Idempotent where possible** — `CREATE OR REPLACE` for functions/views,
  `CREATE TABLE IF NOT EXISTS` + `ON CONFLICT DO NOTHING` for seed data.
- **Top-of-file comment** in plain English explaining what the file does.
- **Verification block** at the bottom — queries the user can run after
  applying to confirm the migration worked.
- **Rule 0 applies** — any reference to `public.*` LLM-volatile columns
  filters by `extraction_version` AND `substrate_processed_at`.

## Applying

This chat does NOT execute migrations against the live DB. To apply:

1. Connect via SSH tunnel:
   ```bash
   ssh -i ~/.ssh/rig_hetzner -L 5433:rig-postgres:5432 root@<RIG_BOX_IP> -N
   ```
2. Apply a migration:
   ```bash
   psql "postgresql://analytics_user:$ANALYTICS_DB_PASSWORD@localhost:5433/rig" \
        -f analytics-migrations/0001-replay-clock.sql
   ```
3. Run the verification block at the bottom of each file.
4. Update the table below — flip "pending" to "applied" with the date.

## Current state

| #    | File                          | Status  | Applied    | Purpose                                                |
| ---- | ----------------------------- | ------- | ---------- | ------------------------------------------------------ |
| 0001 | replay-clock.sql              | applied | 2026-05-28 | Simulated time table + tick / reset funcs              |
| 0002 | worldwide-candidates.sql      | applied | 2026-05-28 | First view scaffold (gated by sim clock)               |
| 0003 | verification-smoke.sql        | applied | 2026-05-28 | Three-checkpoint replay smoke test                     |
| 0004 | worldwide-candidates-v2.sql   | applied | 2026-05-28 | Revised filters: multilingual, journalism allowlist    |
| 0005 | worldwide-candidates-v3.sql   | applied | 2026-05-28 | Drop unreliable `NOT is_duplicate` filter              |
| 0006 | pgtrgm-extension.sql          | applied | 2026-05-28 | pg_trgm extension (idempotent marker)                  |
| 0007 | article-signals-mv.sql        | applied | 2026-05-28 | Cached signals MV: primary_subject + locations + lede  |
| 0008 | minhash-functions.sql         | applied | 2026-05-28 | Pure-SQL MinHash functions (available but not in use — paraphrase mismatch found in validation) |
| 0009 | pair-scores.sql               | applied | 2026-05-29 | Production pair-scoring table (28,300 pairs, all signals populated) |
| 0010 | worldwide-candidates-v4.sql   | applied | 2026-05-29 | Adds dedup filter at threshold trgm_subject ≥ 0.55     |
| 0011 | dup-overrides.sql             | applied | 2026-05-29 | Editorial override table + articles_to_dedup view      |
| 0012 | auth-schema.sql               | applied | 2026-05-29 | Auth + rigwire schemas, owned by `rigwire_app` role. Applied as `rigwire_app` (NOT analytics_user). RLS with FORCE on user-scoped tables. |

## Pending data-quality audits

Investigations to run before relying on the corresponding signals in
production. Not migrations — these are read-only `SELECT` queries that
inform filter decisions. Track them here so they don't get forgotten.

| Audit                          | Why                                                                                                  | Status  |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- | ------- |
| `is_duplicate` precision       | We rely on it to exclude wire-service repeats; ~25% of post-D1 rows are flagged. Never spot-checked. Pull 50 marked-duplicate pairs, eyeball them, calibrate trust. | **DONE 2026-05-28 — see `docs/audits/is-duplicate-precision-2026-05-28.md`. Verdict: ~70% FP rate. Drop the filter.** |
| **Entity FK resolver missing in substrate v3** | `article_claims.subject_entity_id` is populated on only 0.3% of post-D1 rows (vs ~9.6% on older v1/v2 rows). Rig team confirmed: the resolver step was dropped from v3. Either re-add it OR run a one-time backfill via fuzzy match (`subject_text` → `entity_dictionary.canonical_name + aliases`). Blocks the "shared_entities" signal in our dedup design until resolved. | **HIGH — coordinate with rig team** |
| **`entity_dictionary` growth stalled 2026-05-26** | Last entity insert at 2026-05-26 01:33 (~50h ago). Likely Celery/cron job gated on a broken upstream step. Doesn't block us — dictionary is healthy (15,755 entries) — but worth flagging so the rig team's dedup work has fresh coverage when it lands. | **MEDIUM — flag to rig team** |
| `topic_category = 'OTHER'`     | After 077, `article_type='other'` is small (~7%). But `topic_category='OTHER'` is still 22% of `other`-typed rows — what's in that bucket?                          | future |
| Source-country vs story-country | `articles.source_country` is the publisher's country, not the story's. For Worldwide's per-continent surfacing, we need to use `article_locations` instead.        | future |
| **Political-lean lookup for All Sides** | All Sides needs `analytics.source_political_lean` — one row per `source_id` → bucket in `{far_left, left, center_left, center, center_right, right, far_right, unclassified}`. Seed from AllSides Media Bias Chart + Ad Fontes (both public CSVs). Refresh quarterly. **Never inferred from article text; always a lookup.** Phase 0 build prerequisite for All Sides — must land before the All Sides clustering MV can render a bias bar. See `docs/audits/dedup-minhash-design-2026-05-28.md` "Extending to All Sides" section. | **HIGH — All Sides blocker** |

## Why this folder exists (and not a tool like `dbmate` / `flyway`)

For now the scope is small enough that raw `.sql` files + a tracking table
in this README beat a migration tool's ceremony. When we cross ~20
migrations or need branching environments, revisit and adopt a tool.
The decision lives in `docs/build-protocol.md`.

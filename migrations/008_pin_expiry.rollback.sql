-- Rollback of migration 008 — drops the pin constraints and the pinned_until column.
--
-- Roll the F10 app code back FIRST: it writes pinned_until on every override write.
-- Data clean-up done by 008 (legacy duplicate-rank pins un-pinned, NULL ranks set to 1) is NOT
-- reversed — it is recorded in rigwire.editorial_audit ('pin_dedupe' / 'pin_normalise', editor
-- 'migration-008') if a story needs re-pinning by hand. Idempotent.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE rigwire.editorial_overrides DROP CONSTRAINT IF EXISTS pinned_has_expiry;
ALTER TABLE rigwire.editorial_overrides DROP CONSTRAINT IF EXISTS pinned_has_rank;
ALTER TABLE rigwire.editorial_overrides DROP CONSTRAINT IF EXISTS one_pin_per_rank;
ALTER TABLE rigwire.editorial_overrides DROP COLUMN IF EXISTS pinned_until;

COMMIT;

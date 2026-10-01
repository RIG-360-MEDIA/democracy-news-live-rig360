-- Migration 008 — pins expire, and at most one story holds each Top Stories rank (F10, epic 002).
--
-- Before: every "Make top" / drag-reorder wrote action='pinned' + pinned_rank with no expiry and no
-- uniqueness, so pins lived forever and several stories could all claim rank 1.
-- After:
--   * pinned_until timestamptz — the app sets it on every pin (PIN_TTL_HOURS = 12,
--     src/lib/studio/pins.ts); past it the story is treated as never pinned.
--   * one_pin_per_rank — EXCLUDE: no two action='pinned' rows share a pinned_rank. DEFERRABLE
--     INITIALLY DEFERRED so a multi-row reorder can shuffle ranks inside one transaction and is
--     checked once, at COMMIT (a violation rolls the whole reorder back; the app answers 409).
--   * pinned_has_rank / pinned_has_expiry — every pinned row carries a rank >= 1 and an expiry.
--
-- Clean-up of legacy rows is audited in rigwire.editorial_audit as 'pin_normalise' / 'pin_dedupe'
-- (editor 'migration-008'). Those actions are NOT override snapshots, so Studio never offers them for
-- undo/revert (OVERRIDE_AUDIT_ACTIONS). updated_at is deliberately left untouched.
--
-- DEPLOY ORDER: apply BEFORE deploying the F10 app code (the app writes pinned_until on every override
-- write). Idempotent: safe to re-run. Self-contained transaction; rollback: 008_pin_expiry.rollback.sql.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE rigwire.editorial_overrides
  ADD COLUMN IF NOT EXISTS pinned_until timestamptz;

-- One pass over the pinned rows: effective rank (NULL / < 1 → 1), and the winner per effective rank by
-- the ORIGINAL updated_at (newest wins; story_id breaks ties). Materialised before any UPDATE so the
-- normalisation below cannot change who wins.
CREATE TEMP TABLE _pin_plan ON COMMIT DROP AS
SELECT story_id,
       pinned_rank AS original_rank,
       CASE WHEN pinned_rank IS NULL OR pinned_rank < 1 THEN 1 ELSE pinned_rank END AS effective_rank,
       row_number() OVER (
         PARTITION BY CASE WHEN pinned_rank IS NULL OR pinned_rank < 1 THEN 1 ELSE pinned_rank END
         ORDER BY updated_at DESC, story_id
       ) AS rn
  FROM rigwire.editorial_overrides
 WHERE action = 'pinned';

-- Losers: un-pin (they stay Published — action 'live'). Audited with their original rank.
WITH demoted AS (
  UPDATE rigwire.editorial_overrides o
     SET action = 'live', pinned_rank = NULL, pinned_until = NULL
    FROM _pin_plan p
   WHERE o.story_id = p.story_id AND p.rn > 1
  RETURNING o.story_id, p.original_rank, p.effective_rank
)
INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
SELECT story_id, 'migration-008', 'pin_dedupe',
       jsonb_build_object('action', 'pinned', 'pinnedRank', original_rank),
       jsonb_build_object('action', 'live', 'pinnedRank', NULL, 'lostRankTo', effective_rank)
  FROM demoted;

-- Winners holding a NULL / sub-1 rank: normalise to 1. Audited with the original rank.
WITH fixed AS (
  UPDATE rigwire.editorial_overrides o
     SET pinned_rank = p.effective_rank
    FROM _pin_plan p
   WHERE o.story_id = p.story_id AND p.rn = 1 AND p.original_rank IS DISTINCT FROM p.effective_rank
  RETURNING o.story_id, p.original_rank, p.effective_rank
)
INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
SELECT story_id, 'migration-008', 'pin_normalise',
       jsonb_build_object('pinnedRank', original_rank),
       jsonb_build_object('pinnedRank', effective_rank)
  FROM fixed;

-- No pin is forever: surviving legacy pins expire 12h from now (matches PIN_TTL_HOURS).
UPDATE rigwire.editorial_overrides
   SET pinned_until = now() + interval '12 hours'
 WHERE action = 'pinned' AND pinned_until IS NULL;

-- Non-pinned rows never carry an expiry.
UPDATE rigwire.editorial_overrides
   SET pinned_until = NULL
 WHERE action <> 'pinned' AND pinned_until IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'one_pin_per_rank' AND conrelid = 'rigwire.editorial_overrides'::regclass
  ) THEN
    ALTER TABLE rigwire.editorial_overrides
      ADD CONSTRAINT one_pin_per_rank
      EXCLUDE USING btree (pinned_rank WITH =) WHERE (action = 'pinned')
      DEFERRABLE INITIALLY DEFERRED;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'pinned_has_rank' AND conrelid = 'rigwire.editorial_overrides'::regclass
  ) THEN
    ALTER TABLE rigwire.editorial_overrides
      ADD CONSTRAINT pinned_has_rank
      CHECK (action <> 'pinned' OR (pinned_rank IS NOT NULL AND pinned_rank >= 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'pinned_has_expiry' AND conrelid = 'rigwire.editorial_overrides'::regclass
  ) THEN
    ALTER TABLE rigwire.editorial_overrides
      ADD CONSTRAINT pinned_has_expiry
      CHECK (action <> 'pinned' OR pinned_until IS NOT NULL);
  END IF;
END $$;

COMMIT;

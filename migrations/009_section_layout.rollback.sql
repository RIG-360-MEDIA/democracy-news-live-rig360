-- Rollback of migration 009 — drops section_layout and restores the previous knob values/defaults.
--
-- Knob values are restored ONLY on a row still at the values 009 wrote (16.6355 / 0): an editor who
-- has since tuned a knob keeps their setting. Audited as one 'weights_update' row by
-- 'migration-009-rollback'. Roll the F11/F12 app code back first if the old defaults matter to it.
-- Idempotent.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

WITH before AS (
  SELECT id, recency_halflife_h, velocity_weight
    FROM rigwire.ranking_weights
   WHERE id = 1 AND (recency_halflife_h = 16.6355 OR velocity_weight = 0)
     FOR UPDATE
),
changed AS (
  UPDATE rigwire.ranking_weights w
     SET recency_halflife_h = CASE WHEN b.recency_halflife_h = 16.6355 THEN 12 ELSE w.recency_halflife_h END,
         velocity_weight    = CASE WHEN b.velocity_weight = 0 THEN 1 ELSE w.velocity_weight END
    FROM before b
   WHERE w.id = b.id
  RETURNING w.recency_halflife_h, w.velocity_weight, b.recency_halflife_h AS old_halflife, b.velocity_weight AS old_velocity
)
INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
SELECT NULL, 'migration-009-rollback', 'weights_update',
       jsonb_build_object('target', 'ranking_weights', 'recencyHalflifeH', old_halflife, 'velocityWeight', old_velocity),
       jsonb_build_object('target', 'ranking_weights', 'recencyHalflifeH', recency_halflife_h, 'velocityWeight', velocity_weight)
  FROM changed;

ALTER TABLE rigwire.ranking_weights ALTER COLUMN recency_halflife_h SET DEFAULT 12;
ALTER TABLE rigwire.ranking_weights ALTER COLUMN velocity_weight SET DEFAULT 1.0;
ALTER TABLE rigwire.ranking_weights DROP COLUMN IF EXISTS section_layout;

COMMIT;

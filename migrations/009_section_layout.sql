-- Migration 009 — persist the front-page section layout (F12) and make the newly-wired ranking knobs
-- neutral so deploying F11 does NOT change today's front page.
--
--   * ranking_weights.section_layout jsonb — editor-saved section ORDER, visibility and band size
--     ([{topic, visible, count}], src/lib/worldwide/sections.ts). '[]' = the default layout. The app
--     reads the row via to_jsonb(), so the reader front page works before AND after this runs; only
--     SAVING a layout from Studio needs the column.
--   * recency_halflife_h — never read before F11 (the SQL hard-coded a 24h e-fold) while the stored
--     value/default was 12. 16.6355 = 24·ln2 reproduces today's decay exactly (scoring.ts
--     DEFAULT_KNOBS uses the same literal).
--   * velocity_weight — the old scorer had no velocity term; stored default 1 would add one. It becomes
--     opt-in: 0.
--   Both are decided BY VALUE: only a row still at the untouched old default (12 / 1) is changed, so a
--   deliberate editor setting survives. The change is audited as one 'weights_update' row by
--   'migration-009'. Column defaults change too, so a recreated row keeps today's behaviour.
--
-- Idempotent: safe to re-run. Self-contained transaction; rollback: 009_section_layout.rollback.sql.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE rigwire.ranking_weights
  ADD COLUMN IF NOT EXISTS section_layout jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE rigwire.ranking_weights ALTER COLUMN recency_halflife_h SET DEFAULT 16.6355;
ALTER TABLE rigwire.ranking_weights ALTER COLUMN velocity_weight SET DEFAULT 0;

WITH before AS (
  SELECT id, recency_halflife_h, velocity_weight
    FROM rigwire.ranking_weights
   WHERE id = 1 AND (recency_halflife_h = 12 OR velocity_weight = 1)
     FOR UPDATE
),
changed AS (
  UPDATE rigwire.ranking_weights w
     SET recency_halflife_h = CASE WHEN b.recency_halflife_h = 12 THEN 16.6355 ELSE w.recency_halflife_h END,
         velocity_weight    = CASE WHEN b.velocity_weight = 1 THEN 0 ELSE w.velocity_weight END
    FROM before b
   WHERE w.id = b.id
  RETURNING w.recency_halflife_h, w.velocity_weight, b.recency_halflife_h AS old_halflife, b.velocity_weight AS old_velocity
)
INSERT INTO rigwire.editorial_audit (story_id, editor_id, action, before, after)
SELECT NULL, 'migration-009', 'weights_update',
       jsonb_build_object('target', 'ranking_weights', 'recencyHalflifeH', old_halflife, 'velocityWeight', old_velocity),
       jsonb_build_object('target', 'ranking_weights', 'recencyHalflifeH', recency_halflife_h, 'velocityWeight', velocity_weight)
  FROM changed;

COMMIT;

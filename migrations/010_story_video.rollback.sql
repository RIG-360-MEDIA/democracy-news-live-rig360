-- Rollback of migration 010 — drops rigwire.story_video (the Anchor Studio video rows; the MP4s stay in
-- the bucket). Roll back the Video Bulletin app code first, or the reader simply shows no videos
-- (both loaders treat a failed read as "no videos"). Idempotent.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DROP TABLE IF EXISTS rigwire.story_video;
-- If created: REVOKE ALL ON SCHEMA rigwire FROM anchor_writer; DROP ROLE IF EXISTS anchor_writer;

COMMIT;

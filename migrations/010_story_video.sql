-- Migration 010 — rigwire.story_video: the Anchor Studio videos (one per story) shown in the front-page
-- Video Bulletin and on each story's page (src/lib/worldwide/video-bulletin.ts).
--
-- Written by the Anchor Studio pipeline (render box) right after a video passes QC, through a dedicated
-- login that can touch only this table; read by the reader role behind ANALYTICS_DB_URL.
-- status: 'live' (shown) | 'test' (supervised checks on production, never shown) | 'pulled' (hidden by an editor).
-- A story an editor kills or holds in rigwire.editorial_overrides hides its video too (no extra step).
-- Idempotent. Rollback: 010_story_video.rollback.sql.

BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS rigwire.story_video (
  story_id      uuid PRIMARY KEY,                 -- the DNL story id (the /long-read/<id> slug)
  video_url     text NOT NULL,                    -- public https MP4 (H.264 + faststart)
  poster_url    text NOT NULL,
  duration_s    int,
  anchor_name   text NOT NULL,
  title         text NOT NULL,                    -- the headline shown under the video
  kicker        text,                             -- "Topic · Country"
  published_at  timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'test', 'pulled'))
);
CREATE INDEX IF NOT EXISTS story_video_live_published_idx ON rigwire.story_video (published_at DESC) WHERE status = 'live';

-- Grants to whichever roles exist (Neon: reader_ro / cms_rw / contract_ro; the box: analytics_user / rigwire_app),
-- the pattern of migration 007. Readers SELECT; the CMS can pull/restore a video (status 'pulled' / 'live').
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'reader_ro') THEN
    GRANT SELECT ON rigwire.story_video TO reader_ro;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analytics_user') THEN
    GRANT SELECT ON rigwire.story_video TO analytics_user;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_rw') THEN
    GRANT SELECT, UPDATE ON rigwire.story_video TO cms_rw;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rigwire_app') THEN
    GRANT SELECT, UPDATE ON rigwire.story_video TO rigwire_app;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contract_ro') THEN
    GRANT REFERENCES ON rigwire.story_video TO contract_ro;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anchor_writer') THEN
    GRANT SELECT, INSERT, UPDATE ON rigwire.story_video TO anchor_writer;
  END IF;
END $$;

COMMIT;

-- The pipeline's writer login (run once by a Neon admin; set the password there, never in git):
--   CREATE ROLE anchor_writer LOGIN PASSWORD '<generated>';
--   GRANT USAGE ON SCHEMA rigwire TO anchor_writer;
--   GRANT SELECT, INSERT, UPDATE ON rigwire.story_video TO anchor_writer;     -- nothing else, no DELETE, no DDL

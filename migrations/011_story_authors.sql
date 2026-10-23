-- 011: per-story authors (byline), editable in the CMS before and after publishing, for machine-written and
-- manual stories alike. No row = the house byline (BRAND.byline, "Democracy News Live Desk").
CREATE TABLE IF NOT EXISTS rigwire.story_authors (
  story_id   uuid        PRIMARY KEY,
  authors    text        NOT NULL CHECK (length(authors) BETWEEN 1 AND 200),
  editor_id  text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_rw') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON rigwire.story_authors TO cms_rw;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_dev') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON rigwire.story_authors TO cms_dev;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rigwire_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON rigwire.story_authors TO rigwire_app;
  END IF;
END $$;

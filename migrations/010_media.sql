-- 010: images uploaded from the CMS (Create page "Upload image", and pictures inside an imported .docx).
-- Stored in the reader DB (Neon) next to the stories, served publicly by GET /api/media/<id> (immutable,
-- CDN-cached). The browser shrinks a photo to <= 2000 px before upload; the API caps one file at 8 MB.
CREATE TABLE IF NOT EXISTS rigwire.media (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type  text        NOT NULL CHECK (content_type IN ('image/jpeg','image/png','image/webp','image/gif')),
  bytes         bytea       NOT NULL,
  size_bytes    int         NOT NULL,
  original_name text,
  editor_id     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_rw') THEN
    GRANT SELECT, INSERT ON rigwire.media TO cms_rw;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_dev') THEN          -- box local-dev role
    GRANT SELECT, INSERT ON rigwire.media TO cms_dev;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rigwire_app') THEN      -- box app role
    GRANT SELECT, INSERT ON rigwire.media TO rigwire_app;
  END IF;
END $$;

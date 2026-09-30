-- 007: login rate limiting (DNL program P07 / G3). Apply on the reader DB (Neon) and the box DB.
CREATE TABLE IF NOT EXISTS auth.login_attempts (
  key          text        NOT NULL,          -- 'email:<lowercased>' | 'ip:<addr>'
  window_start timestamptz NOT NULL,          -- 15-minute bucket
  count        int         NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);
CREATE INDEX IF NOT EXISTS login_attempts_window_idx ON auth.login_attempts (window_start);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cms_rw') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON auth.login_attempts TO cms_rw;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'contract_ro') THEN
    GRANT REFERENCES ON auth.login_attempts TO contract_ro;
  END IF;
END $$;

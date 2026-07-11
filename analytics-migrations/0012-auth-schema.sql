-- 0012-auth-schema.sql
--
-- Auth + per-user content schemas for Rig Wire.
-- Applied as the rigwire_app role (NOT as rig superuser) — tables are
-- owned by rigwire_app end-to-end, per database chat note #1.
--
-- Conventions:
--   - auth.*    : identity (users, sessions, password tokens)
--   - rigwire.* : per-user content (preferences, reading history, audit log)
--   - analytics.* : NOT touched here — we already created what we need
--     there (pair_scores, dup_overrides, worldwide_candidates)
--
-- Session variable per request (database chat note #3):
--   SET LOCAL app.user_id = '<uuid>';
--   RLS policies use: current_setting('app.user_id', true)::uuid
--   No pg_read_all_settings grant needed.
--
-- Stack:
--   - Auth.js (v5) in the Next.js layer
--   - Argon2id for password hashing
--   - JWT in httpOnly Secure SameSite=Lax cookies

----------------------------------------------------------------------
-- 1. auth.users — identity
----------------------------------------------------------------------
-- Note: not using citext extension (requires superuser). Instead we
-- store email as TEXT and enforce case-insensitive uniqueness via a
-- unique index on LOWER(email). Application code normalises to
-- lowercase on signup/signin.

CREATE TABLE IF NOT EXISTS auth.users (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT         NOT NULL,
  password_hash      TEXT         NOT NULL,
  email_verified_at  TIMESTAMPTZ,
  display_name       TEXT,
  role               TEXT         NOT NULL DEFAULT 'reader'
                       CHECK (role IN ('reader', 'editor', 'admin')),
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx
  ON auth.users (LOWER(email));
CREATE INDEX IF NOT EXISTS users_role_idx ON auth.users(role);

----------------------------------------------------------------------
-- 3. auth.sessions — server-side session tracking
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.sessions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ  NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ip            INET,
  user_agent    TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user_idx     ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_idx  ON auth.sessions(expires_at);

----------------------------------------------------------------------
-- 4. auth.verification_tokens — Auth.js email magic links
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.verification_tokens (
  identifier  TEXT         NOT NULL,
  token       TEXT         NOT NULL,
  expires     TIMESTAMPTZ  NOT NULL,
  PRIMARY KEY (identifier, token)
);

----------------------------------------------------------------------
-- 5. auth.password_reset_tokens
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth.password_reset_tokens (
  token       TEXT         PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_reset_user_idx ON auth.password_reset_tokens(user_id);

----------------------------------------------------------------------
-- 6. auth.uid() helper — reads current_setting('app.user_id', ...)
----------------------------------------------------------------------
-- App sets: SET LOCAL app.user_id = '<uuid>';   at start of each request.
-- RLS policies use: auth.uid()

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id', true), '')::UUID
$$;

----------------------------------------------------------------------
-- 7. rigwire.user_preferences
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rigwire.user_preferences (
  user_id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_modes   TEXT[] NOT NULL DEFAULT ARRAY['minute','long-read']::TEXT[],
  preferred_topics  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_langs   TEXT[] NOT NULL DEFAULT ARRAY['en']::TEXT[],
  region            TEXT,
  onboarded_at      TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rigwire.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE rigwire.user_preferences FORCE  ROW LEVEL SECURITY;  -- enforce on owner too

DROP POLICY IF EXISTS users_own_prefs ON rigwire.user_preferences;
CREATE POLICY users_own_prefs ON rigwire.user_preferences
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

----------------------------------------------------------------------
-- 8. rigwire.user_reading_history
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rigwire.user_reading_history (
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id   UUID NOT NULL,
  mode         TEXT NOT NULL,
  shown_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dwell_ms     INT,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (user_id, article_id, mode)
);

CREATE INDEX IF NOT EXISTS reading_history_user_time_idx
  ON rigwire.user_reading_history(user_id, shown_at DESC);

ALTER TABLE rigwire.user_reading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE rigwire.user_reading_history FORCE  ROW LEVEL SECURITY;  -- enforce on owner too

DROP POLICY IF EXISTS users_own_history ON rigwire.user_reading_history;
CREATE POLICY users_own_history ON rigwire.user_reading_history
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

----------------------------------------------------------------------
-- 9. rigwire.dedup_decisions_log — audit trail
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rigwire.dedup_decisions_log (
  id              BIGSERIAL    PRIMARY KEY,
  user_id         UUID         REFERENCES auth.users(id),  -- nullable for anonymous
  article_id      UUID         NOT NULL,
  decision        TEXT         NOT NULL,
  score           NUMERIC(4,3),
  canonical_id    UUID,
  model_version   TEXT         NOT NULL DEFAULT 'v4-trgm-0.55',
  decided_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS dedup_log_user_time_idx
  ON rigwire.dedup_decisions_log(user_id, decided_at DESC);

----------------------------------------------------------------------
-- NOTE: analytics.dup_overrides
----------------------------------------------------------------------
-- The dup_overrides table (created in 0011) currently has an `editor` TEXT
-- column. Adding a UUID FK to auth.users would require an ALTER as
-- analytics_user (not rigwire_app). For v1 we keep `editor` as TEXT
-- (e.g., user email or session-derived label). When editorial UI lands,
-- we coordinate a small follow-up migration with the database chat.

----------------------------------------------------------------------
-- VERIFICATION
----------------------------------------------------------------------
-- 1) Schema and table ownership:
--    SELECT schemaname, tablename, tableowner
--      FROM pg_tables WHERE schemaname IN ('auth','rigwire')
--      ORDER BY schemaname, tablename;
--    -- expect: all tables owned by rigwire_app
--
-- 2) auth.uid() returns NULL when no setting:
--    SELECT auth.uid();
--
-- 3) Per-request setting works:
--    SET LOCAL app.user_id = '11111111-2222-3333-4444-555555555555';
--    SELECT auth.uid();
--    -- expect: the same uuid
--
-- 4) RLS denies cross-user reads:
--    INSERT INTO auth.users (email, password_hash) VALUES ('a@x','xx') RETURNING id;
--    INSERT INTO auth.users (email, password_hash) VALUES ('b@x','xx') RETURNING id;
--    INSERT INTO rigwire.user_preferences (user_id) VALUES ('<a-uuid>');
--    INSERT INTO rigwire.user_preferences (user_id) VALUES ('<b-uuid>');
--    SET LOCAL app.user_id = '<a-uuid>';
--    SELECT * FROM rigwire.user_preferences;
--    -- expect: only the row for a, not b

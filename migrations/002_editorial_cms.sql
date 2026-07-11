-- Editorial CMS (epic 002): the override layer over the automated Worldwide feed.
-- Lives in the rigwire app schema (read/write role). Reader ranking joins these;
-- overrides WIN on read. Pipeline respects human_locked. Reversible + audited.
CREATE SCHEMA IF NOT EXISTS rigwire;

-- One row per story an editor has touched. Absence of a row = pure automation.
CREATE TABLE IF NOT EXISTS rigwire.editorial_overrides (
  story_id          uuid PRIMARY KEY,
  action            text NOT NULL DEFAULT 'live'
                      CHECK (action IN ('live','killed','pinned','held')),
  pinned_rank       int,
  importance_delta  numeric NOT NULL DEFAULT 0,
  section_override  text,
  human_locked      boolean NOT NULL DEFAULT false,
  edited_headline   text,
  edited_dek        text,
  edited_body       text,
  edited_tags       text[],
  editor_id         text NOT NULL DEFAULT 'system',
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Append-only log. Also the ranker-quality signal (how often editors override).
CREATE TABLE IF NOT EXISTS rigwire.editorial_audit (
  id         bigserial PRIMARY KEY,
  story_id   uuid,
  editor_id  text NOT NULL DEFAULT 'system',
  action     text NOT NULL,
  before     jsonb,
  after      jsonb,
  at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS editorial_audit_story_idx ON rigwire.editorial_audit (story_id);
CREATE INDEX IF NOT EXISTS editorial_audit_at_idx    ON rigwire.editorial_audit (at DESC);

-- Editor-authored stories, injected into the feed through the same publish gate.
CREATE TABLE IF NOT EXISTS rigwire.manual_stories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline   text NOT NULL,
  dek        text,
  body       text NOT NULL,
  topic      text NOT NULL DEFAULT 'OTHER',
  country    text,
  image_url  text,
  status     text NOT NULL DEFAULT 'PUBLISHABLE',
  importance numeric NOT NULL DEFAULT 40,
  editor_id  text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- The importance knobs (singleton row id=1). Editors turn sliders; ranking reads this.
CREATE TABLE IF NOT EXISTS rigwire.ranking_weights (
  id                 int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  topic_weights      jsonb  NOT NULL DEFAULT '{}'::jsonb,
  country_weights    jsonb  NOT NULL DEFAULT '{}'::jsonb,
  recency_halflife_h numeric NOT NULL DEFAULT 12,
  source_weight      numeric NOT NULL DEFAULT 1.0,
  velocity_weight    numeric NOT NULL DEFAULT 1.0,
  updated_by         text NOT NULL DEFAULT 'system',
  updated_at         timestamptz NOT NULL DEFAULT now()
);
INSERT INTO rigwire.ranking_weights (id) VALUES (1) ON CONFLICT DO NOTHING;

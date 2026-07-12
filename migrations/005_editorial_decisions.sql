-- Migration 005 — the canonical, product-namespaced editorial CONTROL PLANE.
--
-- editorial.decisions is ONE table every Rig Wire product reads (DNL, OSINT desk, Windlass, Ask-RIG…).
-- It generalises rigwire.editorial_overrides (epic 002, DNL-only, keyed by story_id) by adding a
-- `product` namespace and a generic text `content_id`.
--
-- ADDITIVE + BACKWARD-COMPATIBLE (no live-app change): DNL's /studio keeps writing
-- rigwire.editorial_overrides exactly as before; a trigger MIRRORS every change into
-- editorial.decisions (product='dnl'). Other products write to editorial.decisions directly with their
-- own product name. Every write is audited (before/after) → reversible by construction.

CREATE SCHEMA IF NOT EXISTS editorial;

-- One row per (product, content) an editor has touched. Absence of a row = pure automation.
CREATE TABLE IF NOT EXISTS editorial.decisions (
  id                bigserial PRIMARY KEY,
  product           text NOT NULL,                 -- 'dnl' | 'osint' | 'windlass' | 'askrig' | …
  content_id        text NOT NULL,                 -- story_id / doc id / entity id (generic across products)
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
  edited_image      text,
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,   -- product-specific extras w/o a migration
  editor_id         text NOT NULL DEFAULT 'system',
  reason            text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product, content_id)
);
CREATE INDEX IF NOT EXISTS decisions_product_idx ON editorial.decisions (product);
CREATE INDEX IF NOT EXISTS decisions_action_idx  ON editorial.decisions (product, action);

-- Append-only audit — the reversibility record AND the ranker-quality signal, unified across products.
CREATE TABLE IF NOT EXISTS editorial.audit (
  id          bigserial PRIMARY KEY,
  product     text NOT NULL,
  content_id  text NOT NULL,
  editor_id   text NOT NULL DEFAULT 'system',
  action      text NOT NULL,             -- row op ('insert'|'update'|'delete')
  before      jsonb,
  after       jsonb,
  at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS editorial_audit_content_idx ON editorial.audit (product, content_id);
CREATE INDEX IF NOT EXISTS editorial_audit_at_idx      ON editorial.audit (at DESC);

-- Every change to a decision is logged with a full before/after snapshot → any state is reversible.
CREATE OR REPLACE FUNCTION editorial.audit_decision() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO editorial.audit(product, content_id, editor_id, action, before, after)
      VALUES (OLD.product, OLD.content_id, OLD.editor_id, 'delete', to_jsonb(OLD), NULL);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO editorial.audit(product, content_id, editor_id, action, before, after)
      VALUES (NEW.product, NEW.content_id, NEW.editor_id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO editorial.audit(product, content_id, editor_id, action, before, after)
      VALUES (NEW.product, NEW.content_id, NEW.editor_id, 'insert', NULL, to_jsonb(NEW));
    RETURN NEW;
  END IF;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_decision ON editorial.decisions;
CREATE TRIGGER trg_audit_decision
  AFTER INSERT OR UPDATE OR DELETE ON editorial.decisions
  FOR EACH ROW EXECUTE FUNCTION editorial.audit_decision();

-- Backfill DNL's existing overrides into the canonical table (product='dnl').
INSERT INTO editorial.decisions
  (product, content_id, action, pinned_rank, importance_delta, section_override, human_locked,
   edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason, created_at, updated_at)
SELECT 'dnl', story_id::text, action, pinned_rank, importance_delta, section_override, human_locked,
   edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason, created_at, updated_at
FROM rigwire.editorial_overrides
ON CONFLICT (product, content_id) DO NOTHING;

-- Mirror: keep the canonical table in lock-step with DNL's working table — NO app change required.
CREATE OR REPLACE FUNCTION rigwire.mirror_override_to_decisions() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM editorial.decisions WHERE product='dnl' AND content_id = OLD.story_id::text;
    RETURN OLD;
  END IF;
  INSERT INTO editorial.decisions
    (product, content_id, action, pinned_rank, importance_delta, section_override, human_locked,
     edited_headline, edited_dek, edited_body, edited_tags, edited_image, editor_id, reason, created_at, updated_at)
  VALUES ('dnl', NEW.story_id::text, NEW.action, NEW.pinned_rank, NEW.importance_delta, NEW.section_override,
     NEW.human_locked, NEW.edited_headline, NEW.edited_dek, NEW.edited_body, NEW.edited_tags, NEW.edited_image,
     NEW.editor_id, NEW.reason, NEW.created_at, NEW.updated_at)
  ON CONFLICT (product, content_id) DO UPDATE SET
    action=EXCLUDED.action, pinned_rank=EXCLUDED.pinned_rank, importance_delta=EXCLUDED.importance_delta,
    section_override=EXCLUDED.section_override, human_locked=EXCLUDED.human_locked,
    edited_headline=EXCLUDED.edited_headline, edited_dek=EXCLUDED.edited_dek, edited_body=EXCLUDED.edited_body,
    edited_tags=EXCLUDED.edited_tags, edited_image=EXCLUDED.edited_image, editor_id=EXCLUDED.editor_id,
    reason=EXCLUDED.reason, updated_at=EXCLUDED.updated_at;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mirror_override ON rigwire.editorial_overrides;
CREATE TRIGGER trg_mirror_override
  AFTER INSERT OR UPDATE OR DELETE ON rigwire.editorial_overrides
  FOR EACH ROW EXECUTE FUNCTION rigwire.mirror_override_to_decisions();

-- Grants: the app RW role reads+writes; the RO analytics role can read.
GRANT USAGE ON SCHEMA editorial TO rigwire_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON editorial.decisions, editorial.audit TO rigwire_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA editorial TO rigwire_app;
GRANT USAGE ON SCHEMA editorial TO analytics_user;
GRANT SELECT ON ALL TABLES IN SCHEMA editorial TO analytics_user;

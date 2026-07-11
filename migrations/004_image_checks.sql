-- Image cleanliness log — we don't own public.articles, so the flag lives in our schema.
-- clean=false means the thumbnail carries another outlet's logo / watermark / name → reader hides it.
CREATE TABLE IF NOT EXISTS rigwire.image_checks (
  thumbnail_url text PRIMARY KEY,
  clean         boolean NOT NULL,
  has_text      boolean,
  detail        text,
  checked_at    timestamptz NOT NULL DEFAULT now()
);

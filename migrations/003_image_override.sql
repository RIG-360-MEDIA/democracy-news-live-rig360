-- Epic 002 follow-up: let editors replace a story's thumbnail/hero image.
-- The override wins on read (ranking.ts card, detail.ts hero, feed.ts desk card).
ALTER TABLE rigwire.editorial_overrides ADD COLUMN IF NOT EXISTS edited_image text;

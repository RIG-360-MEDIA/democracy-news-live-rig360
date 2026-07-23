-- Door B (draftsmith) publish handoff: manual_stories needs a way to know a
-- row came from an AI-assisted draft job, so the publish route can be
-- idempotent (a retried click must not insert a second story for the same
-- job). Additive only.
ALTER TABLE rigwire.manual_stories
  ADD COLUMN IF NOT EXISTS draft_job_id text;

CREATE UNIQUE INDEX IF NOT EXISTS manual_stories_draft_job_id_idx
  ON rigwire.manual_stories (draft_job_id)
  WHERE draft_job_id IS NOT NULL;

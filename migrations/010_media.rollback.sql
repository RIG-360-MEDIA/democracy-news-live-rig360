-- Rollback of 010: removes uploaded CMS images (stories that use /api/media/<id> URLs lose their picture).
DROP TABLE IF EXISTS rigwire.media;

-- set when an adviser edits a post, so interns can see it changed after they read it
ALTER TABLE announcements ADD COLUMN updated_at DATETIME NULL;

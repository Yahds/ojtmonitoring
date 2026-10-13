-- file_path is the random name on disk; file_name is the adviser's original name, shown as the link text
ALTER TABLE announcements
  ADD COLUMN file_path VARCHAR(255) NULL,
  ADD COLUMN file_name VARCHAR(255) NULL;

-- due_at is saved when the report is sent, so changing the due rule later can't make it late
ALTER TABLE weeklyreports
  MODIFY kind ENUM('WORK', 'NO_WORK', 'EXCUSED') NOT NULL DEFAULT 'WORK',
  ADD COLUMN submitted_at DATETIME NULL,
  ADD COLUMN due_at DATETIME NULL,
  ADD COLUMN late_letter_path VARCHAR(255) NULL;

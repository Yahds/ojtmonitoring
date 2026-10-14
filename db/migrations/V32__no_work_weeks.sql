-- a NO_WORK week has 0 hours, the reason here and the details in workdescription
ALTER TABLE weeklyreports
  ADD COLUMN kind ENUM('WORK', 'NO_WORK') NOT NULL DEFAULT 'WORK',
  ADD COLUMN no_work_reason ENUM('HOLIDAY', 'CLOSED', 'SCHOOL', 'OTHER') NULL;

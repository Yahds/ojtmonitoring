-- weekly reports are due due_days after the week's friday, 12 noon. no row = 3 (the monday after).
-- a new rule only counts for weeks that end on or after starts_on, so old due dates don't move
CREATE TABLE weekly_due_rules (
  adviserid INT NOT NULL,
  starts_on DATE NOT NULL,
  due_days TINYINT NOT NULL,
  PRIMARY KEY (adviserid, starts_on),
  CONSTRAINT weekly_due_rules_adviser FOREIGN KEY (adviserid) REFERENCES advisers (adviserID) ON DELETE CASCADE
);

-- first day the report covers (deploy day for week 1, then mondays). NULL on old reports
ALTER TABLE weeklyreports ADD COLUMN week_start DATE NULL;

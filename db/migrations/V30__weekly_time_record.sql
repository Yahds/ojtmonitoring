-- hours now come from times, so they can be 7.5
ALTER TABLE weeklyreports
  MODIFY hours DECIMAL(5,2) NOT NULL,
  MODIFY workdescription VARCHAR(2000) NULL,
  ADD COLUMN supervisor_name VARCHAR(100) NULL; -- who signed it, kept if the supervisor changes later

CREATE TABLE weeklyreport_days (
  reportid INT NOT NULL,
  work_date DATE NOT NULL,
  am_in TIME NULL,
  am_out TIME NULL,
  pm_in TIME NULL,
  pm_out TIME NULL,
  hours DECIMAL(4,2) NOT NULL,
  PRIMARY KEY (reportid, work_date),
  CONSTRAINT weeklyreport_days_report FOREIGN KEY (reportid) REFERENCES weeklyreports (reportid) ON DELETE CASCADE
);

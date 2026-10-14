-- 0 = medical certificate only, 1 = medical certificate or a parent's letter
ALTER TABLE advisers ADD COLUMN accepts_parent_letter TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE weeklyreport_absences (
  reportid INT NOT NULL,
  absent_date DATE NOT NULL,
  part ENUM('DAY', 'AM', 'PM') NOT NULL,
  reason VARCHAR(200) NOT NULL,
  proof_type ENUM('MEDICAL', 'LETTER') NOT NULL,
  proof_path VARCHAR(255) NOT NULL,
  PRIMARY KEY (reportid, absent_date),
  CONSTRAINT weeklyreport_absences_report FOREIGN KEY (reportid) REFERENCES weeklyreports (reportid) ON DELETE CASCADE
);

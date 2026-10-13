-- every submission is kept as its own version; internrequirements keeps only the current state
CREATE TABLE requirement_versions (
  versionid INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  internid INT NOT NULL,
  reqid INT NOT NULL,
  version_no INT NOT NULL,
  file_path VARCHAR(255) NULL,
  intern_note VARCHAR(255) NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  decision VARCHAR(45) NULL, -- APPROVED or REJECTED; NULL while waiting or after the intern replaced it
  remarks VARCHAR(200) NULL,
  reviewed_at DATETIME NULL,
  reviewed_by INT NULL,
  UNIQUE KEY one_number_per_version (internid, reqid, version_no),
  CONSTRAINT requirement_versions_requirement FOREIGN KEY (internid, reqid)
    REFERENCES internrequirements (internid, reqid) ON DELETE CASCADE,
  CONSTRAINT requirement_versions_reviewer FOREIGN KEY (reviewed_by)
    REFERENCES advisers (adviserID) ON DELETE SET NULL
);

-- what was already submitted becomes version 1
INSERT INTO requirement_versions (internid, reqid, version_no, file_path, intern_note, submitted_at, decision, remarks)
SELECT internid, reqid, 1, file_path, intern_remarks, COALESCE(datesubmitted, CURRENT_DATE),
       IF(status IN ('APPROVED', 'REJECTED'), status, NULL), NULLIF(remarks, '')
FROM internrequirements
WHERE status <> 'PENDING';

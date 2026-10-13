ALTER TABLE interns DROP FOREIGN KEY supervisorid;

ALTER TABLE supervisors
  MODIFY supervisorid INT NOT NULL AUTO_INCREMENT,
  MODIFY supervisorname VARCHAR(100) NOT NULL,
  MODIFY supervisoremail VARCHAR(255) NOT NULL,
  MODIFY position VARCHAR(100) NULL;

ALTER TABLE interns ADD CONSTRAINT supervisorid FOREIGN KEY (supervisorid) REFERENCES supervisors (supervisorid);

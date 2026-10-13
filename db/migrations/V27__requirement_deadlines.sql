-- a deadline an adviser sets for one section, or for all their sections (classcode '', since a primary key
-- column can't be NULL), kept as a rule so interns enrolled later in that section get it too
CREATE TABLE requirement_deadlines (
  adviserid INT NOT NULL,
  reqid INT NOT NULL,
  classcode VARCHAR(45) NOT NULL,
  due_date DATE NOT NULL,
  PRIMARY KEY (adviserid, reqid, classcode),
  CONSTRAINT requirement_deadlines_adviser FOREIGN KEY (adviserid) REFERENCES advisers (adviserID) ON DELETE CASCADE,
  CONSTRAINT requirement_deadlines_requirement FOREIGN KEY (reqid) REFERENCES requirements (reqid) ON DELETE CASCADE
);

-- a deadline for one intern only; the most specific one wins: intern, then section, then all sections
ALTER TABLE internrequirements ADD COLUMN due_date DATE NULL;

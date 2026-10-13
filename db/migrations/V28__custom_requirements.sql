-- created_by NULL = one of the school's requirements, given to every intern at enroll.
-- An adviser's own requirement goes to one intern, one section or all their sections;
-- SECTION and ALL also go to interns the adviser enrolls later.
ALTER TABLE requirements
  MODIFY requirementname VARCHAR(100) NOT NULL,
  ADD COLUMN created_by INT NULL,
  ADD COLUMN audience VARCHAR(10) NULL, -- INTERN, SECTION or ALL
  ADD COLUMN audience_classcode VARCHAR(45) NULL,
  ADD CONSTRAINT requirements_creator FOREIGN KEY (created_by) REFERENCES advisers (adviserID) ON DELETE CASCADE;

ALTER TABLE interns
  ADD COLUMN withdrawn_from VARCHAR(45) NULL,
  ADD COLUMN withdrawn_reason VARCHAR(255) NULL,
  ADD COLUMN withdrawn_on DATE NULL;

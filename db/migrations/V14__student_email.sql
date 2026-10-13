ALTER TABLE students
  ADD COLUMN email VARCHAR(255) NULL,
  ADD UNIQUE KEY uq_student_email (email);

ALTER TABLE interns MODIFY password VARCHAR(60) NULL;

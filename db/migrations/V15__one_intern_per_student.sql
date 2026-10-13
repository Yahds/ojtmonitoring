ALTER TABLE interns ADD UNIQUE KEY uq_intern_student (studentid);
ALTER TABLE interns DROP INDEX studentid_idx;

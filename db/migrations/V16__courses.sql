CREATE TABLE courses (
  code VARCHAR(45) NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_hours INT NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO courses (code, name, target_hours) VALUES
  ('BSCS', 'BS Computer Science', 240),
  ('BSIT', 'BS Information Technology', 600);

ALTER TABLE students ADD CONSTRAINT students_course FOREIGN KEY (course) REFERENCES courses (code);

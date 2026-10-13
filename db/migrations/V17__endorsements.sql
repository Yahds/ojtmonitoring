CREATE TABLE endorsements (
  internid INT NOT NULL,
  companyid INT NOT NULL,
  contact_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  position VARCHAR(100) NULL,
  start_date DATE NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED',
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME NULL,
  accepted_at DATETIME NULL,
  PRIMARY KEY (internid),
  CONSTRAINT endorsements_intern FOREIGN KEY (internid) REFERENCES interns (internid),
  CONSTRAINT endorsements_company FOREIGN KEY (companyid) REFERENCES company (companyid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- the partner companies an intern wants, in order (1 = most wanted); choosing does not place them
CREATE TABLE intern_company_choices (
  internid INT NOT NULL,
  choice_rank TINYINT NOT NULL,
  companyid INT NOT NULL,
  chosen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (internid, choice_rank),
  UNIQUE KEY one_rank_per_company (internid, companyid),
  CONSTRAINT choice_rank_1_to_3 CHECK (choice_rank BETWEEN 1 AND 3),
  CONSTRAINT company_choices_intern FOREIGN KEY (internid) REFERENCES interns (internid) ON DELETE CASCADE,
  CONSTRAINT company_choices_company FOREIGN KEY (companyid) REFERENCES company (companyid)
);

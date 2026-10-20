-- old demo rows: a company but still ENROLLED; the app sets PENDING when a company is recorded
UPDATE interns SET status = 'PENDING' WHERE status = 'ENROLLED' AND companyid IS NOT NULL;

-- Henry Taylor (2226913) is still choosing and logs in with 1234, the same password as Maria
UPDATE interns SET password = (SELECT p.password FROM (SELECT password FROM interns WHERE internid = 300) p)
WHERE internid = 57;

-- some of Amelia's other interns already chose
INSERT INTO intern_company_choices (internid, choice_rank, companyid) VALUES
  (67, 1, 2), (67, 2, 3), (67, 3, 1),
  (87, 1, 2), (87, 2, 1),
  (97, 1, 1), (97, 2, 2), (97, 3, 5),
  (107, 1, 5);

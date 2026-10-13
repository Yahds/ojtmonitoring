INSERT INTO requirements (reqid, requirementname) VALUES (8, 'Certificate of Completion');
INSERT INTO internrequirements (internid, reqid, status, remarks) SELECT internid, 8, 'PENDING', '' FROM interns;

ALTER TABLE interns
  ADD COLUMN evaluation_received_on DATE NULL,
  ADD COLUMN finished_on DATE NULL;

INSERT INTO internrequirements (internid, reqid, status)
SELECT i.internid, r.reqid, 'PENDING'
FROM interns i
CROSS JOIN requirements r
WHERE NOT EXISTS (
  SELECT 1 FROM internrequirements ir
  WHERE ir.internid = i.internid AND ir.reqid = r.reqid
);

UPDATE interns SET worktype = 'ON_SITE' WHERE worktype = 'ON-SITE';

UPDATE advisers SET password = '$2b$10$16UInBHmswQVz/Ij3fYrbeYwVliujzO7OndyC4oPYZyoJXA1BX01e' WHERE adviserID = 2;
UPDATE advisers SET password = '$2b$10$4g4Pqa0sBhDf4RhfYwhrU.tuz1kdUz8FaYkXoidFrNpUUlD57MoX.' WHERE adviserID = 3;
UPDATE advisers SET password = '$2b$10$3DqaLS4uxYHX/LtNv3OYTuSSulJPJPCB1gGeuVU76iS67tOQvDVFO' WHERE adviserID = 4;
UPDATE advisers SET password = '$2b$10$kPLf.RunNBm0yE.N..HOmejhSMJcGFKhpDy6ORf8uf//Q3JwUbX0u' WHERE adviserID = 5;
UPDATE advisers SET password = '$2b$10$x/M4dcSg3rhno5dWAWe9uOIRK6XOrd3aq1i64iXFFXyX9KqsKIIWC' WHERE adviserID = 9;

UPDATE advisers SET adviserEmail = 'ben.parker@example.com' WHERE adviserID = 8;
UPDATE advisers SET adviserEmail = 'thompson.collins@example.com' WHERE adviserID = 9;

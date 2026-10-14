-- deployed demo intern for trying weekly reports (password 1234, in her 3rd week)
INSERT INTO students (studentID, studentName, course, year, classcode, email)
VALUES (2299003, 'Ana Reyes', 'BSCS', '4', 'CS401', 'ana.reyes@example.com');

INSERT INTO supervisors (supervisorname, supervisoremail, position, companyid)
VALUES ('Joel Bautista', 'joel.bautista@example.com', 'IT Supervisor', 2);

INSERT INTO interns (password, adviserid, studentid, companyid, supervisorid, worktype, status, deployed_on)
VALUES ('$2y$12$dKxPcsLr4iIp0jh9OWJowu41bWbW2gTEXG4Khz7aJTPSor7wYuCFy', 1, 2299003, 2, LAST_INSERT_ID(), 'ON-SITE',
        'ACTIVE', CURDATE() - INTERVAL 17 DAY);

-- approved except the two that come at the end
INSERT INTO internrequirements (internid, reqid, status, remarks)
SELECT i.internid, r.reqid, IF(r.reqid IN (7, 8), 'PENDING', 'APPROVED'), ''
FROM interns i CROSS JOIN requirements r
WHERE i.studentid = 2299003 AND r.created_by IS NULL;

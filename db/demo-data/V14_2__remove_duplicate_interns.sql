-- some demo students were enrolled twice; keep their first intern row
DELETE ir FROM internrequirements ir
JOIN interns i ON i.internid = ir.internid
JOIN interns first ON first.studentid = i.studentid AND first.internid < i.internid;

DELETE w FROM weeklyreports w
JOIN interns i ON i.internid = w.internid
JOIN interns first ON first.studentid = i.studentid AND first.internid < i.internid;

DELETE j FROM journals j
JOIN interns i ON i.internid = j.internid
JOIN interns first ON first.studentid = i.studentid AND first.internid < i.internid;

DELETE i FROM interns i
JOIN interns first ON first.studentid = i.studentid AND first.internid < i.internid;

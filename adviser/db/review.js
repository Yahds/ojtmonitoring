const { pool } = require('./pool');

// everything the adviser's interns sent that waits for a decision, oldest first;
// section '' means all sections. Withdrawn interns are left out.
async function fetchReviewQueue(adviserID, section = '') {
    const [rows] = await pool.query(
        `SELECT kind, internid, studentName, classcode, item,
                DATE_FORMAT(waiting_since, '%b %e, %Y') AS sent,
                DATEDIFF(CURDATE(), waiting_since) AS days
         FROM (
             SELECT 'requirement' AS kind, ir.internid, s.studentName, s.classcode, r.requirementname AS item,
                    COALESCE((SELECT MAX(v.submitted_at) FROM requirement_versions v
                              WHERE v.internid = ir.internid AND v.reqid = ir.reqid), ir.datesubmitted) AS waiting_since
             FROM internrequirements ir
             JOIN requirements r ON r.reqid = ir.reqid
             JOIN interns i ON i.internid = ir.internid
             JOIN students s ON s.studentID = i.studentid
             WHERE i.adviserid = ? AND i.status <> 'WITHDRAWN' AND ir.status = 'SUBMITTED'
             UNION ALL
             SELECT 'weekly', w.internid, s.studentName, s.classcode, CONCAT('Week ', w.weeknumber, IF(w.kind = 'NO_WORK', ' · no work', ' report')), w.datesubmitted
             FROM weeklyreports w
             JOIN interns i ON i.internid = w.internid
             JOIN students s ON s.studentID = i.studentid
             WHERE i.adviserid = ? AND i.status <> 'WITHDRAWN' AND w.status = 'PENDING'
             UNION ALL
             SELECT 'journal', j.internid, s.studentName, s.classcode, CONCAT('Month ', j.monthnumber, ' journal'), j.datesubmitted
             FROM journals j
             JOIN interns i ON i.internid = j.internid
             JOIN students s ON s.studentID = i.studentid
             WHERE i.adviserid = ? AND i.status <> 'WITHDRAWN' AND j.status = 'PENDING'
         ) waiting
         WHERE ? = '' OR classcode = ?
         ORDER BY waiting_since IS NULL, waiting_since, studentName`,
        [adviserID, adviserID, adviserID, section, section]
    );
    return rows;
}

module.exports = { fetchReviewQueue };

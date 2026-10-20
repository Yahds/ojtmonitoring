const { pool } = require('./pool');

// -- functions for changing of intern status

const DATA_PRIVACY_CERTIFICATE = 6; // requirements.reqid

async function fetchDeployCheck(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT i.internid, i.status, s.studentName, c.companyname,
                e.status = 'ACCEPTED' AND e.companyid = i.companyid AS replyReceived,
                ir.status = 'APPROVED' AS privacyApproved,
                DATE_FORMAT(e.start_date, '%Y-%m-%d') AS plannedStart
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         LEFT JOIN company c ON c.companyid = i.companyid
         LEFT JOIN endorsements e ON e.internid = i.internid
         LEFT JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ?
         WHERE i.internid = ? AND i.adviserid = ?`,
        [DATA_PRIVACY_CERTIFICATE, internID, adviserID]
    );
    return rows[0] || null;
}

async function deployIntern(internID, adviserID, startDate) {
    const [result] = await pool.query(
        `UPDATE interns i
            JOIN endorsements e ON e.internid = i.internid AND e.companyid = i.companyid AND e.status = 'ACCEPTED'
            JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ? AND ir.status = 'APPROVED'
            SET i.status = 'ACTIVE', i.deployed_on = ?
            WHERE i.internid = ? AND i.adviserid = ? AND i.status = 'PENDING'`,
        [DATA_PRIVACY_CERTIFICATE, startDate, internID, adviserID]
    );
    return result;
}

const CERTIFICATE_OF_COMPLETION = 8; // requirements.reqid

const APPROVED_HOURS = `(SELECT COALESCE(SUM(w.hours), 0)
                         FROM weeklyreports w WHERE w.internid = i.internid AND w.status = 'APPROVED')`;

async function fetchFinishCheck(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT i.internid, i.status, s.studentName, co.target_hours, ${APPROVED_HOURS} AS approvedHours,
                ir.status = 'APPROVED' AS certificateApproved,
                DATE_FORMAT(i.evaluation_received_on, '%b %e, %Y') AS evaluationDate
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         JOIN courses co ON co.code = s.course
         LEFT JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ?
         WHERE i.internid = ? AND i.adviserid = ?`,
        [CERTIFICATE_OF_COMPLETION, internID, adviserID]
    );
    return rows[0] || null;
}

async function markEvaluationReceived(internID, adviserID) {
    const [result] = await pool.query(
        `UPDATE interns SET evaluation_received_on = CURDATE()
         WHERE internid = ? AND adviserid = ? AND status = 'ACTIVE' AND evaluation_received_on IS NULL`,
        [internID, adviserID]
    );
    return result.affectedRows === 1;
}

async function finishIntern(internID, adviserID) {
    const [result] = await pool.query(
        `UPDATE interns i
            JOIN students s ON s.studentID = i.studentid
            JOIN courses co ON co.code = s.course
            JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ? AND ir.status = 'APPROVED'
            SET i.status = 'FINISHED', i.finished_on = CURDATE()
            WHERE i.internid = ? AND i.adviserid = ? AND i.status = 'ACTIVE'
              AND i.evaluation_received_on IS NOT NULL
              AND ${APPROVED_HOURS} >= co.target_hours`,
        [CERTIFICATE_OF_COMPLETION, internID, adviserID]
    );
    return result;
}

const WITHDRAWABLE = ['ENROLLED', 'PENDING', 'ACTIVE'];

async function fetchInternForAdviser(internID, adviserID) {
    const [rows] = await pool.query(
        `SELECT i.internid, i.status, s.studentID, s.studentName, s.course, s.classcode, i.companyid, c.companyname,
                DATE_FORMAT(i.deployed_on, '%Y-%m-%d') AS deployedOn, DATE_FORMAT(i.deployed_on, '%b %e') AS deployedLabel,
                co.target_hours, ${APPROVED_HOURS} AS approvedHours,
                (SELECT COUNT(*) FROM internrequirements r WHERE r.internid = i.internid AND r.status = 'SUBMITTED') AS waitingRequirements,
                (SELECT COUNT(*) FROM weeklyreports w WHERE w.internid = i.internid AND w.status = 'PENDING') AS waitingWeekly,
                (SELECT COUNT(*) FROM journals j WHERE j.internid = i.internid AND j.status = 'PENDING') AS waitingJournals
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         JOIN courses co ON co.code = s.course
         LEFT JOIN company c ON c.companyid = i.companyid
         WHERE i.internid = ? AND i.adviserid = ?`,
        [internID, adviserID]
    );
    return rows[0] || null;
}

// MySQL runs SET from left to right, so withdrawn_from keeps the status from before
async function withdrawIntern(internID, adviserID, reason) {
    const [result] = await pool.query(
        `UPDATE interns
         SET withdrawn_from = status, status = 'WITHDRAWN', withdrawn_reason = ?, withdrawn_on = CURDATE()
         WHERE internid = ? AND adviserid = ? AND status IN (?)`,
        [reason, internID, adviserID, WITHDRAWABLE]
    );
    return result.affectedRows === 1;
}

async function undoWithdraw(internID, adviserID) {
    const [result] = await pool.query(
        `UPDATE interns
         SET status = withdrawn_from, withdrawn_from = NULL, withdrawn_reason = NULL, withdrawn_on = NULL
         WHERE internid = ? AND adviserid = ? AND status = 'WITHDRAWN' AND withdrawn_from IS NOT NULL`,
        [internID, adviserID]
    );
    return result.affectedRows === 1;
}

async function addIntern(connection, student, adviserID) {
    await connection.query(
        'INSERT INTO students (studentID, studentName, course, year, classcode, email) VALUES (?, ?, ?, ?, ?, ?)',
        [student.id, student.name, student.course, student.year, student.classcode, student.email]
    );
    const [result] = await connection.query(
        "INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')",
        [adviserID, student.id]
    );
    // the school's requirements, plus this adviser's own ones meant for everyone or for this student's section
    await connection.query(
        `INSERT INTO internrequirements (internid, reqid, status, remarks)
         SELECT ?, reqid, 'PENDING', '' FROM requirements
         WHERE created_by IS NULL
            OR (created_by = ? AND (audience = 'ALL' OR (audience = 'SECTION' AND audience_classcode = ?)))`,
        [result.insertId, adviserID, student.classcode]
    );
    return result.insertId;
}

// all students are saved, or none of them
async function enrollInterns(students, adviserID) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const ids = [];
        for (const student of students) {
            ids.push(await addIntern(connection, student, adviserID));
        }
        await connection.commit();
        return ids;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

async function enrollIntern(student, adviserID) {
    const [internId] = await enrollInterns([student], adviserID);
    return internId;
}

// which of these student IDs and emails are already in the database
async function fetchTakenStudents(ids, emails) {
    const [rows] = await pool.query(
        'SELECT studentID, email FROM students WHERE studentID IN (?) OR email IN (?)',
        [ids.length ? ids : [null], emails.length ? emails : [null]]
    );
    return {
        takenIds: new Set(rows.map(row => String(row.studentID))),
        takenEmails: new Set(rows.filter(row => row.email).map(row => row.email.toLowerCase())),
    };
}

// all of the adviser's interns, with what the dashboard and the interns list need to know about each one
async function fetchInternSummaries(adviserID) {
    const [rows] = await pool.query(
        `SELECT i.internid, s.studentID, s.studentName, s.course, s.classcode, i.status, i.withdrawn_reason, c.companyname,
                DATE_FORMAT(i.deployed_on, '%Y-%m-%d') AS deployedOn, co.target_hours, ${APPROVED_HOURS} AS approvedHours,
                (i.status = 'PENDING' AND e.status = 'ACCEPTED' AND e.companyid = i.companyid AND ir.status = 'APPROVED') = 1 AS readyToDeploy,
                (SELECT GROUP_CONCAT(w.weeknumber) FROM weeklyreports w
                 WHERE w.internid = i.internid AND w.status <> 'REJECTED') AS reportedWeeks
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         JOIN courses co ON co.code = s.course
         LEFT JOIN company c ON c.companyid = i.companyid
         LEFT JOIN endorsements e ON e.internid = i.internid
         LEFT JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = ?
         WHERE i.adviserid = ?
         ORDER BY s.studentName`,
        [DATA_PRIVACY_CERTIFICATE, adviserID]
    );
    return rows.map(row => ({
        ...row,
        readyToDeploy: row.readyToDeploy === 1,
        reportedWeeks: row.reportedWeeks ? row.reportedWeeks.split(',').map(Number) : [],
    }));
}

module.exports = {
    fetchInternSummaries,
    deployIntern,
    fetchDeployCheck,
    enrollIntern,
    enrollInterns,
    fetchTakenStudents,
    fetchFinishCheck,
    markEvaluationReceived,
    finishIntern,
    WITHDRAWABLE,
    fetchInternForAdviser,
    withdrawIntern,
    undoWithdraw,
};
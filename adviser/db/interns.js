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

const APPROVED_HOURS = `(SELECT CAST(COALESCE(SUM(w.hours), 0) AS UNSIGNED)
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

// updates the status in the interns table
async function updateInternRemarks(internId, remarks) {
    // Loop through the remarks and update each one in the database
    for (let i = 0; i < remarks.length; i++) {
        await pool.query('UPDATE internrequirements SET remarks = ? WHERE internid = ? AND reqid = ?',
            [remarks[i], internId, i + 1]); // Assuming reqid starts from 1
    }
}

async function enrollIntern(student, adviserID) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            'INSERT INTO students (studentID, studentName, course, year, classcode, email) VALUES (?, ?, ?, ?, ?, ?)',
            [student.id, student.name, student.course, student.year, student.classcode, student.email]
        );
        const [result] = await connection.query(
            "INSERT INTO interns (adviserid, studentid, status) VALUES (?, ?, 'ENROLLED')",
            [adviserID, student.id]
        );
        await connection.query(
            "INSERT INTO internrequirements (internid, reqid, status, remarks) SELECT ?, reqid, 'PENDING', '' FROM requirements",
            [result.insertId]
        );
        await connection.commit();
        return result.insertId;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

// deployed interns with approved hours, status FINISHED means the course's target is reached
async function fetchInterns(adviserID) {
    const [rows] = await pool.query(
        `SELECT s.studentid, s.studentname, s.classcode, c.companyname, c.companyaddress,
                COALESCE(h.totalhours, 0) AS totalhours, co.target_hours,
                CASE WHEN COALESCE(h.totalhours, 0) >= co.target_hours THEN 'FINISHED' ELSE 'ON GOING' END AS status
         FROM interns i
         JOIN students s ON s.studentID = i.studentid
         JOIN courses co ON co.code = s.course
         LEFT JOIN company c ON c.companyid = i.companyid
         LEFT JOIN (SELECT internid, SUM(hours) AS totalhours FROM weeklyreports WHERE status = 'APPROVED' GROUP BY internid) h
                ON h.internid = i.internid
         WHERE i.adviserid = ? AND i.status = 'ACTIVE'`,
        [adviserID]
    );
    return rows;
}

async function fetchInternsByAdviser(adviserid){
    const [rows] = await pool.query("SELECT i.internid, s.studentID, s.studentName, s.course, i.status, c.companyname FROM interns i JOIN students s ON i.studentid = s.studentID LEFT JOIN company c ON i.companyid = c.companyid WHERE i.adviserid = ? ORDER BY s.studentName", [adviserid]);
    return rows;
}

async function fetchInternId(name, adviserID) {
    const [rows] = await pool.query(`
        SELECT interns.internid
        FROM interns
        JOIN students ON interns.studentid = students.studentID
        WHERE students.studentName = ? AND interns.adviserid = ?
    `, [name, adviserID]);

    return rows;
}

// to just check if intern belongs to adviser
async function isAdvisersIntern(internId, adviserID) {
    const [rows] = await pool.query(
        'SELECT 1 FROM interns WHERE internid = ? AND adviserid = ?',
        [internId, adviserID]
    );
    return rows.length === 1;
}

module.exports = {
    deployIntern,
    fetchDeployCheck,
    updateInternRemarks,
    enrollIntern,
    fetchInterns,
    fetchInternsByAdviser,
    fetchInternId,
    isAdvisersIntern,
    fetchFinishCheck, 
    markEvaluationReceived, 
    finishIntern,
};
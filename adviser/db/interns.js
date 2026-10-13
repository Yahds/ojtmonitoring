const { pool } = require('./pool');

// -- functions for changing of intern status

async function deployIntern(internID, adviserID) {
    const [result] = await pool.query(
        `UPDATE interns i
            JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = 4
            SET i.status = 'ACTIVE'
            WHERE i.internid = ? AND i.adviserid = ? AND i.status = 'PENDING' AND ir.status = 'APPROVED'`,
        [internID, adviserID]
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
    updateInternRemarks,
    enrollIntern,
    fetchInterns,
    fetchInternsByAdviser,
    fetchInternId,
    isAdvisersIntern
};
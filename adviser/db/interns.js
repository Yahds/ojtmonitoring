const { pool } = require('./pool');
const bcrypt = require('bcrypt');

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

async function enrollIntern(student, adviserID, password) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        await connection.query(
            'INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, ?, ?, ?)',
            [student.id, student.name, student.course, student.year, student.classcode]
        );
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await connection.query(
            "INSERT INTO interns (password, adviserid, studentid, status) VALUES (?, ?, ?, 'ENROLLED')",
            [hashedPassword, adviserID, student.id]
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

async function fetchInterns(adviserID) {
    const [rows] = await pool.query("SELECT students.studentid, studentname, classcode, companyname, companyaddress, COALESCE(subquery.totalhours, 0) AS totalhours, CASE WHEN COALESCE(subquery.totalhours, 0) < 240 THEN 'ON GOING' WHEN COALESCE(subquery.totalhours, 0) > 240 THEN 'FINISHED' ELSE 'ON GOING' END AS 'status' FROM students LEFT JOIN interns ON students.studentid = interns.studentid LEFT JOIN (SELECT interns.internid, SUM(weeklyreports.hours) AS totalhours FROM interns LEFT JOIN weeklyreports ON interns.internid = weeklyreports.internid AND weeklyreports.status = 'APPROVED' WHERE interns.status = 'ACTIVE' GROUP BY interns.internid) AS subquery ON interns.internid = subquery.internid LEFT JOIN company ON interns.companyid = company.companyid LEFT JOIN advisers ON advisers.adviserID = interns.adviserID WHERE advisers.adviserID = ? AND interns.status = 'ACTIVE'", [adviserID]);
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
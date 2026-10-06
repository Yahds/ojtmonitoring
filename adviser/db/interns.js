const { pool } = require('./pool');
const bcrypt = require('bcrypt');

// -- functions for changing of intern status

async function deployIntern(internID, adviserID) {
    try {
        const [result] = await pool.query(
            `UPDATE interns i
             JOIN internrequirements ir ON ir.internid = i.internid AND ir.reqid = 4
             SET i.status = 'ACTIVE'
             WHERE i.internid = ? AND i.adviserid = ? AND i.status = 'PENDING' AND ir.status = 'APPROVED'`,
            [internID, adviserID]
        );
        return result;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

// updates the status in the interns table
async function updateInternRemarks(internId, remarks) {
    try {
        console.log('Updating remarks for Intern ID:', internId, 'Remarks:', remarks);

        // Loop through the remarks and update each one in the database
        for (let i = 0; i < remarks.length; i++) {
            await pool.query('UPDATE internrequirements SET remarks = ? WHERE internid = ? AND reqid = ?',
                [remarks[i], internId, i + 1]); // Assuming reqid starts from 1
        }

        console.log('Remarks updated successfully');
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertIntern(studentid, adviserid, password, status) {
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await pool.query(
            "INSERT INTO interns (password, adviserid, studentid, status) VALUES (?, ?, ?, ?)",
            [hashedPassword, adviserid, studentid, status]
        );
        return result.insertId;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchInterns(adviserID) {
    try {
        const [rows] = await pool.query("SELECT students.studentid, studentname, classcode, companyname, companyaddress, COALESCE(subquery.totalhours, 0) AS totalhours, CASE WHEN COALESCE(subquery.totalhours, 0) < 240 THEN 'ON GOING' WHEN COALESCE(subquery.totalhours, 0) > 240 THEN 'FINISHED' ELSE 'ON GOING' END AS 'status' FROM students LEFT JOIN interns ON students.studentid = interns.studentid LEFT JOIN (SELECT interns.internid, SUM(weeklyreports.hours) AS totalhours FROM interns LEFT JOIN weeklyreports ON interns.internid = weeklyreports.internid AND weeklyreports.status = 'APPROVED' WHERE interns.status = 'ACTIVE' GROUP BY interns.internid) AS subquery ON interns.internid = subquery.internid LEFT JOIN company ON interns.companyid = company.companyid LEFT JOIN advisers ON advisers.adviserID = interns.adviserID WHERE advisers.adviserID = ? AND interns.status = 'ACTIVE'", [adviserID]);
        return rows;
    } catch (error) {
        console.error('Error executing qeury:', error.message);
        throw error;
    }
}

async function fetchInternsByAdviser(adviserid){
    try{
        const [rows] = await pool.query("SELECT i.internid, s.studentID, s.studentName, s.course, i.status, c.companyname FROM interns i JOIN students s ON i.studentid = s.studentID LEFT JOIN company c ON i.companyid = c.companyid WHERE i.adviserid = ? ORDER BY s.studentName", [adviserid]);
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function fetchInternId(name) {
    try {
        const [rows] = await pool.query(`
            SELECT interns.internid
            FROM interns
            JOIN students ON interns.studentid = students.studentID
            WHERE students.studentName = ?
        `, [name]);

        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}


module.exports = {
    deployIntern,
    updateInternRemarks,
    insertIntern,
    fetchInterns,
    fetchInternsByAdviser,
    fetchInternId,
};
const { pool } = require('./pool');
const bcrypt = require('bcrypt');

const MAX_FAILED_LOGINS = 5;

async function authenticateAdviser(adviserEmail, password) {
    const [rows] = await pool.query(
        "SELECT adviserID, adviserEmail, adviserName, password, role, locked_until > NOW() AS isLocked FROM advisers WHERE adviserEmail = ?",
        [adviserEmail]
    );
    const adviser = rows[0];
    if (!adviser || adviser.isLocked) {
        return null;
    }

    if (await bcrypt.compare(password, adviser.password)) {
        await pool.query("UPDATE advisers SET failed_logins = 0, locked_until = NULL WHERE adviserID = ?", [adviser.adviserID]);
        return adviser;
    }

    // the 5th wrong try locks for 15 minutes and starts the count again
    await pool.query(
        `UPDATE advisers
         SET locked_until = IF(failed_logins + 1 >= ?, NOW() + INTERVAL 15 MINUTE, locked_until),
             failed_logins = IF(failed_logins + 1 >= ?, 0, failed_logins + 1)
         WHERE adviserID = ?`,
        [MAX_FAILED_LOGINS, MAX_FAILED_LOGINS, adviser.adviserID]
    );
    return null;
}

async function fetchAdviser(adviserID) {
    const [rows] = await pool.query("SELECT * FROM advisers where adviserID=?", [adviserID]);

    if (rows.length == 1) {
        const adviser = rows[0]
        return adviser
    }
    return null
}

async function fetchAdvisersByDepartment(departmentid) {
    const [rows] = await pool.query("SELECT adviserID, adviserName, adviserEmail FROM advisers WHERE departmentid = ? AND role = 'adviser' ORDER BY adviserName", [departmentid]);
    return rows; 
}

async function insertAdviser(name, email, password, departmentid){
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query("INSERT INTO advisers (adviserName, adviserEmail, password, departmentid, role) VALUES (?, ?, ?, ?, 'adviser')", [name, email, hashedPassword, departmentid]);
    return result.insertId;
}

module.exports = {
    authenticateAdviser,
    fetchAdviser,
    fetchAdvisersByDepartment,
    insertAdviser,
};

const { pool } = require('./pool');
const bcrypt = require('bcrypt');

async function authenticateAdviser(adviserEmail, password) {
    const [rows] = await pool.query("SELECT adviserID, adviserEmail, adviserName, password, role FROM advisers WHERE adviserEmail = ? LIMIT 1", [adviserEmail]);

    if (rows.length === 1) {
        const adviser = rows[0];
        const hashedPasswordFromDatabase = adviser.password;

        // ccompare the provided password with the hashed password from the database
        const passwordMatch = await bcrypt.compare(password, hashedPasswordFromDatabase);

        if (passwordMatch) {
            return adviser;
        }
    }
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

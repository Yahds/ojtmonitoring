const { pool } = require('./pool');

// fetches all details of students from student table
async function fetchStudents() {
    const [rows] = await pool.query("SELECT * FROM students");
    return rows;
}

module.exports = { fetchStudents };

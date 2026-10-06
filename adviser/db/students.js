const { pool } = require('./pool');

// fetches all details of students from student table
async function fetchStudents() {
    try {
        const [rows] = await pool.query("SELECT * FROM students");
        return rows;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

module.exports = { fetchStudents };

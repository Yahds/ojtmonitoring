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

async function fetchStudent(studentID) {
    try {
        const [rows] = await pool.query("SELECT * FROM students WHERE studentID = ?", [studentID]);
        return rows[0];
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

async function insertStudent(studentID, name, course, year, classcode) {
    try {
        await pool.query(
            "INSERT INTO students (studentID, studentName, course, year, classcode) VALUES (?, ?, ?, ?, ?)",
            [studentID, name, course, year, classcode]
        );
        return studentID;
    } catch (error) {
        console.error('Error executing query:', error.message);
        throw error;
    }
}

module.exports = { fetchStudents, fetchStudent, insertStudent };

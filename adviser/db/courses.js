const { pool } = require('./pool');

async function fetchCourses() {
    const [rows] = await pool.query('SELECT code, name FROM courses ORDER BY code');
    return rows;
}

module.exports = { fetchCourses };

const { pool } = require('./pool');
const { sessionStore } = require('./sessionStore');
const students = require('./students');
const interns = require('./interns');
const requirements = require('./requirements');
const reports = require('./reports');
const journals = require('./journals');
const advisers = require('./advisers');
const announcements = require('./announcements');
const audit = require('./audit');

async function closeDatabase() {
    await sessionStore.close();
    await pool.end();
}

module.exports = {
    ...students,
    ...interns,
    ...requirements,
    ...reports,
    ...journals,
    ...advisers,
    ...announcements,
    ...audit,
    closeDatabase,
};

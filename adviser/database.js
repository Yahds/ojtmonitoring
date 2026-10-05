const { closeDatabase } = require('./db/pool');
const students = require('./db/students');
const interns = require('./db/interns');
const requirements = require('./db/requirements');
const reports = require('./db/reports');
const journals = require('./db/journals');
const advisers = require('./db/advisers');
const announcements = require('./db/announcements');

module.exports = {
    ...students,
    ...interns,
    ...requirements,
    ...reports,
    ...journals,
    ...advisers,
    ...announcements,
    closeDatabase,
};

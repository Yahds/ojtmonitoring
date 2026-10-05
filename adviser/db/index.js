const { closeDatabase } = require('./pool');
const students = require('./students');
const interns = require('./interns');
const requirements = require('./requirements');
const reports = require('./reports');
const journals = require('./journals');
const advisers = require('./advisers');
const announcements = require('./announcements');

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

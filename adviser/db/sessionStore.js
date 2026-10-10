const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const { pool } = require('./pool');

// sessions live in the database, so they survive a restart and can be ended from anywhere
const sessionStore = new MySQLStore({ createDatabaseTable: false }, pool);

module.exports = { sessionStore };

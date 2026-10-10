const { pool } = require('./pool');

async function recordEvent(action, { actorId = null, target = null, ip = null } = {}) {
    await pool.query(
        'INSERT INTO audit_log (actor_adviser_id, action, target, ip) VALUES (?, ?, ?, ?)',
        [actorId, action, target, ip]
    );
}

module.exports = { recordEvent };

const { recordEvent } = require('../db');

// fills in who and from where, from the request
function audit(req, action, target = null) {
    return recordEvent(action, { actorId: req.session.adviserID || null, target, ip: req.ip });
}

module.exports = { audit };

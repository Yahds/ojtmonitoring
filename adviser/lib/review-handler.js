const { audit } = require('./audit');

const REMARK_MAX = 255;

// one route for a weekly report or journal decision. update() returns how many rows changed,
// so 0 means the item isn't this adviser's or isn't in one of fromStatuses
function reviewHandler({ page, idField, what, update, fromStatuses, notAllowed, auditAction, success }) {
    return async (req, res, next) => {
        try {
            const internId = req.params.internId;
            const id = req.body[idField];
            const { decision } = req.body;
            const remark = typeof req.body.remark === 'string' ? req.body.remark.trim() : '';
            const backTo = `/adviser/interns/${internId}/${page}`;

            if (decision !== 'APPROVED' && decision !== 'REJECTED') {
                req.flash('error', 'Choose Approve or Reject.');
                return res.redirect(backTo);
            }
            if (remark.length > REMARK_MAX) {
                req.flash('error', `Keep your remark to ${REMARK_MAX} characters or fewer.`);
                return res.redirect(backTo);
            }

            const changed = await update(id, internId, req.session.adviserID, decision, remark || null, fromStatuses);
            if (changed === 0) {
                req.flash('error', notAllowed);
                return res.redirect(backTo);
            }
            await audit(req, auditAction(decision), `intern ${internId} ${what} ${id}: ${decision}`);
            req.flash('success', success(decision));
            res.redirect(backTo);
        } catch (error) {
            next(error);
        }
    };
}

module.exports = { reviewHandler, REMARK_MAX };

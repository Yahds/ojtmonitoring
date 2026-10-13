const express = require('express');
const { fetchEndorsements, markEndorsementsSent, markRepliesReceived } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

function chosenInterns(body) {
    return [].concat(body.internIds || []).map(Number).filter(Number.isInteger);
}

router.get('/endorsements', requireAdviser, async (req, res, next) => {
    try {
        const endorsements = await fetchEndorsements(req.session.adviserID);
        const withStatus = status => endorsements.filter(e => e.status === status);
        res.render('ojt-dashboard/views/endorsements', {
            title: 'Endorsements',
            toSend: withStatus('REQUESTED'),
            waiting: withStatus('SENT'),
            accepted: withStatus('ACCEPTED'),
        });
    } catch (error) {
        next(error);
    }
});

function moveStep(mark, event, doneMessage) {
    return async (req, res, next) => {
        try {
            const moved = await mark(chosenInterns(req.body), req.session.adviserID);
            for (const internId of moved) {
                await audit(req, event, String(internId));
            }
            if (moved.length > 0) {
                req.flash('success', doneMessage(moved.length));
            } else {
                req.flash('error', 'Select at least one intern first.');
            }
            res.redirect('/adviser/endorsements');
        } catch (error) {
            next(error);
        }
    };
}

router.post('/endorsements/sent', requireAdviser, moveStep(markEndorsementsSent, 'endorsement_sent',
    count => `${count} endorsement ${count === 1 ? 'letter' : 'letters'} marked as sent.`));

router.post('/endorsements/reply-received', requireAdviser, moveStep(markRepliesReceived, 'endorsement_accepted',
    count => `${count} reply ${count === 1 ? 'form' : 'forms'} marked as received. You can now deploy ${count === 1 ? 'that intern' : 'those interns'}.`));

module.exports = router;

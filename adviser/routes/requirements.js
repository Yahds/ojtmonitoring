const express = require('express');
const path = require('path');
const { fetchInternId, fetchRequirementsForReview, updateRequirementReview, fetchRequirementFile,
    fetchRequirementVersions, fetchVersionFile, fetchInternForAdviser } = require('../db');
const { requireAdviser } = require('../middleware/auth');
const { audit } = require('../lib/audit');

const router = express.Router();

router.get("/requirements-reports/:internName", requireAdviser, async (req, res, next) => {
    try {
        const internName = req.params.internName;

        // Fetch the intern ID
        const internIdResult = await fetchInternId(internName, req.session.adviserID);
        const internId = internIdResult[0]?.internid;
        if (!internId) {
            return res.status(404).send("Intern not found");
        }

        // Fetch the assigned requirements using the intern ID
        const assignedRequirements = await fetchRequirementsForReview(internId, req.session.adviserID);

        // Format dates in assigned requirements
        assignedRequirements.forEach(requirement => {
            if (requirement.datesubmitted) {
                requirement.datesubmitted = new Date(requirement.datesubmitted).toDateString();
            }
        });

        // Render the intern requirements view with the requirements data
        res.render('ojt-dashboard/views/intern-requirement.pug', {
            assignedRequirements
        });
    } catch (error) {
        next(error);
    }
});

router.get("/interns/:internId/requirements", requireAdviser, async (req, res, next) => {
    try {
        const internId = req.params.internId;
        const [intern, assignedRequirements] = await Promise.all([
            fetchInternForAdviser(internId, req.session.adviserID),
            fetchRequirementsForReview(internId, req.session.adviserID),
        ]);
        if (!intern) return next();

        assignedRequirements.forEach(requirement => {
            if (requirement.datesubmitted) {
                requirement.datesubmitted = new Date(requirement.datesubmitted).toDateString();
            }
        });

        res.render('ojt-dashboard/views/review-requirements', {
            title: `Requirements · ${intern.studentName}`, intern, assignedRequirements, internId
        });
    } catch (error) {
        next(error);
    }
});

// the first decision and a later change share the same checks; only the allowed starting statuses differ
function reviewHandler({ fromStatuses, notAllowed, auditAction, success }) {
    return async (req, res, next) => {
        try {
            const internId = req.params.internId;
            const { reqid, decision } = req.body;
            const remarks = typeof req.body.remarks === 'string' ? req.body.remarks.trim() : '';
            const backTo = `/adviser/interns/${internId}/requirements`;

            if (decision !== 'APPROVED' && decision !== 'REJECTED') {
                req.flash('error', 'Choose Approve or Reject.');
                return res.redirect(backTo);
            }
            if (remarks.length > 200) {
                req.flash('error', 'Keep your remark to 200 characters or fewer.');
                return res.redirect(backTo);
            }

            const changed = await updateRequirementReview(internId, reqid, req.session.adviserID, decision, remarks || null, fromStatuses);
            if (changed === 0) {
                req.flash('error', notAllowed);
                return res.redirect(backTo);
            }
            await audit(req, auditAction(decision), `intern ${internId} requirement ${reqid}: ${decision}`);
            req.flash('success', success(decision));
            res.redirect(backTo);
        } catch (error) {
            next(error);
        }
    };
}

router.post('/interns/:internId/requirements', requireAdviser, reviewHandler({
    fromStatuses: ['SUBMITTED'],
    notAllowed: 'Only a submitted requirement can be approved or rejected.',
    auditAction: decision => (decision === 'APPROVED' ? 'requirement_approved' : 'requirement_rejected'),
    success: decision => (decision === 'APPROVED' ? 'Requirement approved.' : 'Requirement rejected.'),
}));

// fixes a decision made by mistake or rewords the remark
router.post('/interns/:internId/requirements/change', requireAdviser, reviewHandler({
    fromStatuses: ['APPROVED', 'REJECTED'],
    notAllowed: 'Only an approved or rejected requirement can be changed. If the intern sent a new version, review that one.',
    auditAction: () => 'requirement_review_changed',
    success: () => 'Your decision and remark were saved.',
}));

router.get("/interns/:internId/requirements/:reqid/file", requireAdviser, async (req, res, next) => {
    try {
        const { internId, reqid } = req.params;
        const filePath = await fetchRequirementFile(internId, reqid, req.session.adviserID);

        if (!filePath) {
            return res.status(404).send("File not found");
        }

        const safePath = path.join('/var/www/uploads', path.basename(filePath));
        res.sendFile(safePath, (err) => {
            if (err) {
                console.error('Error sending file:', err.message);
                if (!res.headersSent) res.status(404).send("File not found");
            }
        });
    } catch (error) {
        next(error);
    }
});

router.get('/interns/:internId/requirements/:reqid/versions', requireAdviser, async (req, res, next) => {
    try {
        const { internId, reqid } = req.params;
        const requirement = await fetchRequirementVersions(internId, reqid, req.session.adviserID);
        if (!requirement) {
            return next();
        }
        res.render('ojt-dashboard/views/requirement-versions', {
            title: `${requirement.requirementname} versions`, requirement, internId, reqid,
        });
    } catch (error) {
        next(error);
    }
});

router.get('/interns/:internId/requirements/:reqid/versions/:versionNo/file', requireAdviser, async (req, res, next) => {
    try {
        const { internId, reqid, versionNo } = req.params;
        const filePath = await fetchVersionFile(internId, reqid, versionNo, req.session.adviserID);
        if (!filePath) {
            return next();
        }
        res.sendFile(path.join('/var/www/uploads', path.basename(filePath)), { headers: { 'X-Content-Type-Options': 'nosniff' } }, error => {
            if (error && !res.headersSent) {
                next(); // the version is there but the file is gone
            }
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

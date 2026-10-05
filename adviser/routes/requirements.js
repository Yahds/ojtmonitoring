const express = require('express');
const path = require('path');
const { fetchInternId, fetchRequirementsForReview, updateRequirementReview, fetchRequirementFile,
    fetchUnassignedRequirements, insertNewRequirement, insertInternRequirement,
    fetchRequirementsByStudentId } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get("/ojt-dashboard/requirements-reports/:internName", requireAuth, async (req, res) => {
    try {
        const internName = req.params.internName;
        console.log('Fetching reports for intern:', internName);

        // Fetch the intern ID
        const internIdResult = await fetchInternId(internName);
        const internId = internIdResult[0]?.internid;
        if (!internId) {
            console.log('No intern found for name:', internName);
            return res.status(404).send("Intern not found");
        }

        console.log(internId + ' is ' + internName);

        // Fetch the assigned requirements using the intern ID
        const assignedRequirements = await fetchRequirementsForReview(internId, req.session.adviserID);

        // Format dates in assigned requirements
        assignedRequirements.forEach(requirement => {
            if (requirement.datesubmitted) {
                requirement.datesubmitted = new Date(requirement.datesubmitted).toDateString();
            }
        });

        console.log('Assigned Requirements:', assignedRequirements);


        // Render the intern requirements view with the requirements data
        res.render('ojt-dashboard/views/intern-requirement.pug', {
            assignedRequirements
        });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.get("/ojt-dashboard/requirements-review/:internId", requireAuth, async (req, res) => {
    try {
        const internId = req.params.internId;

        const assignedRequirements = await fetchRequirementsForReview(internId, req.session.adviserID);

        // Format dates in assigned requirements
        assignedRequirements.forEach(requirement => {
            if (requirement.datesubmitted) {
                requirement.datesubmitted = new Date(requirement.datesubmitted).toDateString();
            }
        });

        console.log('Assigned Requirements:', assignedRequirements);

        // Render the intern requirements view with the requirements data
        res.render('ojt-dashboard/views/review-requirements', {
            assignedRequirements, internId
        });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.post("/ojt-dashboard/requirements-review/:internId", requireAuth, async (req, res) => {
    try {
        const internId = req.params.internId;
        const { reqid, decision, remarks } = req.body;

        if (decision !== 'APPROVED' && decision !== 'REJECTED') {
            return res.status(400).send("Invalid decision");
        }

        await updateRequirementReview(internId, reqid, req.session.adviserID, decision, remarks);

        res.redirect(`/ojt-dashboard/requirements-review/${internId}`);
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.get("/ojt-dashboard/requirement-file/:internId/:reqid", requireAuth, async (req, res) => {
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
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

router.get("/fetch-unassigned-requirements/:internId", requireAuth, async (req, res) => {
    try {
        const internId = req.params.internId;
        console.log('Fetching unassigned requirements for intern ID: ' + internId);
        const internIdResult = await fetchInternId(internId);
        console.log('Intern ID result: ' + JSON.stringify(internIdResult));

        // Assuming internIdResult is an object and the actual ID is a property of this object
        const actualInternId = internIdResult[0].internid;
        console.log('this is beign sent' + actualInternId)

        const unassignedRequirements = await fetchUnassignedRequirements(actualInternId);
        console.log('Unassigned requirements from server: ', unassignedRequirements);
        res.json(unassignedRequirements);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Warning: Internal Server Error');
    }
});



router.post('/ojt-dashboard/postrequirement', requireAuth, async (req, res) => {
    const existingRequirementId = req.body['existing-requirement-dropdown'];
    const newRequirementName = req.body['new-requirement-name'];
    const internId = req.body['intern-id'];

    try {
        let requirementId;

        if (newRequirementName) {
            requirementId = await insertNewRequirement(newRequirementName);
            console.log("New Requirement ID: ", requirementId); // Log for debugging
            await insertInternRequirement(internId, requirementId);
        } else if (existingRequirementId) {
            requirementId = existingRequirementId;
            await insertInternRequirement(internId, requirementId);
        } else {
            // Send a response with status 400 (Bad Request) and a message
            return res.status(400).json({ message: "Pick a requirement please" });
        }

        res.redirect('/ojt-dashboard');
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Warning: Internal Server Error');
    }
});

router.get('/ojt-pending/requirements', requireAuth, async (req, res) => {
    const studentId = req.query.studentId;

    try {
        const requirements = await fetchRequirementsByStudentId(studentId);
        res.json(requirements);
    } catch (error) {
        console.error('Error fetching requirements:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

module.exports = router;

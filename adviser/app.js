require('dotenv').config();

const express = require('express');
const session = require('express-session');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.urlencoded({ extended: true }));
// for session handling
app.use(session({
    secret: process.env.SESSION_SECRET, // A secret key for signing the session ID cookie
    resave: false,              // Forces the session to be saved back to the session store
    saveUninitialized: false,    // set to false so it doesn't save empty sessions for users who never login
    cookie: { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }   // Set true if using HTTPS, false otherwise
}));

// to block requests that are not logged in
function requireAuth(req, res, next) {
    if (req.session.isLoggedIn) {
        return next();
    }
    return res.redirect('/ojt-login-page');
}

function requireRole(role){
    return function(req, res, next){
        if (!req.session.isLoggedIn){
            return res.redirect('/ojt-login-page');
        }
        if (req.session.role !== role) {
            return res.status(403).send('Forbidden (403): you do not have access to this page.');
        }
        return next();
    }
}

app.use('/ojt-images', express.static(path.join(__dirname, 'ojt-images')));
app.use('/ojt-about-us', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-about-us')))
app.use('/ojt-login-page', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-login-page')));
app.use('/ojt-pending', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-pending')));
app.use('/ojt-dashboard', express.static(path.join(__dirname, 'ojt-monitoring-files', 'ojt-dashboard')))

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'ojt-monitoring-files'));

// Import functions from database.js
const { fetchStudent, fetchStudents, fetchPendingStudents, fetchPendingStudentsByName, fetchPendingStudentsByClassCode, fetchPendingStudentsByAddress,
    fetchPendingStudentsByCompany, fetchPendingStudentsByWorkType, updateStatus, insertInternRequirement,
    fetchInternDailyReports, fetchUnassignedRequirements, insertNewRequirement, fetchRequirementsByStudentId, fetchRequirementsByInternId, updateRemarks, 
    fetchSupervisor, fetchWeeklyReports, uploadPicture, authenticateAdviser, fetchInterns, fetchInternsByAdviser, fetchAnnouncements,
    deleteAnnouncement, fetchAdviser, fetchAdvisersByDepartment, insertAdviser, insertAnnouncement, fetchInternId, updateInternRemarks, 
    insertStudent, insertIntern} = require('./database.js');

//GET 
// // run node app.js then access http://localhost:8080/ojt-login-page/
app.get("/", async (req, res) => {
    try {
        if (req.session.isLoggedIn) {

            res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/', { students })
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

// // run node app.js then access http://localhost:8080/ojt-login-page/
app.get("/ojt-login-page", async (req, res) => {
    try {
        if (req.session.isLoggedIn) {

            res.redirect('/ojt-dashboard');
        }

        const students = await fetchStudents();
        res.render('ojt-login-page/index', { students })
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.get("/ojt-dashboard", requireAuth, async (req, res) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInterns(req.session.adviserID);
        let pendingcount = 0, total = interns.length, finished = 0;

        // Prepare a map or object to hold the unassigned requirements for each intern


        for (let i = 0; i < interns.length; i++) {
            let intern = interns[i];
            switch (intern.status) {
                case 'ON GOING':
                    pendingcount++;
                    break;
                case 'FINISHED':
                    finished++;
                    break;
            }


        }

        let unassignedRequirementsMap = {};
        const reports = {}; // Temporary still doing

        if (adviser) {
            const announcements = await fetchAnnouncements(adviser.adviserID)

            res.render('ojt-dashboard/index', {
                adviser,
                interns,
                announcements,
                pendingcount,
                finished,
                reports,
                total,
                unassignedRequirementsMap
            });
        } else {
            res.redirect('/ojt-login-page');
        }

    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error")
    }
});

app.get("/ojt-admin", requireRole('dept_head'), async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        res.render('ojt-admin/index', { adviser });
    } catch (error) {
        console.error('Error: ', error.message);
        res.status(500).send('Warning: Internal Server Error')
    }
});

app.get("/ojt-admin/advisers", requireRole('dept_head'), async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const advisers = await fetchAdvisersByDepartment(adviser.departmentid);
        res.render('ojt-admin/views/advisers', { adviser, advisers });
    } catch (error) {
        console.error('Error: ', error.message);
        res.status(500).send('Warning: Internal Server Error')
    }
});

app.get("/ojt-dashboard/daily-reports/:internName", requireAuth, async (req, res) => {
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

        // Fetch the reports using the intern ID
        const reports = await fetchInternDailyReports(internId);

        // Check if reports array is empty
        if (reports.length === 0) {
            return res.render('ojt-dashboard/views/no-reports.pug', {
                message: 'No daily reports found for ' + internName,
                colspan: 9,
                reportsExist: false
            });
        }

        for (let report of reports) {
            report.date = new Date(report.date).toDateString();
            const supervisorDetails = await fetchSupervisor(report.supervisorid);
            report.supervisorName = supervisorDetails.supervisorname;
        }
        console.log('Reports:', reports);

        // Render the intern reports view with the reports data
        res.render('ojt-dashboard/views/intern-reports.pug', { reports });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

app.get("/ojt-dashboard/weekly-reports/:internName", requireAuth, async (req, res) => {
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

        // Fetch the full week reports using the intern ID
        const weeklyReports = await fetchWeeklyReports(internId);

        // Check if weeklyReports array is empty
        if (weeklyReports.length === 0) {
            return res.render('ojt-dashboard/views/no-reports.pug', {
                message: 'No full week reports found for ' + internName,
                colspan: 4,
                reportsExist: false
            });
        }

        weeklyReports.forEach(report => {
            report.date = new Date(report.date).toDateString(); // Format the date
        });

        console.log('Full Week Reports:', weeklyReports);

        // Render the weekly report view with the reports data
        res.render('ojt-dashboard/views/weekly-report.pug', { weeklyReports });
    } catch (error) {
        console.error('Error', error);
        res.status(500).send("Warning: Internal Server Error");
    }
});

app.get("/ojt-dashboard/requirements-reports/:internName", requireAuth, async (req, res) => {
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
        const assignedRequirements = await fetchRequirementsByInternId(internId);

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

app.get("/fetch-unassigned-requirements/:internId", requireAuth, async (req, res) => {
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



app.post('/ojt-dashboard/postrequirement', requireAuth, async (req, res) => {
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

app.get('/ojt-dashboard/enroll', requireAuth, async (req, res) => {
    try{
        const adviser = await fetchAdviser(req.session.adviserID);
        const interns = await fetchInternsByAdviser(req.session.adviserID);
        if(adviser){
            res.render('ojt-dashboard/views/interns', {adviser, interns})
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        console.error('Error loading enroll advisers page:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});



app.get('/ojt-pending/requirements', requireAuth, async (req, res) => {
    const studentId = req.query.studentId;

    try {
        const requirements = await fetchRequirementsByStudentId(studentId);
        res.json(requirements);
    } catch (error) {
        console.error('Error fetching requirements:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});



// run node app.js then access http://localhost:8080/ojt-pending/
app.get("/ojt-pending", requireAuth, async (req, res) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        if (adviser) {
            const students = await fetchStudents();
            const pendingStudents = await fetchPendingStudents(req.session.adviserID);
            res.render('ojt-pending/index', { adviser, students, pendingStudents })
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.get('/ojt-pending/sort', requireAuth, async (req, res) => {
    const sortBy = req.query.sortBy;

    try {
        let pendingStudents;

        switch (sortBy) {
            case 'name':
                pendingStudents = await fetchPendingStudentsByName(req.session.adviserID);
                break;
            case 'classcode':
                pendingStudents = await fetchPendingStudentsByClassCode(req.session.adviserID);
                break;
            case 'company':
                pendingStudents = await fetchPendingStudentsByCompany(req.session.adviserID);
                break;
            case 'address':
                pendingStudents = await fetchPendingStudentsByAddress(req.session.adviserID);
                break;
            case 'worktype':
                pendingStudents = await fetchPendingStudentsByWorkType(req.session.adviserID);
                break;
            default:
                pendingStudents = await fetchPendingStudents(req.session.adviserID);
        }

        res.json(pendingStudents);
    } catch (error) {
        console.error('Error:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.get("/ojt-about-us", requireAuth, async (req, res) => {
    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        if (adviser) {
           
            res.render('ojt-about-us/index', { adviser })
        } else {
            res.redirect('/ojt-login-page');
        }
    } catch (error) {
        console.error('Error loading about-us page:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});


app.get('/logout', requireAuth, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.log("A problem occured while logging out: " + err.message)
        }
        console.log("pakilog out")
        res.redirect('/ojt-login-page');
    });
});



//POST REQUESTS

app.post('/ojt-admin/advisers', requireRole('dept_head'), async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const adviser = await fetchAdviser(req.session.adviserID);
        await insertAdviser(name, email, password, adviser.departmentid);
        res.redirect('/ojt-admin/advisers');
    } catch (error) {
        console.error('Error', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

// updates the remarks
app.post('/update-remarks', requireAuth, async (req, res) => {
    const { studentId, remarks } = req.body;
    console.log('Received Update Remarks Request - Student ID:', studentId, 'Remarks:', remarks);

    try {
        // Call the updateRemarks function from your database.js
        await updateRemarks(studentId, remarks);

        // Send a response indicating success
        res.json({ message: 'Remarks updated successfully' });
    } catch (error) {
        console.error('Error updating remarks:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.post('/update-intern-remarks', requireAuth, async (req, res) => {
    const { internId, remarks } = req.body;
    console.log(req.body)
    console.log('Received Update Intern Remarks Request - Intern ID:', internId, 'Remarks:', remarks);

    try {
        await updateInternRemarks(internId, remarks);
        res.json({ message: 'Remarks updated successfully' });
    } catch (error) {
        console.error('Error updating intern remarks:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

// update the '/update-status' route in ojt-pending-page
app.post('/update-status', requireAuth, async (req, res) => {
    const { studentId, newStatus } = req.body;
    
    console.log('Received Update Request - Student ID:', studentId, 'New Status:', newStatus);
    
    try {
        await updateStatus(studentId, newStatus);
        const updatedStudent = await fetchStudent(studentId);
        res.json(updatedStudent);
        
    } catch (error) {
      console.error('Error updating status:', error.message);
      res.status(500).send('Warning: Internal Server Error');
    }
    });

// handling of the post requst (authenticating advisor in login)
app.post("/ojt-login-page", async (req, res) => {
    const { adviserEmail, password } = req.body;

    try {
        const adviser = await authenticateAdviser(adviserEmail, password);
        if (adviser) {
            req.session.adviserID = adviser.adviserID;
            req.session.isLoggedIn = true;
            req.session.role = adviser.role;
            if (adviser.role === 'dept_head'){
                res.redirect('/ojt-admin');
            } else {
                res.redirect('/ojt-dashboard');
            }
        } else {
            res.status(401).send('false'); // Send back a simple 'false' string
        }
    } catch (error) {
        console.error('Error authenticating adviser:', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.post('/ojt-dashboard/enroll', requireAuth, async (req, res) => {
    const studentID = req.body['studentID'];
    const name = req.body['name'];
    const course = req.body['course'];
    const year = req.body['year'];
    const classcode = req.body['classcode'];
    const password = req.body['password'];

    try {
        await insertStudent(studentID, name, course, year, classcode);
        await insertIntern(studentID, req.session.adviserID, password, "ENROLLED")
        res.redirect('/ojt-dashboard');
    } catch (error){
        console.error('Error enrolling student: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.post('/ojt-dashboard/postannouncement', requireAuth, async (req, res) => {
    const sender = req.body['sender'];
    const recipient = req.body.recipient;
    const subject = req.body['subject-text'];
    const description = req.body['description-text'];
    console.log("Inserting announcement");

    try {
        await insertAnnouncement(sender, recipient, subject, description);
        res.redirect('/ojt-dashboard');
    } catch (error) {
        console.error('Error inserting announcement: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});


app.post('/ojt-dashboard/deleteannouncement', requireAuth, async (req, res) => {
    const announcementid = req.body['announcementid'];

    try {
        await deleteAnnouncement(announcementid);
        res.redirect('/ojt-dashboard');
    } catch (error) {
        console.error('Error deleting announcement: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
})


app.post('/ojt-dashboard/uploadprofilepicture', requireAuth, async (req, res) => {
    console.log("upload")
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    let uploadedFile = req.files.prof_image;

    try{
        await uploadPicture(uploadedFile);
        res.redirect('/ojt-dashboard');
    }catch (error){
        console.error('Error uploading profile picture: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});

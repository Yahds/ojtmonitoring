require('dotenv').config();
const { requireAuth} = require('./middleware/auth');

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
    updateRemarks,
    fetchInterns, fetchInternsByAdviser, fetchAnnouncements, fetchAllRequirements, deleteAnnouncement, fetchAdviser,
    insertAnnouncement, updateInternRemarks, insertStudent, insertIntern, deployIntern} = require('./db');

const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');

const journalRoutes = require('./routes/journals');
const reportRoutes = require('./routes/reports');
const requirementRoutes = require('./routes/requirements');

app.use(adminRoutes);
app.use(authRoutes);
app.use(journalRoutes);
app.use(reportRoutes);
app.use(requirementRoutes);


//GET 

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

//POST REQUESTS

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

app.post('/ojt-dashboard/enroll', requireAuth, async (req, res) => {
    const studentID = req.body['studentID'];
    const name = req.body['name'];
    const course = req.body['course'];
    const year = req.body['year'];
    const classcode = req.body['classcode'];
    const password = req.body['password'];

    try {
        await insertStudent(studentID, name, course, year, classcode);
        const internid = await insertIntern(studentID, req.session.adviserID, password, "ENROLLED")
        const requirements = await fetchAllRequirements();
        for (const requirement of requirements){
            await insertInternRequirement(internid, requirement.reqid);
        }
        res.redirect('/ojt-dashboard');
    } catch (error){
        console.error('Error enrolling student: ', error.message);
        res.status(500).send('Warning: Internal Server Error');
    }
});

app.post('/ojt-dashboard/deploy', requireAuth, async (req, res) => {
    try {
        const internID = req.body.internID;
        const result = await deployIntern(internID, req.session.adviserID);
        if (result.affectedRows == 0) {
            return res.status(400).send('Cannot deploy: the intern must have a chosen company and an approved endorsement');
        }
        res.redirect('/ojt-dashboard/enroll');
    } catch (error) {
        console.error('Error deploying intern:', error.message);
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

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server is running at port ${port}`);
    });
}

module.exports = app;

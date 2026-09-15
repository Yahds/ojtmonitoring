const express = require('express');
const router = express.Router();

router.post('/ojt-dashboard', (request, response) => {
    const express = require('express');
    const bodyParser = require('body-parser');
    const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.post('/postannouncement', (req, res) => {
    const subject = req.body['subject-text'];
    const description = req.body['description-text'];

    // Handle your data here (e.g., save to database, process, etc.)

    res.send('Announcement received');
});
})
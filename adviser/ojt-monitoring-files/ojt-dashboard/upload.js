const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    let uploadedFile = req.files.prof_image;
    let filename = req.files.filename;

    uploadedFile.mv('uploads/${}', err => {
        if (err) {
            res.sendStatus(500);
        } else {
            response.sent()
        }
    });
});

module.exports = router;
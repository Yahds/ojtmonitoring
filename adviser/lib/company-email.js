const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// tests point this at a temp folder, because the real uploads folder is read-only here
const uploadsDir = () => process.env.UPLOADS_DIR || '/var/www/uploads';

function emailSubject(company) {
    return `OJT applicants from Saint Louis University - ${company.companyname}`;
}

// the adviser copies this, attaches the zip and sends it themselves
function emailBody(company, students, adviserName) {
    const list = students.map((student, index) => `${index + 1}. ${student.studentName} (${student.course})`).join('\n');
    return [
        'Good day,',
        '',
        `Saint Louis University SAMCIS would like to endorse the following students for on-the-job training at ${company.companyname}:`,
        '',
        list,
        '',
        'Their CVs are attached. Please let us know which students you accept.',
        '',
        'Thank you,',
        adviserName,
        'OJT Adviser, SAMCIS',
    ].join('\n');
}

// "Reyes, Ana" + ".pdf" -> "Reyes Ana - CV.pdf"; only letters, numbers, spaces and dashes
function cvFileName(student) {
    const name = student.studentName.replace(/[^\p{L}\p{N} -]/gu, ' ').replace(/\s+/g, ' ').trim() || String(student.studentID);
    return `${name} - CV${path.extname(student.cvFile).toLowerCase()}`;
}

// the students whose CV file is still on disk
function cvsOnDisk(students) {
    return students.filter(student => student.cvFile && fs.existsSync(path.join(uploadsDir(), path.basename(student.cvFile))));
}

function zipCvs(students, res) {
    const zip = archiver('zip');
    zip.on('error', error => res.destroy(error));
    zip.pipe(res);
    for (const student of students) {
        zip.file(path.join(uploadsDir(), path.basename(student.cvFile)), { name: cvFileName(student) });
    }
    return zip.finalize();
}

module.exports = { emailSubject, emailBody, cvFileName, cvsOnDisk, zipCvs };

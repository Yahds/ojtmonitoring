const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const multer = require('multer');

// the student app mounts the same folder read-only to let interns download
const ATTACHMENT_DIR = process.env.ANNOUNCEMENT_FILES_DIR || '/var/www/announcement-files';
const MAX_BYTES = 5 * 1024 * 1024;

const SIZE_ERROR = 'The file exceeds the 5 MB size limit. Please upload a smaller file.';
const TYPE_ERROR = 'This file type is not supported. Please upload a PDF, JPG, PNG, DOC or DOCX file.';

// same types the student uploads allow; checked by the first bytes, because the filename can lie
const SIGNATURES = [
    { ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
    { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
    { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
    { ext: 'doc', bytes: [0xd0, 0xcf, 0x11, 0xe0] },
    { ext: 'docx', bytes: [0x50, 0x4b, 0x03, 0x04] },
];

function fileTypeOf(buffer) {
    const match = SIGNATURES.find(({ bytes }) => bytes.every((byte, i) => buffer[i] === byte));
    return match ? match.ext : null;
}

const parse = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_BYTES, files: 1, fields: 10 },
}).single('attachment');

// runs before the CSRF check, which needs the token from the form body; only for logged-in advisers
function parseAttachment(req, res, next) {
    if (!req.session.adviserID || !req.is('multipart/form-data')) {
        return next();
    }
    parse(req, res, error => {
        if (error && error.code === 'LIMIT_FILE_SIZE') {
            req.attachmentError = SIZE_ERROR;
            return next();
        }
        next(error);
    });
}

function attachmentError(req) {
    if (req.attachmentError) {
        return req.attachmentError;
    }
    if (req.file && !fileTypeOf(req.file.buffer)) {
        return TYPE_ERROR;
    }
    return null;
}

async function saveAttachment(file) {
    const name = `announcement_${crypto.randomBytes(8).toString('hex')}.${fileTypeOf(file.buffer)}`;
    await fs.writeFile(path.join(ATTACHMENT_DIR, name), file.buffer, { flag: 'wx' });
    return { filePath: name, fileName: path.basename(file.originalname).slice(0, 255) };
}

async function removeAttachment(filePath) {
    if (filePath) {
        await fs.rm(path.join(ATTACHMENT_DIR, path.basename(filePath)), { force: true });
    }
}

function attachmentPath(filePath) {
    return path.join(ATTACHMENT_DIR, path.basename(filePath));
}

module.exports = { parseAttachment, attachmentError, saveAttachment, removeAttachment, attachmentPath, fileTypeOf };

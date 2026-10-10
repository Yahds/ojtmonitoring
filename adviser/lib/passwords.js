const MIN_LENGTH = 15;
// bcrypt only reads the first 72 bytes, and letters like ñ take 2 bytes
const MAX_LENGTH = 64;

// long passwords that still show up in leaked-password lists
const COMMON_PASSWORDS = new Set([
    'passwordpassword',
    'password12345678',
    '123456789012345',
    '1234567890123456',
    'qwertyuiopasdfg',
    'qwertyuiopasdfgh',
    'abcdefghijklmnop',
    'iloveyouiloveyou',
    'saintlouisuniversity',
    'slu-ojt-portal-password',
]);

// returns what is wrong with a new password, or null when it is fine
function passwordProblem(password) {
    const text = typeof password === 'string' ? password : '';
    if (text.length < MIN_LENGTH) {
        return `Use at least ${MIN_LENGTH} characters.`;
    }
    if (text.length > MAX_LENGTH) {
        return `Use ${MAX_LENGTH} characters or fewer.`;
    }
    if (COMMON_PASSWORDS.has(text.toLowerCase())) {
        return 'This password is too common. Choose another one.';
    }
    return null;
}

module.exports = { passwordProblem };

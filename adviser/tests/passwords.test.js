const { passwordProblem } = require('../lib/passwords');

test('a long passphrase is accepted', () => {
    expect(passwordProblem('blue tables walk slowly')).toBeNull();
});

test('a password under 15 characters is rejected', () => {
    expect(passwordProblem('short-pass-123')).toBe('Use at least 15 characters.');
});

test('a password over 64 characters is rejected', () => {
    expect(passwordProblem('a'.repeat(65))).toBe('Use 64 characters or fewer.');
});

test('a common password is rejected even when it is long enough', () => {
    expect(passwordProblem('PasswordPassword')).toBe('This password is too common. Choose another one.');
});

test('a missing password is rejected', () => {
    expect(passwordProblem(undefined)).toBe('Use at least 15 characters.');
});

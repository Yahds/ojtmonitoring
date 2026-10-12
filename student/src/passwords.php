<?php
const PASSWORD_MIN_LENGTH = 15;
// bcrypt only reads the first 72 bytes, and letters like ñ take 2 bytes
const PASSWORD_MAX_LENGTH = 64;

const COMMON_PASSWORDS = [
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
];

function passwordProblem(string $password): ?string
{
    $length = mb_strlen($password);
    if ($length < PASSWORD_MIN_LENGTH) {
        return 'Use at least ' . PASSWORD_MIN_LENGTH . ' characters.';
    }
    if ($length > PASSWORD_MAX_LENGTH) {
        return 'Use ' . PASSWORD_MAX_LENGTH . ' characters or fewer.';
    }
    if (in_array(mb_strtolower($password), COMMON_PASSWORDS, true)) {
        return 'This password is too common. Choose another one.';
    }
    return null;
}

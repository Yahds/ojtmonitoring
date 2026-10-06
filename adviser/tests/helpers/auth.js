const request = require('supertest');
const { insertAdviser } = require('../../db');
const { pool } = require('../../db/pool');

const TEST_PASSWORD = 'test-password-123';

// creates a temp adviser with a known password for tests to log in
async function createTestAdviser(label) {
    const email = `test-${label}-${Date.now()}@example.com`;
    const adviserID = await insertAdviser(`Test ${label}`, email, TEST_PASSWORD, 1);
    return { adviserID, email };
}

// removes the temp adviser after the tests
async function deleteTestAdviser(adviserID) {
    await pool.query('DELETE FROM advisers WHERE adviserID = ?', [adviserID]);
}

// logs in and returns an agent that remembers session cookie
async function loginAs(app, email) {
    const agent = request.agent(app);
    await agent
        .post('/ojt-login-page')
        .type('form')
        .send({ adviserEmail: email, password: TEST_PASSWORD });
    return agent;
}

module.exports = { createTestAdviser, deleteTestAdviser, loginAs };

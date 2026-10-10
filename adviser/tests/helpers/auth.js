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

// reads the CSRF token from the hidden form field of a page
async function csrfTokenFrom(agent, url) {
    const res = await agent.get(url);
    const match = res.text.match(/name="csrf_token" value="([0-9a-f]{64})"/);
    if (!match) {
        throw new Error(`no CSRF token found on ${url} (status ${res.status})`);
    }
    return match[1];
}

// logs in and returns an agent that remembers session cookie
async function loginAs(app, email, password = TEST_PASSWORD) {
    const agent = request.agent(app);
    const csrfToken = await csrfTokenFrom(agent, '/adviser/login');
    await agent
        .post('/adviser/login')
        .type('form')
        .send({ adviserEmail: email, password, csrf_token: csrfToken });
    return agent;
}

module.exports = { TEST_PASSWORD, createTestAdviser, deleteTestAdviser, loginAs, csrfTokenFrom };



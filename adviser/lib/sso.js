let clientPromise = null;

function openidClient() {
    if (!clientPromise) {
        clientPromise = import('openid-client');
    }
    return clientPromise;
}

let configPromise = null;

function ssoEnabled() {
    return Boolean(process.env.OIDC_DISCOVERY_URL);
}

// reads the login server's settings the first time someone uses SSO
function ssoConfig() {
    if (!configPromise) {
        configPromise = loadConfig().catch(error => {
            configPromise = null;
            throw error;
        });
    }
    return configPromise;
}

async function loadConfig() {
    const client = await openidClient();
    const response = await fetch(process.env.OIDC_DISCOVERY_URL);
    if (!response.ok) {
        throw new Error(`SSO discovery failed with status ${response.status}`);
    }
    const config = new client.Configuration(await response.json(), process.env.OIDC_CLIENT_ID, process.env.OIDC_CLIENT_SECRET);
    if (process.env.OIDC_ALLOW_HTTP === 'true') {
        client.allowInsecureRequests(config);
    }
    return config;
}

async function startLogin() {
    const client = await openidClient();
    const config = await ssoConfig();
    const codeVerifier = client.randomPKCECodeVerifier();
    const state = client.randomState();
    const nonce = client.randomNonce();
    const url = client.buildAuthorizationUrl(config, {
        redirect_uri: process.env.OIDC_REDIRECT_URI,
        scope: 'openid email profile',
        code_challenge: await client.calculatePKCECodeChallenge(codeVerifier),
        code_challenge_method: 'S256',
        state,
        nonce,
    });
    return { url: url.href, pending: { codeVerifier, state, nonce } };
}

// checks the answer from the login server and returns the verified email, or null
async function finishLogin(callbackPath, pending) {
    const client = await openidClient();
    const config = await ssoConfig();
    const tokens = await client.authorizationCodeGrant(config, new URL(callbackPath, process.env.OIDC_REDIRECT_URI), {
        pkceCodeVerifier: pending.codeVerifier,
        expectedState: pending.state,
        expectedNonce: pending.nonce,
    });
    const claims = tokens.claims();
    return claims.email_verified ? claims.email : null;
}

module.exports = { ssoEnabled, startLogin, finishLogin };

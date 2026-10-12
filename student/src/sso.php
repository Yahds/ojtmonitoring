<?php
use Jumbojett\OpenIDConnectClient;

function ssoEnabled(): bool
{
    return (string) getenv('OIDC_PROVIDER_URL') !== '';
}

function ssoClient(): OpenIDConnectClient
{
    $client = new OpenIDConnectClient(
        requiredEnv('OIDC_PROVIDER_URL'),
        requiredEnv('OIDC_CLIENT_ID'),
        requiredEnv('OIDC_CLIENT_SECRET')
    );
    $client->setRedirectURL(requiredEnv('OIDC_REDIRECT_URI'));
    $client->setCodeChallengeMethod('S256');
    $client->addScope(['email']);
    return $client;
}

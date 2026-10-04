<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\CreatesBrain;
use Tests\TestCase;

class OAuthFlowTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    public function test_pkce_consent_token_refresh_and_revocation(): void
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        openssl_pkey_export($key, $private);
        config(['passport.private_key' => $private, 'passport.public_key' => openssl_pkey_get_details($key)['key']]);
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        $redirect = 'https://chatgpt.com/connector_platform/oauth/callback';
        $client = $this->postJson('/oauth/register', ['client_name' => 'ChatGPT', 'redirect_uris' => [$redirect]])->assertCreated()->json('client_id');
        $verifier = str_repeat('k', 64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $params = ['client_id' => $client, 'redirect_uri' => $redirect, 'response_type' => 'code', 'scope' => 'mcp:use', 'state' => 'test-state', 'code_challenge' => $challenge, 'code_challenge_method' => 'S256', 'resource' => config('app.url').'/mcp'];
        $consent = $this->signedIn($user)->get('/oauth/authorize?'.http_build_query($params))->assertOk()->assertSee('Allow connection');
        $approved = $this->post('/oauth/authorize', ['client_id' => $client, 'state' => 'test-state', 'auth_token' => $consent->viewData('authToken')])->assertRedirect();
        parse_str(parse_url($approved->headers->get('Location'), PHP_URL_QUERY), $callback);
        $this->assertSame('test-state', $callback['state']);
        $token = $this->postJson('/oauth/token', ['grant_type' => 'authorization_code', 'client_id' => $client, 'redirect_uri' => $redirect, 'code_verifier' => $verifier, 'code' => $callback['code'], 'resource' => config('app.url').'/mcp'])->assertOk()->json();
        $this->postJson('/oauth/token', ['grant_type' => 'authorization_code', 'client_id' => $client, 'redirect_uri' => $redirect, 'code_verifier' => $verifier, 'code' => $callback['code']])->assertStatus(400);
        Auth::forgetGuards();
        $this->withToken($token['access_token'])->postJson('/mcp', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list'])->assertOk()->assertSee('list-vehicles');
        $refreshed = $this->postJson('/oauth/token', ['grant_type' => 'refresh_token', 'client_id' => $client, 'refresh_token' => $token['refresh_token']])->assertOk()->json();
        $user->update(['password' => 'A-new-password-for-revocation']);
        Auth::forgetGuards();
        $this->withToken($refreshed['access_token'])->postJson('/mcp', ['jsonrpc' => '2.0', 'id' => 2, 'method' => 'tools/list'])->assertUnauthorized();
    }
}

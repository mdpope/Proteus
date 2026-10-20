<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Passport\Client;
use Laravel\Passport\ClientRepository;
use Laravel\Passport\Token;
use Tests\CreatesBrain;
use Tests\TestCase;

class NativeClientTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        openssl_pkey_export($key, $private);
        config(['app.key' => 'base64:'.base64_encode(str_repeat('s', 32)), 'passport.private_key' => $private, 'passport.public_key' => openssl_pkey_get_details($key)['key']]);
    }

    public function test_discovery_requires_public_fixed_callback_client_and_never_returns_secrets(): void
    {
        config(['app.url' => 'https://localhost', 'native.client_id' => null]);
        $this->getJson('/api/v1/native-config')->assertOk()->assertJsonPath('enabled', false);
        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic native', ['proteus://life-oauth/callback'], false);
        config(['native.client_id' => $client->id]);
        $result = $this->getJson('/api/v1/native-config')->assertOk()->assertJsonPath('enabled', true)->assertJsonPath('redirectUri', 'proteus://life-oauth/callback')->assertJsonPath('scopes', ['brain:read', 'brain:write']);
        $this->assertArrayNotHasKey('secret', $result->json());
        $client->forceFill(['redirect_uris' => ['proteus://pair']])->save();
        $this->getJson('/api/v1/native-config')->assertOk()->assertJsonPath('enabled', false);
    }

    public function test_native_authorization_keeps_strong_auth_pkce_and_exact_redirect(): void
    {
        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic native', ['proteus://life-oauth/callback'], false);
        $user = $this->owner();
        $params = ['client_id' => $client->id, 'redirect_uri' => 'proteus://life-oauth/callback', 'response_type' => 'code', 'scope' => 'brain:read brain:write', 'state' => 'synthetic-state', 'code_challenge' => str_repeat('a', 43), 'code_challenge_method' => 'S256'];
        $this->actingAs($user)->get('/oauth/authorize?'.http_build_query($params))->assertRedirect('/security');
        $this->signedIn($user)->get('/oauth/authorize?'.http_build_query($params))->assertOk();
        $this->get('/oauth/authorize?'.http_build_query([...$params, 'code_challenge_method' => 'plain']))->assertStatus(400);
        $this->get('/oauth/authorize?'.http_build_query([...$params, 'redirect_uri' => 'proteus://life-oauth/wrong']))->assertStatus(401);
    }

    public function test_registration_has_no_secret_and_is_idempotent_when_configured(): void
    {
        config(['native.client_id' => null]);
        $this->artisan('proteus:native-client')->assertSuccessful();
        $client = Client::where('name', 'Proteus iPhone and iPad')->firstOrFail();
        $this->assertFalse($client->confidential());
        $this->assertSame(['proteus://life-oauth/callback'], $client->redirect_uris);
        config(['native.client_id' => $client->id]);
        $this->artisan('proteus:native-client')->assertSuccessful();
        $this->assertSame(1, Client::where('name', 'Proteus iPhone and iPad')->count());
    }

    public function test_native_logout_revokes_its_access_and_refresh_token(): void
    {
        $client = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic native logout', ['proteus://life-oauth/callback'], false);
        config(['native.client_id' => $client->id]);
        $user = $this->owner();
        $verifier = str_repeat('k', 64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $params = ['client_id' => $client->id, 'redirect_uri' => 'proteus://life-oauth/callback', 'response_type' => 'code', 'scope' => 'brain:read brain:write', 'state' => 'native-state', 'code_challenge' => $challenge, 'code_challenge_method' => 'S256'];
        $consent = $this->signedIn($user)->get('/oauth/authorize?'.http_build_query($params))->assertOk();
        $approved = $this->post('/oauth/authorize', ['client_id' => $client->id, 'state' => 'native-state', 'auth_token' => $consent->viewData('authToken')])->assertRedirect();
        parse_str(parse_url($approved->headers->get('Location'), PHP_URL_QUERY), $callback);
        $token = $this->postJson('/oauth/token', ['grant_type' => 'authorization_code', 'client_id' => $client->id, 'redirect_uri' => 'proteus://life-oauth/callback', 'code_verifier' => $verifier, 'code' => $callback['code']])->assertOk()->json();
        Auth::forgetGuards();
        $this->withToken($token['access_token'])->deleteJson('/api/v1/native-session')->assertOk()->assertJsonPath('ok', true);
        $this->assertSame(0, Token::where('client_id', $client->id)->where('revoked', false)->count());
        $this->postJson('/oauth/token', ['grant_type' => 'refresh_token', 'client_id' => $client->id, 'refresh_token' => $token['refresh_token']])->assertStatus(400);
    }

    public function test_desktop_discovery_requires_its_own_client_and_preserves_mobile_discovery(): void
    {
        config(['app.url' => 'https://localhost', 'native.desktop_client_id' => null]);
        $mobile = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic mobile', ['proteus://life-oauth/callback'], false);
        config(['native.client_id' => $mobile->id]);
        $this->getJson('/api/v1/native-config?client=desktop')->assertOk()->assertJsonPath('enabled', false);

        $desktop = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic desktop', ['proteus-desktop://life-oauth/callback'], false);
        config(['native.desktop_client_id' => $desktop->id]);
        $this->getJson('/api/v1/native-config?client=desktop')->assertOk()->assertJsonPath('clientId', (string) $desktop->id)->assertJsonPath('redirectUri', 'proteus-desktop://life-oauth/callback');
        $this->getJson('/api/v1/native-config')->assertOk()->assertJsonPath('clientId', (string) $mobile->id)->assertJsonPath('redirectUri', 'proteus://life-oauth/callback');

        $desktop->forceFill(['redirect_uris' => ['proteus://life-oauth/callback']])->save();
        $this->getJson('/api/v1/native-config?client=desktop')->assertOk()->assertJsonPath('enabled', false);
    }

    public function test_desktop_registration_preserves_mobile_and_reuses_its_configured_public_client(): void
    {
        $mobile = app(ClientRepository::class)->createAuthorizationCodeGrantClient('Synthetic mobile', ['proteus://life-oauth/callback'], false);
        config(['native.client_id' => $mobile->id, 'native.desktop_client_id' => null]);

        $this->artisan('proteus:native-client', ['--desktop' => true])->assertSuccessful();
        $desktop = Client::where('name', 'Proteus Desktop')->firstOrFail();
        config(['native.desktop_client_id' => $desktop->id]);
        $this->artisan('proteus:native-client', ['--desktop' => true])->assertSuccessful();

        $this->assertFalse($desktop->confidential());
        $this->assertSame(['proteus-desktop://life-oauth/callback'], $desktop->redirect_uris);
        $this->assertSame(1, Client::where('name', 'Proteus Desktop')->count());
        $this->assertSame(['proteus://life-oauth/callback'], $mobile->fresh()->redirect_uris);
        $this->assertFalse($mobile->fresh()->revoked);
    }
}

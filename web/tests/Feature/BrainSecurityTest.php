<?php

namespace Tests\Feature;

use App\Models\Membership;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class BrainSecurityTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    public function test_private_pages_require_sign_in(): void
    {
        $this->get('/garage')->assertRedirect('/login');
        $this->getJson('/api/v1/vehicles')->assertUnauthorized();
    }

    public function test_password_only_session_cannot_read_records_or_recovery_codes(): void
    {
        $user = $this->owner();
        $this->actingAs($user)->get('/garage')->assertRedirect('/security');
        $this->get('/security')->assertSee('Finish signing in')->assertDontSee('recovery-code');
        $this->getJson('/user/two-factor-recovery-codes')->assertForbidden();
        $this->postJson('/user/passkeys', [])->assertForbidden();
    }

    public function test_signed_in_owner_can_view_private_pages(): void
    {
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        $this->signedIn($user);
        foreach (['/garage', '/garage/'.$vehicle->id, '/captures', '/captures/new', '/nutrition', '/security', '/fuel', '/connections'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_cross_tenant_vehicle_is_not_found(): void
    {
        $a = $this->owner();
        $b = $this->owner();
        $vehicle = $this->vehicleFor($b);
        $this->signedIn($a)->get('/garage/'.$vehicle->id)->assertNotFound();
        Passport::actingAs($a, ['brain:read']);
        $this->getJson('/api/v1/vehicles/'.$vehicle->id)->assertNotFound();
    }

    public function test_api_checks_scope_and_membership(): void
    {
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        Passport::actingAs($user, []);
        $this->getJson('/api/v1/vehicles')->assertForbidden();
        Passport::actingAs($user, ['brain:read']);
        $this->getJson('/api/v1/vehicles')->assertJsonPath('data.0.id', $vehicle->id);
        Membership::where('user_id', $user->id)->delete();
        $this->getJson('/api/v1/vehicles')->assertForbidden();
    }

    public function test_signup_is_closed_and_dynamic_oauth_redirects_are_limited(): void
    {
        $this->post('/register', [])->assertNotFound();
        $this->postJson('/oauth/register', ['client_name' => 'Bad app', 'redirect_uris' => ['https://chatgpt.com.evil.test/callback']])->assertStatus(400);
        $this->postJson('/oauth/register', ['client_name' => 'ChatGPT', 'redirect_uris' => ['https://chatgpt.com/connector_platform/oauth/callback']])->assertCreated()->assertJsonPath('token_endpoint_auth_method', 'none');
    }

    public function test_mcp_challenges_clients_even_without_accept_header(): void
    {
        $this->call('POST', '/mcp', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list']))->assertUnauthorized()->assertHeader('WWW-Authenticate');
        $this->getJson('/.well-known/oauth-authorization-server')->assertJsonPath('token_endpoint_auth_methods_supported.0', 'none');
    }

    public function test_mcp_requires_a_token_and_has_oauth_discovery(): void
    {
        $this->postJson('/mcp', ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/list'])->assertUnauthorized();
        $this->getJson('/.well-known/oauth-protected-resource/mcp')->assertJsonPath('resource', config('app.url').'/mcp');
    }

    public function test_oauth_consent_requires_strong_auth_and_pkce(): void
    {
        $user = $this->owner();
        $this->actingAs($user)->get('/oauth/authorize?code_challenge_method=S256&code_challenge='.str_repeat('a', 43))->assertRedirect('/security');
        $this->signedIn($user)->get('/oauth/authorize?code_challenge_method=plain&code_challenge=hello')->assertBadRequest();
    }
}

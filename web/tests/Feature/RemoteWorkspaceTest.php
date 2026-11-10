<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\CreatesBrain;
use Tests\TestCase;

class RemoteWorkspaceTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    public function test_home_is_the_entry_point_and_is_loaded_only_when_visited(): void
    {
        $this->get('/')->assertRedirect('/home');
        $this->get('/home')->assertRedirect('/login');
        $user = $this->owner();
        $this->actingAs($user)->get('/home')->assertRedirect('/security');
        $this->signedIn($user)->get('/home')->assertOk()
            ->assertSee('id="proteus-home"', false)
            ->assertSee('id="proteus-home-data"', false)
            ->assertSee('data-shell-section="home"', false);
    }

    public function test_remote_pages_require_login_and_strong_authentication(): void
    {
        $this->get('/remote')->assertRedirect('/login');
        $this->getJson('/remote/session')->assertUnauthorized();
        $user = $this->owner();
        $this->actingAs($user)->get('/remote')->assertRedirect('/security');
        $this->actingAs($user)->get('/remote/session')->assertRedirect('/security');
    }

    public function test_remote_shell_is_authenticated_private_and_has_no_server_command_api(): void
    {
        $user = $this->owner();
        $this->signedIn($user)->get('/remote')->assertOk()
            ->assertSee('The computer supplies its name.')->assertDontSee('Build Mac')->assertDontSee('Work Mac')
            ->assertSee('relay carries encrypted packets')->assertSee('website server stores destination keys encrypted')->assertHeader('Cache-Control', 'no-store, private')
            ->assertHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' wss://relay.proteus.example; img-src 'self' data: blob:; frame-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
        $this->postJson('/remote/command', ['prompt' => 'Must not be handled by Laravel'])->assertNotFound();
    }

    public function test_browser_storage_namespace_is_separate_for_each_site_account(): void
    {
        $first = $this->owner();
        $second = $this->owner();
        $a = $this->signedIn($first)->getJson('/remote/session')->assertOk()->json('account');
        $b = $this->signedIn($second)->getJson('/remote/session')->assertOk()->json('account');
        $this->assertMatchesRegularExpression('/^[a-f0-9]{64}$/', $a);
        $this->assertNotSame($a, $b);
        $this->assertSame(['account'], array_keys($this->getJson('/remote/session')->json()));
    }

    public function test_invalid_or_credential_bearing_relay_configuration_fails_closed(): void
    {
        $this->signedIn($this->owner());
        foreach (['wss://user@relay.example.test', 'wss://user:secret@relay.example.test', 'http://relay.example.test', 'wss://relay.example.test/socket'] as $url) {
            config(['remote.relay_url' => $url]);
            $this->get('/remote')->assertServiceUnavailable();
        }
    }
}

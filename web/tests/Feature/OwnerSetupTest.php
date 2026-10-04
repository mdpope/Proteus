<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\TestCase;

class OwnerSetupTest extends TestCase
{
    use LazilyRefreshDatabase;

    public function test_invitation_is_single_use_and_requires_mfa_before_records(): void
    {
        $token = str_repeat('x', 64);
        $workspace = Workspace::factory()->create();
        $user = User::factory()->create(['current_workspace_id' => $workspace->id, 'setup_token_hash' => hash('sha256', $token), 'setup_expires_at' => now()->addHour()]);
        Membership::create(['workspace_id' => $workspace->id, 'user_id' => $user->id, 'role' => 'owner']);
        $input = ['email' => $user->email, 'token' => $token, 'password' => 'Long-test-owner-password', 'password_confirmation' => 'Long-test-owner-password'];
        $this->post('/setup', $input)->assertRedirect('/security');
        $this->get('/garage')->assertRedirect('/security');
        $this->post('/setup', $input)->assertForbidden();
        $this->assertNull($user->fresh()->setup_token_hash);
    }
}

<?php

namespace Tests;

use App\Models\Membership;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\Workspace;

trait CreatesBrain
{
    protected function owner(string $role = 'owner'): User
    {
        $workspace = Workspace::factory()->create();
        $user = User::factory()->create(['current_workspace_id' => $workspace->id, 'two_factor_confirmed_at' => now(), 'two_factor_secret' => encrypt('JBSWY3DPEHPK3PXP'), 'two_factor_recovery_codes' => encrypt(json_encode(['recovery-code']))]);
        Membership::create(['workspace_id' => $workspace->id, 'user_id' => $user->id, 'role' => $role]);

        return $user;
    }

    protected function vehicleFor(User $user): Vehicle
    {
        return Vehicle::factory()->create(['workspace_id' => $user->current_workspace_id]);
    }

    protected function signedIn(User $user): static
    {
        return $this->actingAs($user, 'web')->withSession(['auth.two_factor_user' => $user->id, 'auth.password_confirmed_at' => time()]);
    }
}

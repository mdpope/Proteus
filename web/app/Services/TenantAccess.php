<?php

namespace App\Services;

use App\Models\Capture;
use App\Models\Membership;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Database\Eloquent\Builder;

class TenantAccess
{
    public function workspace(User $user, string $ability = 'garage.read'): int
    {
        $membership = Membership::where('user_id', $user->id)->where('workspace_id', $user->current_workspace_id)->first();
        abort_unless($membership, 403, 'No active account membership.');
        $defaults = match ($membership->role) {
            'owner' => ['garage.read', 'garage.add', 'garage.edit', 'nutrition.read', 'nutrition.add', 'nutrition.edit'],
            'editor' => ['garage.read', 'garage.add', 'garage.edit', 'nutrition.read', 'nutrition.add', 'nutrition.edit'],
            'contributor' => ['garage.read', 'garage.add', 'nutrition.read', 'nutrition.add'],
            default => ['garage.read', 'nutrition.read'],
        };
        abort_unless(in_array($ability, $membership->permissions ?? $defaults, true), 403, 'Your role does not allow this action.');

        return $membership->workspace_id;
    }

    public function vehicle(User $user, int $id, string $ability = 'garage.read'): Vehicle
    {
        return Vehicle::where('workspace_id', $this->workspace($user, $ability))->findOrFail($id);
    }

    public function captures(User $user, string $ability = 'garage.read'): Builder
    {
        return Capture::where('workspace_id', $this->workspace($user, $ability));
    }
}

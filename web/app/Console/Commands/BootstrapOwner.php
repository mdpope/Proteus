<?php

namespace App\Console\Commands;

use App\Models\Membership;
use App\Models\User;
use App\Models\Workspace;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class BootstrapOwner extends Command
{
    protected $signature = 'brain:bootstrap {email} {--name=Operator}';

    protected $description = 'Create the initial owner and a private, expiring setup invitation.';

    public function handle(): int
    {
        $email = strtolower($this->argument('email'));
        Validator::make(['email' => $email], ['email' => 'required|email|max:254'])->validate();
        if (User::exists()) {
            $this->error('An owner already exists. No changes made.');

            return self::FAILURE;
        }
        $token = Str::random(64);
        DB::transaction(function () use ($email, $token) {
            $workspace = Workspace::create(['name' => 'My Proteus', 'slug' => 'personal']);
            $user = User::create(['name' => $this->option('name'), 'email' => $email, 'password' => Str::random(64)]);
            $user->forceFill(['current_workspace_id' => $workspace->id, 'setup_token_hash' => hash('sha256', $token), 'setup_expires_at' => now()->addHours(24)])->save();
            Membership::create(['workspace_id' => $workspace->id, 'user_id' => $user->id, 'role' => 'owner']);
        });
        $path = storage_path('app/private/owner-setup.txt');
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }
        file_put_contents($path, url('/setup').'#'.$token.PHP_EOL);
        chmod($path, 0600);
        $this->info('Owner created. The one-time setup link expires in 24 hours and is saved in storage/app/private/owner-setup.txt.');

        return self::SUCCESS;
    }
}

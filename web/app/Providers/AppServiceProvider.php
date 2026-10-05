<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Support\ServiceProvider;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        Passport::authorizationView('auth.authorize');
        Passport::tokensExpireIn(now()->addHour());
        Passport::refreshTokensExpireIn(now()->addDays(30));
        Passport::personalAccessTokensExpireIn(now()->addDays(30));
        Passport::tokensCan(['app:read' => 'Read shared Team Tools, browsing history, preferences and notification history.', 'app:write' => 'Manage shared Team Tools, browsing history, preferences and notification subscriptions.', 'mcp:use' => 'Read your vehicle and private nutrition records, add records and original receipts, and submit uncertain items for your review.', 'brain:read' => 'Read your Proteus records.', 'brain:write' => 'Add and review Proteus records.']);
        User::updated(function (User $user): void {
            if ($user->wasChanged(['password', 'email']) || ($user->wasChanged('two_factor_secret') && ! $user->two_factor_secret)) {
                $ids = Token::where('user_id', $user->id)->pluck('id');
                Token::whereIn('id', $ids)->update(['revoked' => true]);
                RefreshToken::whereIn('access_token_id', $ids)->update(['revoked' => true]);
            }
        });
    }
}

<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Actions\Fortify\UpdateUserPassword;
use App\Actions\Fortify\UpdateUserProfileInformation;
use Illuminate\Auth\Events\Login;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Laravel\Fortify\Actions\RedirectIfTwoFactorAuthenticatable;
use Laravel\Fortify\Events\ValidTwoFactorAuthenticationCodeProvided;
use Laravel\Fortify\Fortify;
use Laravel\Passkeys\Events\PasskeyVerified;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Fortify::loginView(fn () => view('auth.login'));
        Fortify::twoFactorChallengeView(fn () => view('auth.challenge'));
        Fortify::confirmPasswordView(fn () => view('auth.confirm'));
        Fortify::requestPasswordResetLinkView(fn () => view('auth.forgot'));
        Fortify::resetPasswordView(fn ($request) => view('auth.reset', ['request' => $request]));
        Event::listen(function (PasskeyVerified $event): void {
            if (request()->routeIs('passkey.login')) {
                request()->attributes->set('verified_passkey', $event->passkey);
            }
            if (request()->routeIs('passkey.confirm') && request()->user()?->id === $event->user->id) {
                request()->session()->put('auth.passkey_id', $event->passkey->id);
            }
        });
        Event::listen(function (ValidTwoFactorAuthenticationCodeProvided $event): void {
            request()->attributes->set('verified_totp_user', $event->user->id);
        });
        Event::listen(function (Login $event): void {
            request()->session()->forget(['auth.passkey_id', 'auth.two_factor_user']);
            $passkey = request()->attributes->get('verified_passkey');
            if ($passkey && $passkey->user_id === $event->user->id) {
                request()->session()->put('auth.passkey_id', $passkey->id);
                request()->session()->passwordConfirmed();
            }
            if (request()->attributes->get('verified_totp_user') === $event->user->id) {
                request()->session()->put('auth.two_factor_user', $event->user->id);
            }
        });
        Fortify::createUsersUsing(CreateNewUser::class);
        Fortify::updateUserProfileInformationUsing(UpdateUserProfileInformation::class);
        Fortify::updateUserPasswordsUsing(UpdateUserPassword::class);
        Fortify::resetUserPasswordsUsing(ResetUserPassword::class);
        Fortify::redirectUserForTwoFactorAuthenticationUsing(RedirectIfTwoFactorAuthenticatable::class);

        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });

        RateLimiter::for('two-factor', function (Request $request) {
            return Limit::perMinute(5)->by($request->session()->get('login.id'));
        });

        RateLimiter::for('passkeys', function (Request $request) {
            $credentialId = $request->input('credential.id');

            return Limit::perMinute(10)->by(
                ($credentialId ?: $request->session()->getId()).'|'.$request->ip()
            );
        });
    }
}

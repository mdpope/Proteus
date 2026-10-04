<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProtectSecurityOperations
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('oauth/authorize', 'oauth/device*')) {
            return app(RequireStrongAuthentication::class)->handle($request, $next);
        }
        $user = $request->user();
        if ($user && $request->is('user/passkeys*', 'user/two-factor-*', 'user/confirmed-two-factor-*', 'user/password', 'user/profile-information') && ($user->two_factor_confirmed_at || $user->passkeys()->exists()) && ! RequireStrongAuthentication::verified($request)) {
            if ($request->expectsJson()) {
                abort(403, 'Verify an existing passkey or authenticator before changing security settings.');
            }

            return redirect()->route('security');
        }
        if ($user && $request->isMethod('DELETE') && $request->is('user/passkeys/*') && ! $user->two_factor_confirmed_at && $user->passkeys()->count() <= 1) {
            abort(422, 'Add another passkey or authenticator before removing your last sign-in method.');
        }
        if ($user && $request->isMethod('DELETE') && $request->is('user/two-factor-authentication') && ! $user->passkeys()->exists()) {
            abort(422, 'Add a passkey before disabling your authenticator.');
        }

        return $next($request);
    }
}

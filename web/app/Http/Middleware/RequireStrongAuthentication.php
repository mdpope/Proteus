<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireStrongAuthentication
{
    public static function verified(Request $request): bool
    {
        $user = $request->user();
        if (! $user) {
            return false;
        }
        $passkey = $request->session()->get('auth.passkey_id');

        return ($passkey && $user->passkeys()->whereKey($passkey)->exists()) || ($request->session()->get('auth.two_factor_user') === $user->id && $user->two_factor_confirmed_at !== null);
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()) {
            return redirect()->guest(route('login'));
        }
        if (! self::verified($request)) {
            return redirect()->route('security')->with('status', 'Use a passkey or finish authenticator verification to open Proteus.');
        }

        return $next($request);
    }
}

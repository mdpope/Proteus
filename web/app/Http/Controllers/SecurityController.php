<?php

namespace App\Http\Controllers;

use App\Http\Middleware\RequireStrongAuthentication;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Laravel\Fortify\Actions\ConfirmTwoFactorAuthentication;
use Laravel\Passport\RefreshToken;
use Laravel\Passport\Token;

class SecurityController extends Controller
{
    public function index(Request $request): View
    {
        $user = $request->user();
        if (($user->two_factor_confirmed_at || $user->passkeys()->exists()) && ! RequireStrongAuthentication::verified($request)) {
            return view('auth.security-gate', ['user' => $user]);
        }

        return view('security', ['showRecovery' => RequireStrongAuthentication::verified($request) && time() - (int) $request->session()->get('auth.password_confirmed_at', 0) < 600, 'user' => $user, 'passkeys' => $user->passkeys()->get(), 'tokens' => Token::where('user_id', $user->id)->where('revoked', false)->with('client')->get()]);
    }

    public function verify(Request $request, ConfirmTwoFactorAuthentication $confirm): RedirectResponse
    {
        $v = $request->validate(['code' => 'required|string']);
        $confirm($request->user(), $v['code']);
        $request->session()->put('auth.two_factor_user', $request->user()->id);

        return redirect()->route('security')->with('status', 'Authenticator verified. Save your recovery codes somewhere safe.');
    }

    public function revoke(Request $request, string $token): RedirectResponse
    {
        $token = Token::where('user_id', $request->user()->id)->findOrFail($token);
        $token->update(['revoked' => true]);
        RefreshToken::where('access_token_id', $token->id)->update(['revoked' => true]);

        return back()->with('status', 'Connection revoked.');
    }
}

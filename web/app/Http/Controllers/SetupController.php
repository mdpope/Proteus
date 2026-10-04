<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;

class SetupController extends Controller
{
    public function show(): View
    {
        return view('auth.setup');
    }

    public function store(Request $request): RedirectResponse
    {
        $v = $request->validate(['token' => 'required|string|size:64', 'password' => ['required', 'confirmed', Password::min(14)], 'email' => 'required|email']);
        $user = DB::transaction(function () use ($v) {
            $user = User::where('setup_token_hash', hash('sha256', $v['token']))->where('email', strtolower($v['email']))->where('setup_expires_at', '>', now())->lockForUpdate()->first();
            abort_unless($user, 403, 'The invitation is invalid or expired.');
            $user->forceFill(['password' => $v['password'], 'setup_token_hash' => null, 'setup_expires_at' => null, 'email_verified_at' => now()])->save();

            return $user;
        });
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->passwordConfirmed();

        return redirect()->route('security')->with('status', 'Account activated. Add a passkey or authenticator to finish setup.');
    }
}

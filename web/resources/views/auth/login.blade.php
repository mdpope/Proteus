
@extends('layouts.auth')
@section('content')<div class="eyebrow">Welcome back</div><h1>A home for what matters.</h1><p class="muted">Sign in to your vehicles, receipts, and daily records.</p><button type="button" data-passkey="login">Sign in with a passkey</button><div class="divider"></div><form method="post" action="{{ route('login') }}">
@csrf<label>Email<input name="email" type="email" autocomplete="username webauthn" value="{{ old('email') }}" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button>Continue with password</button></form><p><a href="{{ route('password.request') }}">Forgot password?</a></p><small>Password sign-in also requires your authenticator or a passkey.</small>
@endsection

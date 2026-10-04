
@extends('layouts.auth')
@section('content')<h1>Finish signing in</h1><p class="muted">Verify a passkey or authenticator to open your records and security settings.</p><button data-passkey="confirm" type="button">Verify with a passkey</button>
@if($user->two_factor_confirmed_at)<form method="post" action="{{ route('security.verify') }}">
@csrf<label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" required></label><button class="secondary">Verify authenticator</button></form>
@endif<form method="post" action="{{ route('logout') }}">
@csrf<button class="secondary">Sign out</button></form>
@endsection

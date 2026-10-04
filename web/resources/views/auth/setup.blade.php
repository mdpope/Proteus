
@extends('layouts.auth')
@section('content')<div class="eyebrow">Make yourself at home</div><h1>Set up Proteus</h1><p class="muted">Choose a password, then add a passkey or authenticator.</p><form method="post" action="{{ route('setup.store') }}">
@csrf<label>Invitation code<input id="setup-token" name="token" required autocomplete="off" value="{{ old('token') }}"></label><label>Your email<input name="email" type="email" required autocomplete="email" value="{{ old('email') }}"></label><label>Password · at least 14 characters<input name="password" type="password" autocomplete="new-password" required minlength="14"></label><label>Confirm password<input name="password_confirmation" type="password" autocomplete="new-password" required></label><button>Activate account</button></form>
@endsection


@extends('layouts.auth')
@section('content')<h1>Confirm your identity</h1><p>Confirm your password before changing security settings.</p><form method="post" action="{{ route('password.confirm') }}">
@csrf<label>Password<input name="password" type="password" autocomplete="current-password" required autofocus></label><button>Confirm password</button></form><button class="secondary" data-passkey="confirm" type="button">Confirm with a passkey</button>
@endsection

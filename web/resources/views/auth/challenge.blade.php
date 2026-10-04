
@extends('layouts.auth')
@section('content')<h1>Verify it’s you</h1><form method="post" action="{{ route('two-factor.login') }}">
@csrf<label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" autofocus></label><details><summary>Use a recovery code</summary><label>Recovery code<input name="recovery_code" autocomplete="off"></label></details><button>Verify and sign in</button></form>
@endsection

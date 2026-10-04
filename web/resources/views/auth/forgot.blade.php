
@extends('layouts.auth')
@section('content')<h1>Reset your password</h1><form method="post" action="{{ route('password.email') }}">
@csrf<label>Email<input name="email" type="email" required autocomplete="email"></label><button>Send reset link</button></form>
@endsection

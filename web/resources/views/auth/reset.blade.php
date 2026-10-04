
@extends('layouts.auth')
@section('content')<h1>Choose a new password</h1><form method="post" action="{{ route('password.update') }}">
@csrf<input type="hidden" name="token" value="{{ $request->route('token') }}"><label>Email<input name="email" type="email" value="{{ old('email',$request->email) }}" required></label><label>Password<input name="password" type="password" autocomplete="new-password" required minlength="14"></label><label>Confirm password<input name="password_confirmation" type="password" autocomplete="new-password" required></label><button>Save password</button></form>
@endsection

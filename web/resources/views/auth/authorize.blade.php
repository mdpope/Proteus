
@extends('layouts.auth')
@section('content')<div class="eyebrow">Connect an application</div><h1>{{ $client->name }}</h1><p>wants access to Proteus as <strong>{{ $user->email }}</strong>.</p>
@foreach($scopes as $scope)<p class="notice">{{ $scope->description }}</p>
@endforeach<p class="muted">Only records allowed by your account membership are available. Nutrition remains specific to your user. You can revoke this connection in Account & security.</p><form method="post" action="{{ route('passport.authorizations.approve') }}">
@csrf<input type="hidden" name="state" value="{{ $request->state }}"><input type="hidden" name="client_id" value="{{ $client->id }}"><input type="hidden" name="auth_token" value="{{ $authToken }}"><button>Allow connection</button></form><form method="post" action="{{ route('passport.authorizations.deny') }}">
@csrf 
@method('DELETE')<input type="hidden" name="state" value="{{ $request->state }}"><input type="hidden" name="client_id" value="{{ $client->id }}"><input type="hidden" name="auth_token" value="{{ $authToken }}"><button class="secondary">Cancel</button></form>
@endsection

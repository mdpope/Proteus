
@extends('layouts.app')
@section('title','Account & security')
@section('content')<header class="top"><div><div class="eyebrow">Your account</div><h1>Account & security</h1><p>{{ $user->name }} · {{ $user->email }}</p></div><a class="button secondary" href="{{ route('garage') }}">Open Proteus →</a></header><div class="grid"><section class="card"><h2>Passkeys</h2><p class="muted">Sign in with Face ID, Touch ID, or a security key. Keep a second passkey or an authenticator as a recovery option.</p>
@foreach($passkeys as $key)<div class="file"><strong>{{ $key->name }}</strong><form action="{{ url('/user/passkeys/'.$key->id) }}" method="post">
@csrf 
@method('DELETE')<button class="secondary">Remove passkey</button></form></div>
@endforeach<label class="section">Device name<input id="passkey-name" value="My device"></label><div class="actions"><button type="button" data-passkey="register">Add a passkey</button>
@if($passkeys->count())<button type="button" data-passkey="confirm" class="secondary">Verify & open Proteus</button>
@endif</div><p><a class="shortcut" href="{{ route('password.confirm') }}">Confirm password before changing security settings →</a></p></section><section class="card"><h2>Authenticator & recovery</h2>
@if(!$user->two_factor_secret)<p class="muted">Pair an authenticator app for time-based verification codes.</p><form method="post" action="{{ url('/user/two-factor-authentication') }}">
@csrf<button>Set up authenticator</button></form>
@else 
@if(!$user->two_factor_confirmed_at)<p>Scan this code in your authenticator, then enter its six-digit code.</p><div class="qr">{!! $user->twoFactorQrCodeSvg() !!}</div>
@else<p class="pill">Authenticator enabled</p>
@endif<form method="post" action="{{ route('security.verify') }}" class="stack">
@csrf<label>Authenticator code<input name="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6}"></label><button>Verify authenticator</button></form>
@if($user->two_factor_confirmed_at && $showRecovery)<details><summary>Recovery codes</summary><p class="muted">Store these securely. Each code can be used once.</p><div class="codes">{{ implode("\n",$user->recoveryCodes()) }}</div></details>
@endif 
@endif</section></div><section class="card section"><h2>Connected applications</h2><p class="muted">Revoke a connection to stop its access and refresh tokens.</p>
@forelse($tokens as $token)<div class="row file"><div><strong>{{ $token->client?->name ?? 'API connection' }}</strong><p><small>Expires {{ $token->expires_at?->format('M j, Y H:i') }} · {{ implode(', ',$token->scopes??[]) }}</small></p></div><form method="post" action="{{ route('security.revoke',$token->id) }}">
@csrf 
@method('DELETE')<button class="secondary">Revoke</button></form></div>
@empty<p class="notice">No connected applications yet.</p>
@endforelse</section><form method="post" action="{{ route('logout') }}" class="section">
@csrf<button class="secondary">Sign out</button></form>
@endsection

<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;

class NativeClientController extends Controller
{
    public function discovery(Request $request): JsonResponse
    {
        $origin = rtrim(config('app.url'), '/');
        $desktop = $request->query('client') === 'desktop';
        $id = config($desktop ? 'native.desktop_client_id' : 'native.client_id');
        $redirect = config($desktop ? 'native.desktop_redirect_uri' : 'native.redirect_uri');
        $client = $id ? Passport::client()->newQuery()->whereKey($id)->where('revoked', false)->first() : null;
        $enabled = parse_url($origin, PHP_URL_SCHEME) === 'https'
            && $client && ! $client->confidential()
            && $client->redirect_uris === [$redirect]
            && $client->hasGrantType('authorization_code') && $client->hasGrantType('refresh_token');

        return response()->json($enabled ? [
            'enabled' => true, 'protocol' => 1, 'issuer' => $origin,
            'clientId' => (string) $client->id,
            'authorizationEndpoint' => $origin.'/oauth/authorize', 'tokenEndpoint' => $origin.'/oauth/token',
            'redirectUri' => $redirect, 'scopes' => ['brain:read', 'brain:write'],
            'apiBase' => $origin.'/api/v1/life', 'appApiBase' => $origin.'/api/v1/app', 'appScopes' => ['app:read', 'app:write'],
        ] : ['enabled' => false, 'protocol' => 1, 'message' => 'Native Life sign-in is not configured on this website.'])->header('Cache-Control', 'no-store');
    }

    public function logout(Request $request): JsonResponse
    {
        $token = $request->user('api')->token();
        abort_unless($token && in_array((string) $token->client_id, array_filter([(string) config('native.client_id'), (string) config('native.desktop_client_id')]), true), 403);
        $token->forceFill(['revoked' => true])->save();
        RefreshToken::where('access_token_id', $token->id)->update(['revoked' => true]);

        return response()->json(['ok' => true])->header('Cache-Control', 'no-store');
    }
}

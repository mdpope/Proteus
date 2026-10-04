<?php
namespace App\Http\Controllers;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Passport\Passport;
use Laravel\Passport\RefreshToken;
class NativeClientController extends Controller
{
    public function discovery(): JsonResponse
    {
        $origin = rtrim(config('app.url'), '/');
        $id = config('native.client_id');
        $client = $id ? Passport::client()->newQuery()->whereKey($id)->where('revoked', false)->first() : null;
        $enabled = parse_url($origin, PHP_URL_SCHEME) === 'https'
            && $client && ! $client->confidential()
            && $client->redirect_uris === [config('native.redirect_uri')]
            && $client->hasGrantType('authorization_code') && $client->hasGrantType('refresh_token');
        return response()->json($enabled ? [
            'enabled' => true, 'protocol' => 1, 'issuer' => $origin,
            'clientId' => (string) $client->id,
            'authorizationEndpoint' => $origin.'/oauth/authorize', 'tokenEndpoint' => $origin.'/oauth/token',
            'redirectUri' => config('native.redirect_uri'), 'scopes' => ['brain:read', 'brain:write'],
            'apiBase' => $origin.'/api/v1/life',
        ] : ['enabled' => false, 'protocol' => 1, 'message' => 'Native Life sign-in is not configured on this website.'])->header('Cache-Control', 'no-store');
    }
    public function logout(Request $request): JsonResponse
    {
        $token = $request->user('api')->token();
        abort_unless($token && (string) $token->client_id === (string) config('native.client_id'), 403);
        $token->forceFill(['revoked' => true])->save();
        RefreshToken::where('access_token_id', $token->id)->update(['revoked' => true]);
        return response()->json(['ok' => true])->header('Cache-Control', 'no-store');
    }
}

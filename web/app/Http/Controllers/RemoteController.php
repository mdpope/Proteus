<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class RemoteController extends Controller
{
    private function account(Request $request): string
    {
        return hash_hmac('sha256', 'proteus-browser:'.$request->user()->getAuthIdentifier(), config('app.key'));
    }

    public function index(Request $request): Response
    {
        $relay = config('remote.relay_url');
        $parts = parse_url($relay);
        $local = in_array($parts['host'] ?? '', ['localhost', '127.0.0.1', '[::1]'], true);
        abort_unless($parts && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['path']) && ! isset($parts['query']) && ! isset($parts['fragment']) && (($parts['scheme'] ?? '') === 'wss' || ($local && ($parts['scheme'] ?? '') === 'ws')), 503, 'Remote relay configuration is unavailable.');

        return response()->view('remote', ['remoteAccount' => $this->account($request), 'remoteRelay' => $relay])
            ->header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' {$relay}; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
            ->header('Cache-Control', 'no-store, private');
    }

    public function session(Request $request): JsonResponse
    {
        return response()->json(['account' => $this->account($request)])->header('Cache-Control', 'no-store, private');
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class OAuthBoundary
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('oauth/authorize') && $request->isMethod('GET')) {
            abort_unless($request->input('code_challenge_method') === 'S256' && preg_match('/^[A-Za-z0-9_-]{43}$/', (string) $request->input('code_challenge')), 400, 'PKCE S256 is required.');
        }
        if ($request->filled('resource')) {
            abort_unless($request->input('resource') === rtrim(config('app.url'), '/').'/mcp', 400, 'Invalid OAuth resource.');
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        if ($request->is('.well-known/oauth-authorization-server*') && $response instanceof JsonResponse && $response->isSuccessful()) {
            $response->setData($response->getData(true) + ['token_endpoint_auth_methods_supported' => ['none', 'client_secret_basic', 'client_secret_post']]);
        }
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'same-origin');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=()');
        if (! $request->is('build/*')) {
            $response->headers->set('Cache-Control', 'no-store, private');
        }
        if (app()->isProduction()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        }

        return $response;
    }
}

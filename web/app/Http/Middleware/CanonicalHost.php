<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CanonicalHost
{
    public function handle(Request $request, Closure $next): Response
    {
        $host = parse_url(config('app.url'), PHP_URL_HOST);
        $allowed = [$host, config('brain.legacy_host')];
        if (! app()->isProduction()) {
            $allowed = array_merge($allowed, ['localhost', '127.0.0.1']);
        }
        abort_unless(in_array($request->getHost(), $allowed, true), 400, 'Unrecognized host.');
        if ($request->getHost() === config('brain.legacy_host') && ! $request->is('health', 'foods', 'foods/*', 'mealentries', 'mealentries/*', 'meal-entries', 'meal-entries/*', 'meal_entries', 'meal_entries/*', 'summary/*', 'openapi.json')) {
            if ($request->is('api/*', 'oauth/*', 'mcp', 'user/*', 'passkeys/*')) {
                abort(404);
            }

            return redirect(rtrim(config('app.url'), '/').'/nutrition', 302);
        }

        return $next($request);
    }
}

<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AppScope
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()->tokenCan($request->isMethod('GET') ? 'app:read' : 'app:write'), 403, 'Authorize shared app access to use this feature. Existing Life grants are unchanged.');

        return $next($request);
    }
}

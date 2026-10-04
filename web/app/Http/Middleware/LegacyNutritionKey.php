<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\TenantAccess;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LegacyNutritionKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('x-api-key') ?? $request->bearerToken();
        $valid = false;
        foreach (config('brain.legacy_key_hashes') as $hash) {
            $valid = hash_equals($hash, hash('sha256', (string) $key)) || $valid;
        }
        if (! $key || ! $valid || $request->getHost() !== config('brain.legacy_host')) {
            return response()->json(['detail' => 'Invalid API key.'], 401);
        }
        $user = User::where('email', config('brain.legacy_owner_email'))->firstOrFail();
        app(TenantAccess::class)->workspace($user, $request->isMethod('GET') ? 'nutrition.read' : 'nutrition.edit');
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}

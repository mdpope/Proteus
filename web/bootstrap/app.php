<?php

use App\Http\Middleware\CanonicalHost;
use App\Http\Middleware\ProtectSecurityOperations;
use App\Http\Middleware\RequireStrongAuthentication;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\AuthenticateSession;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            require __DIR__.'/../routes/legacy.php';
            require __DIR__.'/../routes/native.php';
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);
        $middleware->append(CanonicalHost::class);
        $middleware->web(append: [AuthenticateSession::class, ProtectSecurityOperations::class]);
        $middleware->alias(['strong' => RequireStrongAuthentication::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*', 'mcp', 'oauth/token', 'oauth/register') || $request->expectsJson(),
        );
    })->create();

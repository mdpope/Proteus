<?php

use App\Mcp\Servers\BrainServer;
use Illuminate\Support\Facades\Route;
use Laravel\Mcp\Facades\Mcp;
use Laravel\Passport\Http\Middleware\CheckToken;

Route::middleware(['throttle:20,1'])->group(fn () => Mcp::oauthRoutes());
Mcp::web('/mcp', BrainServer::class)->middleware(['auth:api', CheckToken::using('mcp:use'), 'throttle:60,1']);

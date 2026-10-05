<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\CaptureController;
use App\Http\Controllers\LifeApiController;
use App\Http\Middleware\AppScope;
use Illuminate\Support\Facades\Route;
use Laravel\Passport\Http\Middleware\CheckTokenForAnyScope;

Route::prefix('v1')->middleware(['auth:api', 'throttle:60,1'])->group(function () {
    Route::middleware(CheckTokenForAnyScope::using('brain:read', 'mcp:use'))->group(function () {
        Route::get('/vehicles', [ApiController::class, 'vehicles']);
        Route::get('/vehicles/{vehicle}', [ApiController::class, 'vehicle']);
        Route::get('/inbox', [ApiController::class, 'inbox']);
        Route::get('/attachments/{attachment}', [CaptureController::class, 'download']);
    });
    Route::post('/captures', [ApiController::class, 'capture'])->middleware(CheckTokenForAnyScope::using('brain:write', 'mcp:use'));
    Route::post('/uploads', [CaptureController::class, 'store'])->middleware(CheckTokenForAnyScope::using('brain:write', 'mcp:use'));
});

// Native Life uses explicit read/write grants, independent of desktop relay pairing.
Route::prefix('v1/life')->middleware(['auth:api', 'throttle:60,1'])->group(function () {
    Route::middleware(CheckTokenForAnyScope::using('brain:read'))->group(function () {
        Route::get('/', [LifeApiController::class, 'status']);
        Route::post('/data', [LifeApiController::class, 'data']);
        Route::get('/evidence/{id}', [LifeApiController::class, 'evidence'])->whereNumber('id');
    });
    Route::post('/action', [LifeApiController::class, 'action'])->middleware(CheckTokenForAnyScope::using('brain:write'));
});

Route::prefix('v1/app')->middleware(['auth:api', 'throttle:120,1', AppScope::class])->group(__DIR__.'/app.php');

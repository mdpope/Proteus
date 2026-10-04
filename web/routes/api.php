<?php

use App\Http\Controllers\ApiController;
use App\Http\Controllers\CaptureController;
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

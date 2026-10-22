<?php

use App\Http\Controllers\AppApiController;
use App\Http\Controllers\DesktopReleaseController;
use Illuminate\Support\Facades\Route;

Route::get('/releases', [DesktopReleaseController::class, 'index']);
Route::get('/releases/{id}/{kind}', [DesktopReleaseController::class, 'download'])->where('id', '[A-Za-z0-9][A-Za-z0-9._-]{0,159}')->whereIn('kind', ['artifact', 'installer', 'manifest'])->middleware('throttle:20,1');

Route::get('/', [AppApiController::class, 'index']);
Route::put('/preferences', [AppApiController::class, 'preferences']);
Route::get('/{kind}', [AppApiController::class, 'list'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'logs']);
Route::post('/{kind}', [AppApiController::class, 'store'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'logs']);
Route::put('/{kind}/{id}', [AppApiController::class, 'store'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links'])->whereUuid('id');
Route::patch('/notifications/{id}', [AppApiController::class, 'read'])->whereUuid('id');
Route::delete('/{kind}/{id}', [AppApiController::class, 'destroy'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'push-subscriptions'])->whereUuid('id');
Route::post('/push-subscriptions', [AppApiController::class, 'subscribe']);

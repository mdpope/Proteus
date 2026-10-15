<?php

use App\Http\Controllers\AppApiController;
use Illuminate\Support\Facades\Route;

Route::get('/', [AppApiController::class, 'index']);
Route::put('/preferences', [AppApiController::class, 'preferences']);
Route::get('/{kind}', [AppApiController::class, 'list'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'logs']);
Route::post('/{kind}', [AppApiController::class, 'store'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'logs']);
Route::put('/{kind}/{id}', [AppApiController::class, 'store'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links'])->whereUuid('id');
Route::patch('/notifications/{id}', [AppApiController::class, 'read'])->whereUuid('id');
Route::delete('/{kind}/{id}', [AppApiController::class, 'destroy'])->whereIn('kind', ['browser-profiles', 'team-lists', 'links', 'history', 'notifications', 'push-subscriptions'])->whereUuid('id');
Route::post('/push-subscriptions', [AppApiController::class, 'subscribe']);

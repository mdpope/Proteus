<?php
use App\Http\Controllers\NativeClientController;
use Illuminate\Support\Facades\Route;
Route::get('/api/v1/native-config', [NativeClientController::class, 'discovery'])->middleware('throttle:30,1');
Route::delete('/api/v1/native-session', [NativeClientController::class, 'logout'])->middleware(['auth:api', 'throttle:20,1']);

<?php

use App\Http\Controllers\CaptureController;
use App\Http\Controllers\FuelController;
use App\Http\Controllers\GarageController;
use App\Http\Controllers\NutritionController;
use App\Http\Controllers\RemoteController;
use App\Http\Controllers\SecurityController;
use App\Http\Controllers\SetupController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/garage');
Route::get('/setup', [SetupController::class, 'show'])->name('setup.show')->middleware('throttle:10,1');
Route::post('/setup', [SetupController::class, 'store'])->name('setup.store')->middleware('throttle:5,1');
Route::middleware('auth')->group(function () {
    Route::get('/security', [SecurityController::class, 'index'])->name('security');
    Route::post('/security/verify', [SecurityController::class, 'verify'])->middleware(['password.confirm', 'throttle:5,1'])->name('security.verify');
    Route::delete('/security/tokens/{token}', [SecurityController::class, 'revoke'])->middleware(['strong', 'password.confirm'])->name('security.revoke');
});
Route::middleware(['auth', 'strong'])->group(function () {
    Route::get('/remote', [RemoteController::class, 'index'])->name('remote');
    Route::get('/remote/session', [RemoteController::class, 'session'])->name('remote.session')->middleware('throttle:120,1');
    Route::get('/garage', [GarageController::class, 'index'])->name('garage');
    Route::get('/garage/{vehicle}', [GarageController::class, 'show'])->name('vehicles.show');
    Route::post('/garage/{vehicle}/tasks', [GarageController::class, 'task'])->name('tasks.store');
    Route::post('/garage/{vehicle}/tasks/{task}/complete', [GarageController::class, 'completeTask'])->name('tasks.complete');
    Route::get('/captures', [CaptureController::class, 'index'])->name('captures.index');
    Route::get('/captures/new', [CaptureController::class, 'create'])->name('captures.create');
    Route::post('/captures', [CaptureController::class, 'store'])->middleware('throttle:30,1')->name('captures.store');
    Route::get('/captures/{capture}', [CaptureController::class, 'show'])->name('captures.show');
    Route::post('/captures/{capture}/accept', [CaptureController::class, 'accept'])->name('captures.accept');
    Route::get('/attachments/{attachment}', [CaptureController::class, 'download'])->name('attachments.download');
    Route::get('/fuel', [FuelController::class, 'index'])->name('fuel');
    Route::get('/nutrition', [NutritionController::class, 'index'])->name('nutrition');
    Route::post('/nutrition/foods', [NutritionController::class, 'food'])->name('foods.store');
    Route::post('/nutrition/meals', [NutritionController::class, 'meal'])->name('meals.store');
    Route::view('/connections', 'connections')->name('connections');
});

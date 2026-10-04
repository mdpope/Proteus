<?php

use App\Http\Controllers\LegacyNutritionController as Nutrition;
use App\Http\Middleware\LegacyNutritionKey;
use Illuminate\Support\Facades\Route;

Route::domain(config('brain.legacy_host'))->middleware([LegacyNutritionKey::class, 'throttle:120,1'])->group(function () {
    Route::get('/health', fn () => response()->json(['status' => 'ok']));
    Route::get('/foods', [Nutrition::class, 'foods']);
    Route::post('/foods', [Nutrition::class, 'createFood']);
    Route::patch('/foods/{id}', [Nutrition::class, 'updateFood']);
    foreach (['mealentries', 'meal-entries', 'meal_entries'] as $path) {
        Route::get('/'.$path, [Nutrition::class, 'meals']);
        Route::post('/'.$path, [Nutrition::class, 'createMeal']);
        Route::patch('/'.$path.'/{id}', [Nutrition::class, 'updateMeal']);
        Route::delete('/'.$path.'/{id}', [Nutrition::class, 'deleteMeal']);
    }
    Route::get('/mealentries/date/{entry_date}', [Nutrition::class, 'meals']);
    Route::get('/summary/daily', [Nutrition::class, 'daily']);
    Route::get('/summary/range', [Nutrition::class, 'range']);
    Route::get('/summary/qualified-averages', [Nutrition::class, 'qualified']);
});

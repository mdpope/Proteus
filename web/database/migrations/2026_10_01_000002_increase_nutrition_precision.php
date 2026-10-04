<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('food_versions', function (Blueprint $table) {
            foreach (['calories', 'protein', 'fat', 'carbs'] as $column) {
                $table->decimal($column, 16, 6)->change();
            }
        });
        Schema::table('meal_entries', function (Blueprint $table) {
            $table->decimal('qty', 16, 6)->change();
        });
    }

    public function down(): void
    {
        Schema::table('food_versions', function (Blueprint $table) {
            foreach (['calories', 'protein', 'fat', 'carbs'] as $column) {
                $table->decimal($column, 10, 3)->change();
            }
        });
        Schema::table('meal_entries', function (Blueprint $table) {
            $table->decimal('qty', 10, 3)->change();
        });
    }
};

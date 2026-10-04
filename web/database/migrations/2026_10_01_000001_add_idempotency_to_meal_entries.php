<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('meal_entries', function (Blueprint $t) {
            $t->string('idempotency_key', 100)->nullable();
            $t->string('request_hash', 64)->nullable();
            $t->softDeletes();
            $t->unique(['user_id', 'idempotency_key']);
        });
        Schema::table('food_versions', function (Blueprint $t) {
            $t->dropUnique(['legacy_id']);
            $t->unique(['food_id', 'legacy_id']);
        });
    }

    public function down(): void
    {
        Schema::table('meal_entries', function (Blueprint $t) {
            $t->dropUnique(['user_id', 'idempotency_key']);
            $t->dropColumn(['idempotency_key', 'request_hash', 'deleted_at']);
        });
        Schema::table('food_versions', function (Blueprint $t) {
            $t->dropUnique(['food_id', 'legacy_id']);
            $t->unique('legacy_id');
        });
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('app_records', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 32);
            $table->unsignedInteger('revision')->default(1);
            $table->text('payload');
            $table->timestamps();
            $table->index(['user_id', 'kind', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_records');
    }
};

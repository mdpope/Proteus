<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('life_reminder_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 200);
            $table->boolean('inbox')->default(false);
            $table->unsignedBigInteger('revision')->default(1);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'deleted_at']);
        });
        Schema::create('life_reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('list_id')->constrained('life_reminder_lists');
            $table->string('title', 500);
            $table->text('notes')->nullable();
            $table->string('due_kind', 10)->default('none');
            $table->date('due_date')->nullable();
            $table->dateTime('due_at')->nullable();
            $table->string('time_zone', 100)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedBigInteger('revision')->default(1);
            $table->uuid('alert_id')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['user_id', 'deleted_at', 'completed_at']);
            $table->index(['due_at', 'alert_id']);
        });
        Schema::create('life_reminder_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('operation_id', 100);
            $table->string('request_hash', 64);
            $table->longText('result_json');
            $table->unique(['user_id', 'operation_id']);
        });
        Schema::create('life_reminder_changes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind', 10);
            $table->longText('record_json');
            $table->index(['user_id', 'id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('life_reminder_changes');
        Schema::dropIfExists('life_reminder_operations');
        Schema::dropIfExists('life_reminders');
        Schema::dropIfExists('life_reminder_lists');
    }
};

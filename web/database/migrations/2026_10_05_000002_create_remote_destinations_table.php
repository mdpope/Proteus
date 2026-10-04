<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('remote_destinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->uuid('host_id');
            $table->string('relay', 255);
            $table->string('label', 80);
            $table->uuid('device_id');
            $table->text('credential');
            $table->timestamp('paired_at');
            $table->timestamps();
            $table->unique(['user_id', 'host_id']);
        });
    }

    public function down(): void
    {
        // Account credentials survive a code rollback. Removal is an explicit account operation.
    }
};

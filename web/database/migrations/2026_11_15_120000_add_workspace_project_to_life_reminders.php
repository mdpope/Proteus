<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Optional association with a Proteus workspace and project. Both stay null for ordinary reminders. */
    public function up(): void
    {
        Schema::table('life_reminders', function (Blueprint $table) {
            $table->string('workspace_id', 128)->nullable();
            $table->string('project_id', 128)->nullable();
            $table->index(['user_id', 'workspace_id']);
            $table->index(['user_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::table('life_reminders', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'workspace_id']);
            $table->dropIndex(['user_id', 'project_id']);
            $table->dropColumn(['workspace_id', 'project_id']);
        });
    }
};

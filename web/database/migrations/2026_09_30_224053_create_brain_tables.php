<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('workspaces', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('slug')->unique();
            $t->string('timezone')->default('America/Boise');
            $t->timestamps();
        });
        Schema::create('memberships', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->string('role')->default('viewer');
            $t->json('permissions')->nullable();
            $t->timestamps();
            $t->unique(['workspace_id', 'user_id']);
        });
        Schema::create('workspace_domains', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->string('hostname')->unique();
            $t->timestamp('verified_at')->nullable();
            $t->timestamps();
        });
        Schema::table('users', function (Blueprint $t) {
            $t->foreignId('current_workspace_id')->nullable()->constrained('workspaces');
            $t->string('setup_token_hash', 64)->nullable();
            $t->timestamp('setup_expires_at')->nullable();
        });
        Schema::create('vehicles', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->string('name');
            $t->string('kind');
            $t->string('fuel_type')->nullable();
            $t->unsignedSmallInteger('year')->nullable();
            $t->string('vin', 30)->nullable();
            $t->text('notes')->nullable();
            $t->string('source_key')->nullable();
            $t->timestamps();
            $t->unique(['workspace_id', 'source_key']);
        });
        Schema::create('captures', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('created_by')->constrained('users');
            $t->foreignId('vehicle_id')->nullable()->constrained();
            $t->string('kind');
            $t->string('source');
            $t->string('status')->default('review');
            $t->string('title');
            $t->text('notes')->nullable();
            $t->json('payload');
            $t->json('uncertainties')->nullable();
            $t->string('idempotency_key', 100);
            $t->string('request_hash', 64);
            $t->timestamp('accepted_at')->nullable();
            $t->timestamps();
            $t->unique(['workspace_id', 'created_by', 'idempotency_key'], 'capture_idempotency');
            $t->index(['workspace_id', 'status', 'created_at']);
        });
        Schema::create('attachments', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('capture_id')->constrained();
            $t->string('original_name');
            $t->string('path');
            $t->string('mime_type');
            $t->unsignedBigInteger('bytes');
            $t->string('sha256', 64);
            $t->timestamps();
            $t->unique(['capture_id', 'sha256']);
        });
        Schema::create('service_records', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('vehicle_id')->constrained();
            $t->foreignId('capture_id')->nullable()->unique()->constrained();
            $t->foreignId('created_by')->constrained('users');
            $t->string('kind');
            $t->string('title');
            $t->date('occurred_on')->nullable();
            $t->string('date_precision')->default('day');
            $t->decimal('odometer', 12, 1)->nullable();
            $t->boolean('odometer_approximate')->default(false);
            $t->decimal('cost', 12, 2)->nullable();
            $t->string('vendor')->nullable();
            $t->json('parts')->nullable();
            $t->text('notes')->nullable();
            $t->string('source_key')->nullable();
            $t->timestamps();
            $t->unique(['workspace_id', 'source_key']);
            $t->index(['vehicle_id', 'occurred_on']);
        });
        Schema::create('fuel_fills', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('vehicle_id')->constrained();
            $t->foreignId('capture_id')->nullable()->unique()->constrained();
            $t->foreignId('created_by')->constrained('users');
            $t->dateTime('filled_at');
            $t->decimal('odometer', 12, 1);
            $t->decimal('gallons', 10, 3);
            $t->decimal('price_per_gallon', 8, 3)->nullable();
            $t->decimal('total_cost', 10, 2)->nullable();
            $t->string('fuel_type');
            $t->boolean('full_tank');
            $t->boolean('missed_fill')->default(false);
            $t->decimal('trip_miles', 10, 1)->nullable();
            $t->decimal('dashboard_mpg', 7, 2)->nullable();
            $t->string('station')->nullable();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->index(['vehicle_id', 'filled_at']);
        });
        Schema::create('odometer_readings', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('vehicle_id')->constrained();
            $t->foreignId('created_by')->constrained('users');
            $t->foreignId('capture_id')->nullable()->unique()->constrained();
            $t->date('observed_on');
            $t->decimal('miles', 12, 1);
            $t->text('notes')->nullable();
            $t->timestamps();
        });
        Schema::create('maintenance_tasks', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('vehicle_id')->constrained();
            $t->string('title');
            $t->text('notes')->nullable();
            $t->date('due_on')->nullable();
            $t->decimal('due_odometer', 12, 1)->nullable();
            $t->string('status')->default('open');
            $t->string('source_key')->nullable();
            $t->timestamps();
            $t->unique(['workspace_id', 'source_key']);
        });
        Schema::create('foods', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->string('name');
            $t->string('serving');
            $t->unsignedBigInteger('legacy_id')->nullable();
            $t->timestamps();
            $t->unique(['user_id', 'name']);
            $t->unique(['user_id', 'legacy_id']);
        });
        Schema::create('food_versions', function (Blueprint $t) {
            $t->id();
            $t->foreignId('food_id')->constrained('foods');
            foreach (['calories', 'protein', 'fat', 'carbs'] as $c) {
                $t->decimal($c, 10, 3);
            } $t->string('source_type')->default('manual');
            $t->text('source_note')->nullable();
            $t->boolean('is_estimate')->default(false);
            $t->unsignedBigInteger('legacy_id')->nullable()->unique();
            $t->timestamps();
        });
        Schema::table('foods', function (Blueprint $t) {
            $t->foreignId('current_version_id')->nullable()->constrained('food_versions');
        });
        Schema::create('meal_entries', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->foreignId('food_version_id')->constrained();
            $t->date('date');
            $t->string('meal');
            $t->decimal('qty', 10, 3);
            $t->string('unit')->nullable();
            $t->text('note')->nullable();
            $t->boolean('migration_baseline')->default(false);
            $t->unsignedBigInteger('legacy_id')->nullable();
            $t->timestamps();
            $t->unique(['user_id', 'legacy_id']);
            $t->index(['user_id', 'date']);
        });
        Schema::create('audit_events', function (Blueprint $t) {
            $t->id();
            $t->foreignId('workspace_id')->constrained();
            $t->foreignId('user_id')->constrained();
            $t->string('action');
            $t->string('entity_type');
            $t->unsignedBigInteger('entity_id');
            $t->json('details')->nullable();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_events');
        Schema::dropIfExists('meal_entries');
        Schema::table('foods', fn (Blueprint $t) => $t->dropForeign(['current_version_id']));
        foreach (['food_versions', 'foods', 'maintenance_tasks', 'odometer_readings', 'fuel_fills', 'service_records', 'attachments', 'captures', 'vehicles'] as $name) {
            Schema::dropIfExists($name);
        }
        Schema::table('users', function (Blueprint $t) {
            $t->dropForeign(['current_workspace_id']);
            $t->dropColumn(['current_workspace_id', 'setup_token_hash', 'setup_expires_at']);
        });
        foreach (['workspace_domains', 'memberships', 'workspaces'] as $name) {
            Schema::dropIfExists($name);
        }
    }
};

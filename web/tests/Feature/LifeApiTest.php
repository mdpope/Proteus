<?php
namespace Tests\Feature;

use App\Models\{Attachment, AuditEvent, Food, Membership, Workspace};
use App\Services\NutritionLedger;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\{DB, Schema, Storage};
use Laravel\Passport\Passport;
use Tests\{CreatesBrain, TestCase};

class LifeApiTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;
    private function login($u, array $scopes = ['brain:read', 'brain:write']): array { Passport::actingAs($u, $scopes, 'api'); return $this->getJson('/api/v1/life')->assertOk()->json(); }
    private function change(array $profile, string $action, array $input, ?string $key = null) { return $this->postJson('/api/v1/life/action', ['action' => $action, 'input' => $input, 'idempotencyKey' => $key ?? (string) \Illuminate\Support\Str::uuid(), 'expectedAccountId' => $profile['accountId'], 'expectedWorkspaceId' => $profile['workspaceId']]); }
    private function data(string $section, array $query = []) { return $this->postJson('/api/v1/life/data', compact('section', 'query')); }
    private function food(array $profile, string $name = 'Synthetic food', int $calories = 100) { return $this->change($profile, 'food.save', ['name' => $name, 'serving' => '1 cup', 'calories' => $calories, 'protein' => 10, 'carbs' => 20, 'fat' => 3])->assertOk()->json('record'); }

    public function test_scope_tenant_and_principal_boundaries(): void {
        $this->getJson('/api/v1/life')->assertUnauthorized();
        $a = $this->owner(); $b = $this->owner(); $p = $this->login($a); $f = $this->food($p);
        $vehicle = $this->vehicleFor($a);
        $q = $this->login($b); $this->data('nutrition', ['foodId' => $f['id']])->assertNotFound(); $this->data('garage', ['vehicleId' => $vehicle->id])->assertNotFound();
        $this->change($q, 'meal.log', ['food_id' => $f['id'], 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1])->assertNotFound();
        $this->change($p, 'vehicle.save', ['name' => 'Wrong account', 'kind' => 'car'])->assertConflict();
        Membership::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $b->id, 'role' => 'owner']); $b->forceFill(['current_workspace_id' => $a->current_workspace_id])->save(); $this->login($b); $this->data('nutrition', ['foodId' => $f['id']])->assertNotFound();
        Passport::actingAs($a, ['mcp:use'], 'api'); $this->getJson('/api/v1/life')->assertForbidden();
        $read = $this->login($a, ['brain:read']); $this->assertTrue($read['readOnly']); $this->change($read, 'food.save', ['name' => 'denied'])->assertForbidden();
        Membership::where('user_id', $a->id)->update(['permissions' => ['garage.read']]); $this->login($a); $this->data('nutrition')->assertForbidden();
        AuditEvent::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $a->id, 'action' => 'meal.updated', 'entity_type' => 'meal_entry', 'entity_id' => 1, 'details' => ['private' => 'nutrition-marker']]);
        $this->data('overview')->assertOk()->assertJsonPath('counts.foods', null)->assertDontSee('nutrition-marker'); $this->data('security')->assertOk()->assertDontSee('nutrition-marker');
    }
    public function test_periods_historical_versions_paging_and_retry_semantics(): void {
        $this->travelTo(\Carbon\Carbon::parse('2024-03-01T06:30:00Z')); $u = $this->owner(); Workspace::whereKey($u->current_workspace_id)->update(['timezone' => 'America/Denver']); $p = $this->login($u); $f = $this->food($p);
        foreach (['2024-02-01', '2024-02-29'] as $date) foreach (['breakfast','lunch','dinner'] as $meal) $this->change($p, 'meal.log', ['food_id' => $f['id'], 'date' => $date, 'meal' => $meal, 'qty' => 1])->assertOk();
        $this->food($p, 'Synthetic food', 900); $key = (string) \Illuminate\Support\Str::uuid();
        $input = ['food_id' => $f['id'], 'date' => '2024-02-15', 'meal' => 'snack', 'qty' => 1]; $this->change($p, 'meal.log', $input, $key)->assertOk(); $this->change($p, 'meal.log', $input, $key)->assertOk(); $this->change($p, 'meal.log', array_replace($input, ['qty' => 2]), $key)->assertConflict();
        $r = $this->data('nutrition', ['tab' => 'averages', 'from' => '2024-02-20', 'through' => '2024-02-29'])->assertOk()->json();
        $this->assertSame('2024-02-29', $r['reportDate']); $this->assertSame(30, $r['periodSummaries'][2]['calendarDays']); $this->assertSame('2024-01-31', $r['periodSummaries'][2]['from']); $this->assertSame(2, $r['periodSummaries'][1]['completeDays']); $this->assertEquals(300, $r['periodSummaries'][1]['calories']); $this->assertSame(1, $r['averages']['days']); $this->assertSame(1, $r['periodSummaries'][1]['partialDays']);
        $entries = $this->data('nutrition', ['date' => '2024-02-29'])->json('entries'); $this->change($p, 'meal.update', ['id' => $entries[0]['id'], 'note' => 'retains original'])->assertOk(); $this->assertEquals(100, $this->data('nutrition', ['date' => '2024-02-29'])->json('entries.0.calories'));
        $this->data('nutrition', ['from' => '2024-03-01', 'through' => '2024-02-01'])->assertUnprocessable(); $this->data('nutrition', ['through' => '2024-02-01'])->assertOk();
        $this->data('nutrition', ['tab' => 'versions', 'foodId' => $f['id']])->assertOk()->assertJsonCount(2, 'versions');
        $this->data('nutrition', ['page' => 2])->assertOk()->assertJsonPath('days', []);
        $this->change($p, 'meal.delete', ['id' => $entries[0]['id']])->assertOk(); $this->assertSame(1, $this->data('nutrition')->json('periodSummaries.0.completeDays'));
    }
    public function test_garage_capture_acceptance_evidence_and_safe_security(): void {
        Storage::fake('local'); $u = $this->owner(); $p = $this->login($u);
        $v = $this->change($p, 'vehicle.save', ['name' => 'Synthetic vehicle', 'kind' => 'car', 'fuel_type' => 'gas'])->assertOk()->json('record');
        $t = $this->change($p, 'task.add', ['vehicle_id' => $v['id'], 'title' => 'Check oil'])->assertOk()->json('record');
        $c = $this->change($p, 'capture.save', ['vehicle_id' => $v['id'], 'kind' => 'service', 'title' => 'Synthetic service', 'payload' => ['occurred_on' => '2024-01-01', 'odometer' => 123, 'date_precision' => 'day']])->assertOk()->json('record');
        $this->assertDatabaseCount('service_records', 0); $this->change($p, 'capture.accept', ['id' => $c['id']])->assertOk(); $this->assertDatabaseCount('service_records', 1);
        $a = $this->change($p, 'attachment.add', ['capture_id' => $c['id'], 'name' => 'original.txt', 'mimeType' => 'text/plain', 'base64' => base64_encode('Synthetic original')])->assertOk()->json('record');
        $this->get('/api/v1/life/evidence/'.$a['id'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->data('garage')->assertOk()->assertJsonPath('vehicleCards.0.historyCount', 1)->assertJsonPath('vehicleCards.0.openTaskCount', 1)->assertJsonPath('vehicleCards.0.latestObservation.miles', 123);
        $alien = $this->owner(); DB::table('odometer_readings')->insert(['workspace_id' => $alien->current_workspace_id, 'vehicle_id' => $v['id'], 'created_by' => $alien->id, 'observed_on' => '2024-02-01', 'miles' => 99999, 'created_at' => now(), 'updated_at' => now()]);
        $this->data('garage')->assertJsonPath('vehicleCards.0.latestObservation.miles', 123);
        $this->change($p, 'task.complete', ['id' => $t['id']])->assertOk(); $this->data('garage')->assertJsonPath('vehicleCards.0.openTaskCount', 0);
        foreach (['overview','nutrition','garage','fuel','captures','security','connections'] as $s) $this->data($s)->assertOk()->assertJsonPath('accountId', $p['accountId']);
        $this->data('connections')->assertJsonPath('canRevokeTokens', false); $this->change($p, 'token.revoke', ['id' => 'anything'])->assertForbidden();
        $other = $this->owner(); $this->login($other); $this->getJson('/api/v1/life/evidence/'.$a['id'])->assertNotFound();
    }
    public function test_native_ledger_migration_is_compatible_and_rollback_preserves_replay_records(): void {
        $migration = require database_path('migrations/2026_10_05_000001_add_native_life_retry_ledger.php');
        $before = DB::table('proteus_life_schema')->get()->toJson(); $migration->up(); $this->assertSame($before, DB::table('proteus_life_schema')->get()->toJson()); $migration->down(); $this->assertTrue(Schema::hasTable('proteus_life_mutations'));
        DB::table('proteus_life_schema')->where('version', 2)->update(['checksum' => str_repeat('0', 64)]);
        $this->expectException(\RuntimeException::class); $migration->up();
    }
    public function test_native_ledger_migration_refuses_incompatible_table_without_altering_it(): void {
        Schema::drop('proteus_life_mutations'); DB::statement('CREATE TABLE proteus_life_mutations (wrong TEXT)');
        $migration = require database_path('migrations/2026_10_05_000001_add_native_life_retry_ledger.php');
        try { $migration->up(); $this->fail('Must reject incompatible schema'); } catch (\RuntimeException) { $this->assertSame(['wrong'], Schema::getColumnListing('proteus_life_mutations')); }
    }
}

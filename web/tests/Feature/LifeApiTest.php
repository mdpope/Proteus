<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Membership;
use App\Models\Workspace;
use App\Services\NutritionLedger;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class LifeApiTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        openssl_pkey_export($key, $private);
        config(['app.key' => 'base64:'.base64_encode(str_repeat('t', 32)), 'passport.private_key' => $private, 'passport.public_key' => openssl_pkey_get_details($key)['key']]);
    }

    private function login($u, array $scopes = ['brain:read', 'brain:write']): array
    {
        Passport::actingAs($u, $scopes, 'api');

        return $this->getJson('/api/v1/life')->assertOk()->json();
    }

    private function change(array $profile, string $action, array $input, ?string $key = null)
    {
        return $this->postJson('/api/v1/life/action', ['action' => $action, 'input' => $input, 'idempotencyKey' => $key ?? (string) Str::uuid(), 'expectedAccountId' => $profile['accountId'], 'expectedWorkspaceId' => $profile['workspaceId']]);
    }

    private function data(string $section, array $query = [])
    {
        return $this->postJson('/api/v1/life/data', compact('section', 'query'));
    }

    private function food(array $profile, string $name = 'Synthetic food', int $calories = 100)
    {
        return $this->change($profile, 'food.save', ['name' => $name, 'serving' => '1 cup', 'calories' => $calories, 'protein' => 10, 'carbs' => 20, 'fat' => 3])->assertOk()->json('record');
    }

    public function test_scope_tenant_and_principal_boundaries(): void
    {
        $this->getJson('/api/v1/life')->assertUnauthorized();
        $a = $this->owner();
        $b = $this->owner();
        $p = $this->login($a);
        $f = $this->food($p);
        $vehicle = $this->vehicleFor($a);
        $q = $this->login($b);
        $this->data('nutrition', ['foodId' => $f['id']])->assertNotFound();
        $this->data('garage', ['vehicleId' => $vehicle->id])->assertNotFound();
        $this->change($q, 'meal.log', ['food_id' => $f['id'], 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1])->assertNotFound();
        $this->change($p, 'vehicle.save', ['name' => 'Wrong account', 'kind' => 'car'])->assertConflict();
        Membership::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $b->id, 'role' => 'owner']);
        $b->forceFill(['current_workspace_id' => $a->current_workspace_id])->save();
        $this->login($b);
        $this->data('nutrition', ['foodId' => $f['id']])->assertNotFound();
        Passport::actingAs($a, ['mcp:use'], 'api');
        $this->getJson('/api/v1/life')->assertForbidden();
        $read = $this->login($a, ['brain:read']);
        $this->assertTrue($read['readOnly']);
        $this->change($read, 'food.save', ['name' => 'denied'])->assertForbidden();
        Membership::where('user_id', $a->id)->update(['permissions' => ['garage.read']]);
        $this->login($a);
        $this->data('nutrition')->assertForbidden();
        AuditEvent::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $a->id, 'action' => 'meal.updated', 'entity_type' => 'meal_entry', 'entity_id' => 1, 'details' => ['private' => 'nutrition-marker']]);
        $this->data('overview')->assertOk()->assertJsonPath('counts.foods', null)->assertDontSee('nutrition-marker');
        $this->data('security')->assertOk()->assertDontSee('nutrition-marker');
    }

    public function test_periods_historical_versions_paging_and_retry_semantics(): void
    {
        $this->travelTo(Carbon::parse('2024-03-01T06:30:00Z'));
        $u = $this->owner();
        Workspace::whereKey($u->current_workspace_id)->update(['timezone' => 'America/Denver']);
        $p = $this->login($u);
        $f = $this->food($p);
        foreach (['2024-02-01', '2024-02-29'] as $date) {
            foreach (['breakfast', 'lunch', 'dinner'] as $meal) {
                $this->change($p, 'meal.log', ['food_id' => $f['id'], 'date' => $date, 'meal' => $meal, 'qty' => 1])->assertOk();
            }
        }
        $this->food($p, 'Synthetic food', 900);
        $key = (string) Str::uuid();
        $input = ['food_id' => $f['id'], 'date' => '2024-02-15', 'meal' => 'snack', 'qty' => 1];
        $this->change($p, 'meal.log', $input, $key)->assertOk();
        $this->change($p, 'meal.log', $input, $key)->assertOk();
        $this->change($p, 'meal.log', array_replace($input, ['qty' => 2]), $key)->assertConflict();
        $r = $this->data('nutrition', ['tab' => 'averages', 'from' => '2024-02-20', 'through' => '2024-02-29'])->assertOk()->json();
        $this->assertSame('2024-02-29', $r['reportDate']);
        $this->assertSame(30, $r['periodSummaries'][2]['calendarDays']);
        $this->assertSame('2024-01-31', $r['periodSummaries'][2]['from']);
        $this->assertSame(2, $r['periodSummaries'][1]['completeDays']);
        $this->assertEquals(300, $r['periodSummaries'][1]['calories']);
        $this->assertSame(1, $r['averages']['days']);
        $this->assertSame(1, $r['periodSummaries'][1]['partialDays']);
        $entries = $this->data('nutrition', ['date' => '2024-02-29'])->json('entries');
        $this->change($p, 'meal.update', ['id' => $entries[0]['id'], 'note' => 'retains original'])->assertOk();
        $this->assertEquals(100, $this->data('nutrition', ['date' => '2024-02-29'])->json('entries.0.calories'));
        $this->data('nutrition', ['from' => '2024-03-01', 'through' => '2024-02-01'])->assertUnprocessable();
        $this->data('nutrition', ['through' => '2024-02-01'])->assertOk();
        $this->data('nutrition', ['tab' => 'versions', 'foodId' => $f['id']])->assertOk()->assertJsonCount(2, 'versions');
        $this->data('nutrition', ['page' => 2])->assertOk()->assertJsonPath('days', []);
        $this->change($p, 'meal.delete', ['id' => $entries[0]['id']])->assertOk();
        $this->assertSame(1, $this->data('nutrition')->json('periodSummaries.0.completeDays'));
    }

    public function test_garage_capture_acceptance_evidence_and_safe_security(): void
    {
        Storage::fake('local');
        $u = $this->owner();
        $p = $this->login($u);
        $v = $this->change($p, 'vehicle.save', ['name' => 'Synthetic vehicle', 'kind' => 'car', 'fuel_type' => 'gas'])->assertOk()->json('record');
        $t = $this->change($p, 'task.add', ['vehicle_id' => $v['id'], 'title' => 'Check oil'])->assertOk()->json('record');
        $c = $this->change($p, 'capture.save', ['vehicle_id' => $v['id'], 'kind' => 'service', 'title' => 'Synthetic service', 'payload' => ['occurred_on' => '2024-01-01', 'odometer' => 123, 'date_precision' => 'day']])->assertOk()->json('record');
        $this->assertDatabaseCount('service_records', 0);
        $this->change($p, 'capture.accept', ['id' => $c['id']])->assertOk();
        $this->assertDatabaseCount('service_records', 1);
        $a = $this->change($p, 'attachment.add', ['capture_id' => $c['id'], 'name' => 'original.txt', 'mimeType' => 'text/plain', 'base64' => base64_encode('Synthetic original')])->assertOk()->json('record');
        $this->get('/api/v1/life/evidence/'.$a['id'])->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->data('garage')->assertOk()->assertJsonPath('vehicleCards.0.historyCount', 1)->assertJsonPath('vehicleCards.0.openTaskCount', 1)->assertJsonPath('vehicleCards.0.latestObservation.miles', 123);
        $alien = $this->owner();
        DB::table('odometer_readings')->insert(['workspace_id' => $alien->current_workspace_id, 'vehicle_id' => $v['id'], 'created_by' => $alien->id, 'observed_on' => '2024-02-01', 'miles' => 99999, 'created_at' => now(), 'updated_at' => now()]);
        $this->data('garage')->assertJsonPath('vehicleCards.0.latestObservation.miles', 123);
        $this->change($p, 'task.complete', ['id' => $t['id']])->assertOk();
        $this->data('garage')->assertJsonPath('vehicleCards.0.openTaskCount', 0);
        foreach (['overview', 'nutrition', 'garage', 'fuel', 'captures', 'security', 'connections'] as $s) {
            $this->data($s)->assertOk()->assertJsonPath('accountId', $p['accountId']);
        }
        $this->data('connections')->assertJsonPath('canRevokeTokens', false);
        $this->change($p, 'token.revoke', ['id' => 'anything'])->assertForbidden();
        $other = $this->owner();
        $this->login($other);
        $this->getJson('/api/v1/life/evidence/'.$a['id'])->assertNotFound();
    }

    public function test_native_ledger_migration_is_compatible_and_rollback_preserves_replay_records(): void
    {
        $migration = require database_path('migrations/2026_10_05_000001_add_native_life_retry_ledger.php');
        $before = DB::table('proteus_life_schema')->get()->toJson();
        $migration->up();
        $this->assertSame($before, DB::table('proteus_life_schema')->get()->toJson());
        $migration->down();
        $this->assertTrue(Schema::hasTable('proteus_life_mutations'));
        DB::table('proteus_life_schema')->where('version', 2)->update(['checksum' => str_repeat('0', 64)]);
        $this->expectException(\RuntimeException::class);
        $migration->up();
    }

    public function test_native_ledger_migration_refuses_incompatible_table_without_altering_it(): void
    {
        Schema::drop('proteus_life_mutations');
        DB::statement('CREATE TABLE proteus_life_mutations (wrong TEXT)');
        $migration = require database_path('migrations/2026_10_05_000001_add_native_life_retry_ledger.php');
        try {
            $migration->up();
            $this->fail('Must reject incompatible schema');
        } catch (\RuntimeException) {
            $this->assertSame(['wrong'], Schema::getColumnListing('proteus_life_mutations'));
        }
    }

    public function test_desktop_food_pages_preserve_full_picker_versions_and_mobile_contract(): void
    {
        $u = $this->owner();
        $profile = $this->login($u);
        $foods = [];
        for ($i = 1; $i <= 56; $i++) {
            $foods[] = app(NutritionLedger::class)->saveFood($u, ['name' => sprintf('Synthetic food %03d', $i), 'serving' => '1 cup', 'calories' => 100, 'protein' => 10, 'carbs' => 20, 'fat' => 3])->getAttributes();
        }
        $first = $this->data('nutrition', ['client' => 'desktop', 'tab' => 'foods', 'foodPage' => 1])->assertOk()->assertJsonCount(25, 'foods')->assertJsonPath('foodPagination.total', 56)->assertJsonPath('foodPagination.totalPages', 3)->json();
        $last = $this->data('nutrition', ['client' => 'desktop', 'tab' => 'foods', 'foodPage' => 999])->assertOk()->assertJsonCount(6, 'foods')->assertJsonPath('foodPagination.page', 3)->assertJsonPath('foodPagination.from', 51)->json();
        $this->data('nutrition', ['client' => 'desktop', 'tab' => 'foods', 'search' => '056'])->assertOk()->assertJsonCount(1, 'foods')->assertJsonPath('foodPagination.total', 1);
        $versions = $this->data('nutrition', ['client' => 'desktop', 'tab' => 'versions', 'foodId' => $foods[55]['id'], 'search' => '001'])->assertOk()->assertJsonPath('selectedFood.name', 'Synthetic food 056')->assertJsonCount(1, 'versions')->json();
        $day = $this->data('nutrition', ['client' => 'desktop', 'tab' => 'day'])->assertOk()->assertJsonCount(56, 'foods')->json();
        $this->data('nutrition', ['tab' => 'foods'])->assertOk()->assertJsonCount(56, 'foods')->assertJsonPath('pageSize', 100);
        $this->data('nutrition', ['client' => 'desktop', 'foodPage' => 0])->assertUnprocessable();
        if ($output = getenv('PROTEUS_LIFE_API_FIXTURE')) {
            if (! str_starts_with($output, '/private/tmp/proteus-')) {
                throw new \RuntimeException('Use a disposable fixture path.');
            }
            $projection = ['client' => 'desktop', 'projection' => 'tab'];
            $first = $this->data('nutrition', $projection + ['tab' => 'foods', 'foodPage' => 1])->assertOk()->json();
            $second = $this->data('nutrition', $projection + ['tab' => 'foods', 'foodPage' => 2])->assertOk()->json();
            $last = $this->data('nutrition', $projection + ['tab' => 'foods', 'foodPage' => 3])->assertOk()->json();
            $search = $this->data('nutrition', $projection + ['tab' => 'foods', 'search' => '056'])->assertOk()->json();
            $empty = $this->data('nutrition', $projection + ['tab' => 'foods', 'search' => 'absent'])->assertOk()->json();
            $versions = $this->data('nutrition', $projection + ['tab' => 'versions', 'foodId' => $foods[55]['id']])->assertOk()->json();
            $day = $this->data('nutrition', $projection + ['tab' => 'day'])->assertOk()->json();
            $sections = [];
            foreach (['overview', 'garage', 'fuel', 'captures', 'security', 'connections'] as $section) {
                $sections[$section] = $this->data($section, ['client' => 'desktop'])->assertOk()->json();
            }
            file_put_contents($output, json_encode(compact('profile', 'first', 'second', 'last', 'search', 'empty', 'versions', 'day', 'sections'), JSON_THROW_ON_ERROR));
            chmod($output, 0600);
        }
    }

    public function test_projected_nutrition_reads_preserve_aggregates_and_literal_search(): void
    {
        $this->travelTo(Carbon::parse('2026-10-22T12:00:00Z'));
        $user = $this->owner();
        $profile = $this->login($user);
        $food = $this->food($profile, '100% food_!');
        $this->food($profile, '1000 foodA');
        foreach (['breakfast', 'lunch', 'dinner', 'snack', 'snack'] as $meal) {
            $this->change($profile, 'meal.log', ['food_id' => $food['id'], 'date' => '2026-10-22', 'meal' => $meal, 'qty' => 1])->assertOk();
        }
        $legacy = $this->data('nutrition', ['client' => 'desktop'])->assertOk()->json();
        $days = $this->data('nutrition', ['client' => 'desktop', 'tab' => 'days', 'projection' => 'tab'])->assertOk()->assertJsonCount(4, 'days.0.foodNames')->assertJsonPath('days.0.complete', true)->assertJsonPath('foods', [])->assertJsonPath('entries', [])->json();
        $this->assertSame($legacy['days'], $days['days']);
        $this->assertSame($legacy['averages'], $days['averages']);
        $this->data('nutrition', ['client' => 'desktop', 'tab' => 'foods', 'projection' => 'tab', 'search' => '%'])->assertOk()->assertJsonCount(1, 'foods')->assertJsonPath('foods.0.name', '100% food_!')->assertJsonPath('days', []);
        $this->data('nutrition', ['client' => 'desktop', 'tab' => 'day', 'projection' => 'tab', 'date' => '2026-10-22'])->assertOk()->assertJsonCount(5, 'entries')->assertJsonCount(2, 'foods')->assertJsonPath('days', []);
        $this->data('overview')->assertOk()->assertJsonPath('nutrition.entryCount', 5)->assertJsonPath('nutrition.calories', 500)->assertJsonPath('counts.foods', 2);
        $this->data('nutrition', ['tab' => 'averages', 'projection' => 'tab'])->assertOk()->assertJsonPath('monthly.0.entryCount', 5)->assertJsonPath('monthly.0.caloriesTotal', 500);
    }

    public function test_food_search_preserves_unicode_case_and_complete_versions_are_not_paged(): void
    {
        $user = $this->owner();
        $profile = $this->login($user);
        $food = $this->food($profile, 'Éclair 100%');
        $this->food($profile, 'Eclair 1000');
        $this->data('nutrition', ['tab' => 'foods', 'search' => 'éCLAIR 100%'])->assertOk()->assertJsonCount(1, 'foods')->assertJsonPath('foods.0.id', $food['id']);
        $version = (array) DB::table('food_versions')->where('food_id', $food['id'])->first();
        unset($version['id']);
        DB::table('food_versions')->insert(array_fill(0, 100, $version));
        foreach ([[], ['client' => 'desktop', 'projection' => 'tab']] as $query) {
            $this->data('nutrition', $query + ['tab' => 'versions', 'foodId' => $food['id']])->assertOk()->assertJsonCount(101, 'versions')->assertJsonPath('hasMore', false);
        }
    }
}

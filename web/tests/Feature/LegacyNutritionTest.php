<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\MealEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\CreatesBrain;
use Tests\TestCase;

class LegacyNutritionTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['brain.legacy_host' => 'food.example.test']);
    }

    private function legacy(): User
    {
        $user = $this->owner();
        config(['brain.legacy_owner_email' => $user->email, 'brain.legacy_key_hashes' => [hash('sha256', 'legacy-test-key')]]);
        $this->withHeader('x-api-key', 'legacy-test-key');

        return $user;
    }

    public function test_legacy_key_cannot_authorize_new_api_and_must_be_valid(): void
    {
        $this->getJson('http://food.example.test/health')->assertUnauthorized();
        $this->legacy();
        $this->getJson('http://food.example.test/health')->assertJson(['status' => 'ok']);
        $this->getJson(config('app.url').'/api/v1/vehicles')->assertUnauthorized();
        $this->getJson('http://food.example.test/api/v1/vehicles')->assertNotFound();
    }

    public function test_legacy_food_and_meal_routes_preserve_contracts(): void
    {
        $this->legacy();
        $this->postJson('http://food.example.test/foods', ['name' => 'Egg', 'serving' => '1 egg', 'calories' => 70, 'protein_g' => 6, 'carbs_g' => 1, 'fat_g' => 5, 'source_type' => 'label'])->assertOk()->assertJsonPath('protein_g', 6);
        $food = Food::first();
        $this->postJson('http://food.example.test/mealentries', ['food_name' => 'Egg', 'entry_date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 2, 'unit' => 'egg'])->assertOk()->assertJsonPath('food_id', $food->id);
        $this->getJson('http://food.example.test/summary/daily?entry_date=2026-09-01')->assertJsonPath('calories', 140);
        $this->patchJson('http://food.example.test/foods/'.$food->id, ['calories' => 80])->assertOk();
        $this->getJson('http://food.example.test/summary/daily?entry_date=2026-09-01')->assertJsonPath('calories', 140);
        $this->getJson('http://food.example.test/meal_entries?entry_date=2026-09-01')->assertJsonPath('count', 1);
        $this->deleteJson('http://food.example.test/mealentries/'.MealEntry::first()->id)->assertJsonPath('status', 'deleted');
        $this->assertSoftDeleted('meal_entries', ['id' => 1]);
    }

    public function test_import_preserves_current_legacy_totals_and_all_versions(): void
    {
        $user = $this->owner();
        $path = tempnam(sys_get_temp_dir(), 'brain-import-test-');
        $snapshot = ['foods' => [['id' => 7, 'name' => 'Test food', 'serving' => '1 cup', 'current_version_id' => 12, 'created_at' => '2026-02-01 12:00:00']], 'food_versions' => [], 'meal_entries' => [['id' => 25, 'food_id' => 7, 'entry_date' => '2026-02-02', 'meal' => 'lunch', 'qty' => 2, 'unit' => 'cup', 'note' => 'Original note', 'created_at' => '2026-02-02 12:00:00']]];
        foreach ([11 => 100, 12 => 150] as $id => $cal) {
            $snapshot['food_versions'][] = ['id' => $id, 'food_id' => 7, 'calories' => $cal, 'protein_g' => 5, 'carbs_g' => 10, 'fat_g' => 3, 'source_type' => 'label', 'source_note' => null, 'is_estimate' => false, 'created_at' => '2026-02-01 12:00:00'];
        }
        file_put_contents($path, json_encode($snapshot));
        try {
            $this->artisan('brain:import-nutrition', ['email' => $user->email, 'snapshot' => $path])->assertExitCode(0);
            $this->artisan('brain:import-nutrition', ['email' => $user->email, 'snapshot' => $path])->assertExitCode(0);
            $this->assertDatabaseCount('food_versions', 2);
            $this->assertDatabaseCount('meal_entries', 1);
            $meal = MealEntry::first();
            $this->assertTrue($meal->migration_baseline);
            $this->assertSame(300.0, (float) $meal->qty * (float) $meal->version->calories);
        } finally {
            unlink($path);
        }
    }
}

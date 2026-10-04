<?php

namespace Tests\Feature;

use App\Models\AuditEvent;
use App\Models\Food;
use App\Models\FoodVersion;
use App\Models\MealEntry;
use App\Models\Membership;
use App\Services\NutritionLedger;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class NutritionMcpTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    public function test_mcp_exposes_complete_day_averages_with_snacks_and_excludes_partial_days(): void
    {
        $user = $this->owner();
        $food = Food::factory()->create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'name' => 'Oats', 'serving' => '1 cup']);
        $version = FoodVersion::factory()->create(['food_id' => $food->id, 'calories' => 100, 'protein' => 10, 'carbs' => 20, 'fat' => 5]);
        foreach (['breakfast', 'lunch', 'dinner', 'snack'] as $meal) {
            MealEntry::factory()->create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'food_version_id' => $version->id, 'date' => '2026-09-01', 'meal' => $meal, 'qty' => 1, 'unit' => '1 cup']);
        }
        MealEntry::factory()->create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'food_version_id' => $version->id, 'date' => '2026-09-02', 'meal' => 'breakfast', 'qty' => 30, 'unit' => '1 cup']);
        Passport::actingAs($user, ['mcp:use']);

        $response = $this->postJson('/mcp', $this->averagesCall());

        $response->assertOk();
        $result = json_decode($response->json('result.content.0.text'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame(1, $result['complete_days']);
        $this->assertSame(2, $result['excluded_calendar_days']);
        $this->assertSame(4, $result['included_entry_count']);
        $this->assertSame(['calories' => 400, 'protein' => 40, 'carbs' => 80, 'fat' => 20], $result['averages']);
        $this->postJson('/mcp', ['jsonrpc' => '2.0', 'id' => 2, 'method' => 'tools/list'])->assertSee('nutrition-averages');
    }

    public function test_mcp_averages_do_not_read_another_household_members_days(): void
    {
        $owner = $this->owner();
        $other = $this->owner();
        Membership::create(['workspace_id' => $owner->current_workspace_id, 'user_id' => $other->id, 'role' => 'owner']);
        $other->forceFill(['current_workspace_id' => $owner->current_workspace_id])->save();
        $food = Food::factory()->create(['workspace_id' => $owner->current_workspace_id, 'user_id' => $owner->id, 'name' => 'Private oats', 'serving' => '1 cup']);
        $version = FoodVersion::factory()->create(['food_id' => $food->id, 'calories' => 100, 'protein' => 10, 'carbs' => 20, 'fat' => 5]);
        foreach (['breakfast', 'lunch', 'dinner'] as $meal) {
            MealEntry::factory()->create(['workspace_id' => $owner->current_workspace_id, 'user_id' => $owner->id, 'food_version_id' => $version->id, 'date' => '2026-09-01', 'meal' => $meal, 'qty' => 1, 'unit' => '1 cup']);
        }
        Passport::actingAs($other, ['mcp:use']);

        $response = $this->postJson('/mcp', $this->averagesCall());

        $response->assertOk();
        $result = json_decode($response->json('result.content.0.text'), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame(0, $result['complete_days']);
        $this->assertSame(3, $result['excluded_calendar_days']);
        $this->assertSame(['calories' => null, 'protein' => null, 'carbs' => null, 'fat' => null], $result['averages']);
    }

    public function test_mcp_rejects_reversed_average_dates_and_tokens_without_its_scope(): void
    {
        $user = $this->owner();
        Passport::actingAs($user, []);
        $this->postJson('/mcp', $this->averagesCall())->assertForbidden();
        Passport::actingAs($user, ['mcp:use']);
        $call = $this->averagesCall();
        $call['params']['arguments']['end_date'] = '2026-08-31';

        $this->postJson('/mcp', $call)->assertJsonPath('result.isError', true)->assertSee('end date');
    }

    public function test_corrections_preserve_historical_nutrition_audit_changes_and_soft_delete_idempotently(): void
    {
        $user = $this->owner();
        $ledger = app(NutritionLedger::class);
        $food = $ledger->saveFood($user, ['name' => 'Eggs', 'serving' => '1 egg', 'calories' => 70, 'protein' => 6, 'carbs' => 0, 'fat' => 5]);
        $meal = $ledger->logMeal($user, ['food_id' => $food->id, 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1, 'idempotency_key' => 'correction-test']);
        $originalVersion = $meal->food_version_id;
        $ledger->saveFood($user, ['name' => 'Eggs', 'serving' => '1 egg', 'calories' => 80, 'protein' => 7, 'carbs' => 0, 'fat' => 6]);
        Passport::actingAs($user, ['mcp:use']);
        $call = ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => 'correct-meal', 'arguments' => ['action' => 'update', 'entry_id' => $meal->id, 'qty' => 2]]];

        $this->postJson('/mcp', $call)->assertOk()->assertJsonPath('result.isError', false);
        $this->assertEquals(2, $meal->fresh()->qty);
        $this->assertSame($originalVersion, $meal->fresh()->food_version_id);
        $event = AuditEvent::where('action', 'meal.updated')->sole();
        $this->assertEquals(1, $event->details['before']['qty']);
        $this->assertEquals(2, $event->details['after']['qty']);
        $this->postJson('/mcp', $call)->assertOk();
        $this->assertSame(1, AuditEvent::where('action', 'meal.updated')->count());
        $call['params']['arguments'] = ['action' => 'delete', 'entry_id' => $meal->id];
        $this->postJson('/mcp', $call)->assertOk()->assertSee('deleted');
        $this->postJson('/mcp', $call)->assertOk();
        $this->assertSoftDeleted($meal);
        $this->assertSame(1, AuditEvent::where('action', 'meal.deleted')->count());
        $this->assertTrue($ledger->logMeal($user, ['food_id' => $food->id, 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1, 'idempotency_key' => 'correction-test'])->trashed());
    }

    public function test_corrections_cannot_touch_other_users_or_use_their_foods_and_require_edit_permission(): void
    {
        $owner = $this->owner();
        $other = $this->owner();
        Membership::create(['workspace_id' => $owner->current_workspace_id, 'user_id' => $other->id, 'role' => 'owner']);
        $other->forceFill(['current_workspace_id' => $owner->current_workspace_id])->save();
        $ledger = app(NutritionLedger::class);
        $food = $ledger->saveFood($owner, ['name' => 'Private eggs', 'serving' => '1 egg', 'calories' => 70, 'protein' => 6, 'carbs' => 0, 'fat' => 5]);
        $otherFood = $ledger->saveFood($other, ['name' => 'Other eggs', 'serving' => '1 egg', 'calories' => 80, 'protein' => 7, 'carbs' => 0, 'fat' => 6]);
        $meal = $ledger->logMeal($owner, ['food_id' => $food->id, 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1, 'idempotency_key' => 'private-correction']);
        $call = ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => 'correct-meal', 'arguments' => ['action' => 'delete', 'entry_id' => $meal->id]]];
        Passport::actingAs($other, ['mcp:use']);
        $this->postJson('/mcp', $call)->assertJsonPath('result.isError', true);
        Passport::actingAs($owner, ['mcp:use']);
        $call['params']['arguments'] = ['action' => 'update', 'entry_id' => $meal->id, 'food_id' => $otherFood->id];
        $this->postJson('/mcp', $call)->assertJsonPath('result.isError', true);
        Membership::where('workspace_id', $owner->current_workspace_id)->where('user_id', $owner->id)->update(['role' => 'viewer']);
        $this->postJson('/mcp', $call)->assertJsonPath('result.isError', true);
        $this->assertFalse($meal->fresh()->trashed());
        $this->assertSame($food->current_version_id, $meal->fresh()->food_version_id);
    }

    private function averagesCall(): array
    {
        return ['jsonrpc' => '2.0', 'id' => 1, 'method' => 'tools/call', 'params' => ['name' => 'nutrition-averages', 'arguments' => ['start_date' => '2026-09-01', 'end_date' => '2026-09-03']]];
    }
}

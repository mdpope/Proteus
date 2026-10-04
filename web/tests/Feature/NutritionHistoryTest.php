<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\FoodVersion;
use App\Models\MealEntry;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\CreatesBrain;
use Tests\TestCase;

class NutritionHistoryTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    public function test_history_paginates_recorded_days_instead_of_individual_meals(): void
    {
        $user = $this->owner();
        $food = $this->foodFor($user, 'Oats', 100);
        for ($day = 1; $day <= 16; $day++) {
            $this->entryFor($user, $food, sprintf('2026-09-%02d', $day));
        }
        $this->entryFor($user, $food, '2026-09-16', 2);
        $this->entryFor($user, $food, '2026-09-18')->delete();
        $response = $this->signedIn($user)->get('/nutrition');
        $response->assertSee('Sep 16, 2026')->assertDontSee('Sep 1, 2026')->assertDontSee('Sep 18, 2026');
        $days = $response->viewData('days');
        $this->assertSame(16, $days->total());
        $this->assertSame(15, $days->count());
        $this->assertSame(300.0, (float) $days->first()->calories);
        $this->get('/nutrition?tab=days&page=2')->assertSee('Sep 1, 2026')->assertDontSee('Sep 2, 2026');
    }

    public function test_averages_weight_days_equally_and_preserve_recorded_food_versions(): void
    {
        $this->travelTo(now()->setDate(2026, 9, 30)->startOfDay());
        $user = $this->owner();
        $food = $this->foodFor($user, 'Breakfast', 100);
        $this->entryFor($user, $food, '2026-09-01');
        $this->entryFor($user, $food, '2026-09-01', 1, 'lunch');
        $this->entryFor($user, $food, '2026-09-01', 1, 'dinner');
        $this->entryFor($user, $food, '2026-09-01', 1, 'snack');
        $this->entryFor($user, $food, '2026-09-03');
        $this->entryFor($user, $food, '2026-09-03', 0.5, 'lunch');
        $this->entryFor($user, $food, '2026-09-03', 0.5, 'dinner');
        foreach (['breakfast', 'lunch', 'dinner'] as $meal) {
            $this->entryFor($user, $food, '2026-08-31', 3, $meal);
        }
        $this->entryFor($user, $food, '2026-09-02', 50);
        $this->entryFor($user, $food, '2026-09-02', 10, 'lunch');
        $this->entryFor($user, $food, '2026-09-02', 2, 'snack');
        $this->entryFor($user, $food, '2026-09-04');
        $this->entryFor($user, $food, '2026-09-04', 1, 'lunch');
        $this->entryFor($user, $food, '2026-09-04', 1, 'dinner')->delete();
        $new = FoodVersion::factory()->create(['food_id' => $food->id, 'calories' => 999, 'protein' => 99, 'carbs' => 99, 'fat' => 99]);
        $food->update(['current_version_id' => $new->id]);
        $response = $this->signedIn($user)->get('/nutrition?tab=averages');
        $response->assertSee('Monthly averages')->assertSee('September 2026')->assertSee('breakfast, lunch, and dinner')->assertSee('Complete days');
        $period = $response->viewData('periods')['This month'];
        $this->assertSame(2, (int) $period['complete_days']);
        $this->assertSame(300.0, (float) $period['calories']);
        $this->assertSame(30.0, (float) $period['protein']);
        $this->assertSame(60.0, (float) $period['carbs']);
        $this->assertSame(15.0, (float) $period['fat']);
        $this->assertSame(2, (int) $response->viewData('periods')['Last 30 calendar days']['complete_days']);
        $this->assertSame(3, (int) $response->viewData('periods')['All complete days']['complete_days']);
        $this->assertSame(500.0, (float) $response->viewData('periods')['All complete days']['calories']);
        $month = $response->viewData('months')->first();
        $this->assertSame('2026-09', $month->month);
        $this->assertSame(600.0, (float) $month->calories_total);
        $this->assertSame(300.0, (float) $month->calories);
        $this->assertSame(2, (int) $month->complete_days);

        $history = $this->get('/nutrition?tab=days');
        $history->assertSee('15 food entries')->assertSee('Across all 3 complete days');
        $this->assertSame(5, $history->viewData('days')->total());
        $this->assertSame(500.0, (float) $history->viewData('summary')['calories']);
    }

    public function test_each_history_tab_keeps_household_members_records_private(): void
    {
        $a = $this->owner();
        $b = $this->owner();
        Membership::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $b->id, 'role' => 'owner']);
        $b->forceFill(['current_workspace_id' => $a->current_workspace_id])->save();
        $food = $this->foodFor($a, 'Private household food', 9876);
        $this->entryFor($a, $food, '2026-09-15');
        $this->entryFor($a, $food, '2026-09-15', 1, 'lunch');
        $this->entryFor($a, $food, '2026-09-15', 1, 'dinner');
        $otherFood = $this->foodFor($b, 'Own snack', 100);
        $this->entryFor($b, $otherFood, '2026-09-15', 1, 'snack');
        $this->signedIn($b);
        foreach (['days', 'day', 'averages', 'foods'] as $tab) {
            $this->get('/nutrition?tab='.$tab.'&date=2026-09-15')->assertDontSee('Private household food')->assertDontSee('9,876');
        }
        $this->get('/nutrition?tab=averages')->assertViewHas('periods', fn ($periods) => (int) $periods['All complete days']['complete_days'] === 0);
    }

    public function test_partial_days_do_not_produce_averages_but_remain_in_history(): void
    {
        $user = $this->owner();
        $food = $this->foodFor($user, 'Oats', 100);
        foreach (['breakfast', 'breakfast', 'lunch', 'snack'] as $meal) {
            $this->entryFor($user, $food, '2026-09-01', 1, $meal);
        }

        $response = $this->signedIn($user)->get('/nutrition?tab=averages');

        $response->assertSee('Monthly averages will appear after you record a complete day.');
        $period = $response->viewData('periods')['All complete days'];
        $this->assertSame(0, (int) $period['complete_days']);
        $this->assertNull($period['calories']);
        $this->assertSame(0, $response->viewData('months')->total());
        $this->get('/nutrition?tab=days')->assertSee('Sep 1, 2026')->assertSee('4 food entries')->assertDontSee('Daily averages');
    }

    public function test_an_explicit_skipped_meal_completes_a_day_like_the_legacy_api(): void
    {
        $user = $this->owner();
        $food = $this->foodFor($user, 'Oats', 100);
        $skipped = $this->foodFor($user, 'Skipped Meal', 0);
        $skipped->currentVersion->update(['protein' => 0, 'carbs' => 0, 'fat' => 0]);
        $this->entryFor($user, $food, '2026-09-01', 1, 'Breakfast');
        $this->entryFor($user, $food, '2026-09-01', 2, 'lunch');
        $this->entryFor($user, $skipped, '2026-09-01', 1, 'Dinner');
        $this->entryFor($user, $food, '2026-09-01', 0.5, 'snack');
        config(['brain.legacy_host' => 'food.example.test', 'brain.legacy_owner_email' => $user->email, 'brain.legacy_key_hashes' => [hash('sha256', 'legacy-test-key')]]);

        $response = $this->signedIn($user)->get('/nutrition?tab=averages');

        $period = $response->viewData('periods')['All complete days'];
        $this->assertSame(1, (int) $period['complete_days']);
        $this->assertSame(350.0, (float) $period['calories']);
        $this->assertSame(35.0, (float) $period['protein']);
        $this->withHeader('x-api-key', 'legacy-test-key')
            ->getJson('http://food.example.test/summary/qualified-averages?start_date=2026-09-01&end_date=2026-09-02')
            ->assertJsonPath('included_days_count', 1)->assertJsonPath('avg_calories', 350)->assertJsonPath('avg_protein_g', 35);
    }

    public function test_food_library_is_searchable_and_escapes_food_names(): void
    {
        $user = $this->owner();
        $this->foodFor($user, '<script>Oats</script>', 100);
        $this->foodFor($user, 'Rice', 200);
        $this->signedIn($user)->get('/nutrition?tab=foods&search=Oats')
            ->assertSee('&lt;script&gt;Oats&lt;/script&gt;', false)->assertDontSee('<script>Oats</script>', false)->assertDontSee('Rice');
    }

    public function test_custom_range_filters_history_and_months_without_redefining_standard_periods(): void
    {
        $this->travelTo(now('America/Boise')->setDate(2026, 9, 30)->setTime(12, 0));
        $user = $this->owner();
        $food = $this->foodFor($user, 'Range fixture', 100);
        foreach (['2026-08-31', '2026-09-01', '2026-09-30'] as $date) {
            foreach (['breakfast', 'lunch', 'dinner'] as $meal) $this->entryFor($user, $food, $date, 1, $meal);
        }
        $this->entryFor($user, $food, '2026-09-02', 50);
        $response = $this->signedIn($user)->get('/nutrition?tab=averages&from=2026-09-30&through=2026-09-30');
        $response->assertOk()->assertSee('Selected range');
        $this->assertSame(1, (int) $response->viewData('selectedRange')['complete_days']);
        $this->assertSame(300.0, (float) $response->viewData('selectedRange')['calories']);
        $this->assertSame(2, (int) $response->viewData('periods')['This month']['complete_days']);
        $this->assertSame(3, (int) $response->viewData('periods')['All complete days']['complete_days']);
        $this->assertSame(1, (int) $response->viewData('months')->first()->complete_days);
        $days = $this->get('/nutrition?tab=days&from=2026-09-30&through=2026-09-30');
        $days->assertOk()->assertSee('Sep 30, 2026')->assertDontSee('Aug 31, 2026');
        $this->assertSame(1, $days->viewData('days')->total());
        $this->assertSame(3, $days->viewData('entryCount'));
        $this->get('/nutrition?tab=averages&from=2026-09-30&through=2026-09-01')->assertSessionHasErrors('through');
        $this->get('/nutrition?tab=averages&from=2026-02-30')->assertSessionHasErrors('from');
    }

    private function foodFor(User $user, string $name, float $calories): Food
    {
        $food = Food::factory()->create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'name' => $name, 'serving' => '1 serving']);
        $version = FoodVersion::factory()->create(['food_id' => $food->id, 'calories' => $calories, 'protein' => 10, 'carbs' => 20, 'fat' => 5]);
        $food->update(['current_version_id' => $version->id]);

        return $food;
    }

    private function entryFor(User $user, Food $food, string $date, float $qty = 1, string $meal = 'breakfast'): MealEntry
    {
        return MealEntry::factory()->create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'food_version_id' => $food->current_version_id, 'date' => $date, 'meal' => $meal, 'qty' => $qty, 'unit' => '1 serving']);
    }
}

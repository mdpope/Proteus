<?php

namespace Tests\Feature;

use App\Models\Food;
use App\Models\MealEntry;
use App\Models\Membership;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Tests\CreatesBrain;
use Tests\TestCase;

class NutritionTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    public function test_old_meals_keep_nutrition_when_food_changes(): void
    {
        $user = $this->owner();
        $this->signedIn($user);
        $food = ['name' => 'Oats', 'serving' => '1 cup', 'calories' => 300, 'protein' => 10, 'carbs' => 50, 'fat' => 5];
        $this->post('/nutrition/foods', $food)->assertRedirect();
        $id = Food::first()->id;
        $this->post('/nutrition/meals', ['food_id' => $id, 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 2, 'idempotency_key' => 'meal-1'])->assertRedirect();
        $food['calories'] = 400;
        $this->post('/nutrition/foods', $food)->assertRedirect();
        $this->assertSame('300.000', number_format((float) MealEntry::first()->version->calories, 3, '.', ''));
        $this->get('/nutrition?date=2026-09-01')->assertSee('600');
    }

    public function test_household_members_do_not_see_each_others_nutrition(): void
    {
        $a = $this->owner();
        $b = $this->owner();
        Membership::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $b->id, 'role' => 'owner']);
        $b->forceFill(['current_workspace_id' => $a->current_workspace_id])->save();
        $this->signedIn($a)->post('/nutrition/foods', ['name' => 'Private meal', 'serving' => '1', 'calories' => 400, 'protein' => 20, 'carbs' => 30, 'fat' => 10]);
        $food = Food::first();
        $this->signedIn($b)->get('/nutrition')->assertDontSee('Private meal');
        $this->post('/nutrition/meals', ['food_id' => $food->id, 'date' => '2026-09-01', 'meal' => 'breakfast', 'qty' => 1, 'idempotency_key' => 'meal-other'])->assertNotFound();
    }
}

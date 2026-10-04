<?php

namespace App\Mcp\Tools;

use App\Models\Food;
use App\Services\NutritionLedger;
use App\Services\TenantAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[IsDestructive(false)]
class ManageNutrition extends Tool
{
    protected string $description = 'Search your own food library, save food nutrition per serving, or log a meal. Actions: list_foods, save_food, log_meal. For save_food provide name, serving, calories, protein, fat, carbs; document source and flag estimates. For log_meal provide food_id, date YYYY-MM-DD, meal, qty, idempotency_key. Reuse that key for retries. Saving a food makes a new version when values differ; existing meals keep their version.';

    public function schema(JsonSchema $s): array
    {
        $schema = ['action' => $s->string()->enum(['list_foods', 'save_food', 'log_meal'])->required()];
        foreach (['query', 'name', 'serving', 'source_type', 'source_note', 'date', 'meal', 'unit', 'note', 'idempotency_key'] as $k) {
            $schema[$k] = $s->string();
        }
        foreach (['calories', 'protein', 'fat', 'carbs', 'qty'] as $k) {
            $schema[$k] = $s->number();
        }
        $schema['food_id'] = $s->integer();
        $schema['is_estimate'] = $s->boolean();

        return $schema;
    }

    public function handle(Request $request, TenantAccess $access, NutritionLedger $ledger): Response
    {
        $v = $request->validate(['action' => 'required|in:list_foods,save_food,log_meal', 'query' => 'sometimes|string|max:200']);
        if ($v['action'] === 'list_foods') {
            return Response::json(['foods' => Food::where('workspace_id', $access->workspace($request->user(), 'nutrition.read'))->where('user_id', $request->user()->id)->when($v['query'] ?? null, fn ($q, $value) => $q->where('name', 'like', '%'.$value.'%'))->with('currentVersion')->orderBy('name')->limit(50)->get()->toArray()]);
        }
        if ($v['action'] === 'save_food') {
            return Response::json(['food' => $ledger->saveFood($request->user(), $request->all())->toArray()]);
        }

        return Response::json(['meal' => $ledger->logMeal($request->user(), $request->all())->toArray()]);
    }
}

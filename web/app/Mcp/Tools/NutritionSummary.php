<?php

namespace App\Mcp\Tools;

use App\Models\MealEntry;
use App\Services\TenantAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
class NutritionSummary extends Tool
{
    protected string $description = 'Read your own nutrition log and totals for one date. Household membership never grants access to someone else’s nutrition.';

    public function schema(JsonSchema $schema): array
    {
        return ['date' => $schema->string()->description('YYYY-MM-DD')->required()];
    }

    public function handle(Request $request, TenantAccess $access): Response
    {
        $v = $request->validate(['date' => 'required|date_format:Y-m-d']);
        $workspace = $access->workspace($request->user(), 'nutrition.read');
        $entries = MealEntry::where('workspace_id', $workspace)->where('user_id', $request->user()->id)->whereDate('date', $v['date'])->with('version.food')->get();
        $totals = [];
        foreach (['calories', 'protein', 'fat', 'carbs'] as $key) {
            $totals[$key] = round($entries->sum(fn ($m) => $m->qty * $m->version->$key), 2);
        }

        return Response::json(['date' => $v['date'], 'totals' => $totals, 'entries' => $entries->map(fn ($m) => ['id' => $m->id, 'food' => $m->version->food->name, 'qty' => $m->qty, 'unit' => $m->unit, 'meal' => $m->meal, 'note' => $m->note, 'nutrition' => $m->version->only(['calories', 'protein', 'fat', 'carbs']), 'migration_baseline' => $m->migration_baseline])->all()]);
    }
}

<?php

namespace App\Mcp\Tools;

use App\Services\NutritionLedger;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsDestructive;

#[IsDestructive]
class CorrectMeal extends Tool
{
    protected string $description = 'Correct or soft-delete one of your own meal entries after reading nutrition-summary and identifying the exact entry ID. Update only supplied fields. Quantities use servings; unit is a label, not a conversion. Changing food_id explicitly selects that food’s current nutrition; other edits preserve historical nutrition. After a correction, read the affected dates again for updated totals. Use only for a user-requested correction or deletion.';

    public function schema(JsonSchema $schema): array
    {
        return [
            'action' => $schema->string()->enum(['update', 'delete'])->required(),
            'entry_id' => $schema->integer()->required(),
            'food_id' => $schema->integer(),
            'date' => $schema->string()->description('YYYY-MM-DD'),
            'meal' => $schema->string()->enum(['breakfast', 'lunch', 'dinner', 'snack']),
            'qty' => $schema->number(),
            'unit' => $schema->string(),
            'note' => $schema->string(),
        ];
    }

    public function handle(Request $request, NutritionLedger $ledger): Response
    {
        $values = $request->validate(['action' => 'required|in:update,delete', 'entry_id' => 'required|integer|min:1']);
        $entry = $ledger->correctMeal($request->user(), $values['entry_id'], $values['action'], $request->all());

        return Response::json(['status' => $entry->trashed() ? 'deleted' : 'saved', 'entry' => $entry->toArray()]);
    }
}

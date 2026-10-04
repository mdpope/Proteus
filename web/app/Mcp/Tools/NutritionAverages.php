<?php

namespace App\Mcp\Tools;

use App\Services\NutritionReport;
use App\Services\TenantAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Illuminate\Support\Carbon;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
class NutritionAverages extends Tool
{
    protected string $description = 'Read your own average daily calories, protein, carbs and fat over an inclusive date range. Use for weekly, monthly, yearly or other date-range averages. Only complete days with breakfast, lunch and dinner recorded qualify; explicit skipped-meal entries qualify and snacks are included. Partial and unlogged days are excluded. This is the same calculation as the Proteus website. Never report a missing average as zero intake.';

    public function schema(JsonSchema $schema): array
    {
        return [
            'start_date' => $schema->string()->description('First date, inclusive, YYYY-MM-DD.')->required(),
            'end_date' => $schema->string()->description('Last date, inclusive, YYYY-MM-DD; on or after start_date.')->required(),
        ];
    }

    public function handle(Request $request, TenantAccess $access, NutritionReport $report): Response
    {
        $v = $request->validate([
            'start_date' => 'required|date_format:Y-m-d',
            'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date',
        ]);
        $workspace = $access->workspace($request->user(), 'nutrition.read');
        $summary = $report->summary($workspace, $request->user()->id, $v['start_date'], $v['end_date']);
        $calendarDays = (int) Carbon::parse($v['start_date'])->diffInDays(Carbon::parse($v['end_date'])) + 1;
        $averages = [];
        foreach (['calories', 'protein', 'carbs', 'fat'] as $macro) {
            $averages[$macro] = $summary[$macro] === null ? null : round((float) $summary[$macro], 2);
        }

        return Response::json($v + [
            'complete_days' => (int) $summary['complete_days'],
            'excluded_calendar_days' => $calendarDays - (int) $summary['complete_days'],
            'included_entry_count' => (int) $summary['entry_count'],
            'averages' => $averages,
            'units' => ['calories' => 'kcal/day', 'protein' => 'g/day', 'carbs' => 'g/day', 'fat' => 'g/day'],
            'rule' => 'Breakfast, lunch and dinner must each be recorded. Explicit skipped-meal entries count; snacks are included. Partial and unlogged days are excluded.',
            'url' => route('nutrition', ['tab' => 'averages']),
        ]);
    }
}

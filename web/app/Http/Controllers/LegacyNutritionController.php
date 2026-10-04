<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\Food;
use App\Models\MealEntry;
use App\Services\NutritionLedger;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class LegacyNutritionController extends Controller
{
    private function foodsQuery(Request $r): Builder
    {
        return Food::where('user_id', $r->user()->id)->where('workspace_id', $r->user()->current_workspace_id);
    }

    private function mealsQuery(Request $r): Builder
    {
        return MealEntry::where('user_id', $r->user()->id)->where('workspace_id', $r->user()->current_workspace_id);
    }

    private function foodOut(Food $f): array
    {
        $v = $f->currentVersion;

        return ['id' => $f->id, 'name' => $f->name, 'serving' => $f->serving, 'calories' => (float) $v->calories, 'protein_g' => (float) $v->protein, 'fat_g' => (float) $v->fat, 'carbs_g' => (float) $v->carbs, 'source_type' => $v->source_type, 'source_note' => $v->source_note, 'is_estimate' => $v->is_estimate];
    }

    private function mealOut(MealEntry $m): array
    {
        return ['id' => $m->id, 'entry_date' => $m->date->toDateString(), 'meal' => $m->meal, 'food_id' => $m->version->food_id, 'food_name' => $m->version->food->name, 'qty' => (float) $m->qty, 'unit' => $m->unit, 'note' => $m->note];
    }

    private function foodInput(array $v): array
    {
        foreach (['protein', 'carbs', 'fat'] as $k) {
            if (array_key_exists($k.'_g', $v)) {
                $v[$k] = $v[$k.'_g'];
                unset($v[$k.'_g']);
            }
        }

        return $v;
    }

    public function foods(Request $r): JsonResponse
    {
        return response()->json($this->foodsQuery($r)->with('currentVersion')->get()->map(fn ($f) => $this->foodOut($f)));
    }

    public function createFood(Request $r, NutritionLedger $ledger): JsonResponse
    {
        abort_if($this->foodsQuery($r)->where('name', $r->input('name'))->exists(), 409, 'Food already exists.');

        return response()->json($this->foodOut($ledger->saveFood($r->user(), $this->foodInput($r->all()))));
    }

    public function updateFood(Request $r, int $id, NutritionLedger $ledger): JsonResponse
    {
        $food = $this->foodsQuery($r)->with('currentVersion')->findOrFail($id);
        $v = $r->validate(['name' => 'sometimes|string|max:200', 'serving' => 'sometimes|string|max:200', 'calories' => 'sometimes|numeric|min:0|max:100000', 'protein_g' => 'sometimes|numeric|min:0|max:10000', 'carbs_g' => 'sometimes|numeric|min:0|max:10000', 'fat_g' => 'sometimes|numeric|min:0|max:10000', 'source_type' => 'sometimes|string|max:64', 'source_note' => 'nullable|string|max:5000', 'is_estimate' => 'sometimes|boolean']);
        $result = DB::transaction(function () use ($r, $food, $v, $ledger) {
            if (isset($v['name']) && $v['name'] !== $food->name) {
                abort_if($this->foodsQuery($r)->where('name', $v['name'])->exists(), 409, 'Food name already exists.');
                $food->update(['name' => $v['name']]);
            }

            return $ledger->saveFood($r->user(), $this->foodInput(array_replace($this->foodOut($food), $v)));
        });

        return response()->json($this->foodOut($result));
    }

    public function meals(Request $r, ?string $entry_date = null): JsonResponse
    {
        $date = $entry_date ?? $r->input('entry_date');
        if ($date) {
            validator(['date' => $date], ['date' => 'date_format:Y-m-d'])->validate();
        }
        $entries = $this->mealsQuery($r)->when($date, fn ($q) => $q->whereDate('date', $date))->with('version.food')->orderBy('date')->orderBy('id')->get()->map(fn ($m) => $this->mealOut($m));

        return response()->json(['entry_date' => $date, 'count' => $entries->count(), 'entries' => $entries]);
    }

    public function createMeal(Request $r, NutritionLedger $ledger): JsonResponse
    {
        $v = $r->validate(['food_name' => 'required|string|max:200', 'entry_date' => 'required|date_format:Y-m-d', 'qty' => 'required|numeric|gt:0|max:1000', 'meal' => 'required|in:breakfast,lunch,dinner,snack', 'unit' => 'required|string|max:200', 'note' => 'nullable|string|max:5000']);
        $food = $this->foodsQuery($r)->where('name', $v['food_name'])->firstOrFail();
        $meal = $ledger->logMeal($r->user(), ['food_id' => $food->id, 'date' => $v['entry_date'], 'meal' => $v['meal'], 'qty' => $v['qty'], 'unit' => $v['unit'], 'note' => $v['note'] ?? null, 'idempotency_key' => $r->header('Idempotency-Key') ?? (string) Str::uuid()]);

        return response()->json($this->mealOut($meal));
    }

    public function updateMeal(Request $r, int $id): JsonResponse
    {
        $meal = $this->mealsQuery($r)->findOrFail($id);
        $v = $r->validate(['food_name' => 'sometimes|string|max:200', 'entry_date' => 'sometimes|date_format:Y-m-d', 'qty' => 'sometimes|numeric|gt:0|max:1000', 'meal' => 'sometimes|in:breakfast,lunch,dinner,snack', 'unit' => 'sometimes|string|max:200', 'note' => 'nullable|string|max:5000']);
        if (isset($v['food_name'])) {
            $food = $this->foodsQuery($r)->where('name', $v['food_name'])->firstOrFail();
            $meal->food_version_id = $food->current_version_id;
        }
        if (isset($v['entry_date'])) {
            $meal->date = $v['entry_date'];
        }
        $meal->fill(array_intersect_key($v, array_flip(['qty', 'meal', 'unit', 'note'])))->save();

        return response()->json($this->mealOut($meal->fresh()));
    }

    public function deleteMeal(Request $r, int $id): JsonResponse
    {
        $meal = $this->mealsQuery($r)->findOrFail($id);
        $meal->delete();
        AuditEvent::create(['workspace_id' => $r->user()->current_workspace_id, 'user_id' => $r->user()->id, 'action' => 'meal.deleted', 'entity_type' => 'meal_entry', 'entity_id' => $id]);

        return response()->json(['status' => 'deleted', 'id' => $id]);
    }

    private function totals(iterable $entries): array
    {
        $totals = ['calories' => 0.0, 'protein_g' => 0.0, 'carbs_g' => 0.0, 'fat_g' => 0.0];
        foreach ($entries as $m) {
            foreach (['calories' => 'calories', 'protein_g' => 'protein', 'carbs_g' => 'carbs', 'fat_g' => 'fat'] as $out => $key) {
                $totals[$out] += $m->qty * $m->version->$key;
            }
        }

        return array_map(fn ($n) => round($n, 2), $totals);
    }

    public function daily(Request $r): JsonResponse
    {
        $v = $r->validate(['entry_date' => 'required|date_format:Y-m-d']);
        $entries = $this->mealsQuery($r)->whereDate('date', $v['entry_date'])->with('version')->get();

        return response()->json(['entry_date' => $v['entry_date']] + $this->totals($entries));
    }

    public function range(Request $r): JsonResponse
    {
        $v = $r->validate(['start_date' => 'required|date_format:Y-m-d', 'end_date' => 'required|date_format:Y-m-d|after_or_equal:start_date']);
        $days = (int) CarbonImmutable::parse($v['start_date'])->diffInDays(CarbonImmutable::parse($v['end_date'])) + 1;
        abort_if($days > 3660, 422, 'Date range is too large.');
        $entries = $this->mealsQuery($r)->whereBetween('date', [$v['start_date'], $v['end_date']])->with('version')->get();
        $totals = $this->totals($entries);
        $avg = [];
        foreach ($totals as $k => $n) {
            $avg['avg_daily_'.$k] = round($n / $days, 2);
        }

        return response()->json($v + ['days_in_period' => $days, 'days_with_entries' => $entries->pluck('date')->unique()->count()] + $totals + $avg);
    }

    public function qualified(Request $r): JsonResponse
    {
        $v = $r->validate(['start_date' => 'required|string|max:10', 'end_date' => 'required|string|max:10']);
        foreach ($v as $key => $value) {
            $parsed = null;
            foreach (['Y-m-d', 'm/d/y', 'm/d/Y'] as $format) {
                try {
                    $date = CarbonImmutable::createFromFormat('!'.$format, $value);
                    if ($date && $date->format($format) === $value) {
                        $parsed = $date;
                        break;
                    }
                } catch (\Throwable) {
                }
            } abort_unless($parsed, 400, 'Dates must be YYYY-MM-DD or MM/DD/YY.');
            $v[$key] = $parsed;
        }
        $days = (int) $v['start_date']->diffInDays($v['end_date']) + 1;
        abort_if($days < 1 || $days > 3660, 400, 'Invalid date range.');
        $entries = $this->mealsQuery($r)->whereBetween('date', [$v['start_date']->toDateString(), $v['end_date']->toDateString()])->with('version')->get()->groupBy(fn ($m) => $m->date->toDateString());
        $included = [];
        $excluded = [];
        $includedEntries = collect();
        for ($day = $v['start_date']; $day <= $v['end_date']; $day = $day->addDay()) {
            $date = $day->toDateString();
            $rows = $entries->get($date, collect());
            $missing = array_values(array_diff(['breakfast', 'lunch', 'dinner'], $rows->pluck('meal')->map(fn ($m) => strtolower($m))->all()));
            if ($missing) {
                $excluded[] = ['entry_date' => $date, 'missing_meals' => $missing];
            } else {
                $included[] = $date;
                $includedEntries = $includedEntries->concat($rows);
            }
        }
        $avg = [];
        foreach ($this->totals($includedEntries) as $k => $n) {
            $avg['avg_'.$k] = count($included) ? round($n / count($included), 2) : 0.0;
        }

        return response()->json(['start_date' => $v['start_date']->toDateString(), 'end_date' => $v['end_date']->toDateString(), 'total_days_in_range' => $days, 'included_days_count' => count($included), 'excluded_days_count' => count($excluded), 'included_dates' => $included, 'excluded_dates' => $excluded] + $avg);
    }
}

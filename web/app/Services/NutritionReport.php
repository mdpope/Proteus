<?php

namespace App\Services;

use App\Models\MealEntry;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;

class NutritionReport
{
    private const MACROS = ['calories', 'protein', 'carbs', 'fat'];

    public function days(int $workspace, int $user, ?string $from = null, ?string $through = null): LengthAwarePaginator
    {
        return $this->range($this->dailyTotals($workspace, $user), $from, $through)->orderByDesc('meal_entries.date')->paginate(15)->withQueryString();
    }

    public function months(int $workspace, int $user, ?string $from = null, ?string $through = null): LengthAwarePaginator
    {
        $query = DB::query()->fromSub($this->range($this->completeDailyTotals($workspace, $user), $from, $through), 'days')
            ->selectRaw('SUBSTR(date, 1, 7) AS month, COUNT(*) AS complete_days, SUM(entry_count) AS entry_count')
            ->groupByRaw('SUBSTR(date, 1, 7)')->orderByDesc('month');
        foreach (self::MACROS as $macro) {
            $query->selectRaw("AVG({$macro}) AS {$macro}, SUM({$macro}) AS {$macro}_total");
        }

        return $query->paginate(12)->withQueryString();
    }

    public function summary(int $workspace, int $user, ?string $from = null, ?string $through = null): array
    {
        $days = $this->completeDailyTotals($workspace, $user);
        if ($from !== null) {
            $days->whereDate('meal_entries.date', '>=', $from);
        }
        if ($through !== null) {
            $days->whereDate('meal_entries.date', '<=', $through);
        }
        $query = DB::query()->fromSub($days, 'days')->selectRaw('COUNT(*) AS complete_days, COALESCE(SUM(entry_count), 0) AS entry_count, MIN(date) AS first_date, MAX(date) AS last_date');
        foreach (self::MACROS as $macro) {
            $query->selectRaw("AVG({$macro}) AS {$macro}");
        }

        return (array) $query->first();
    }

    private function range(Builder $days, ?string $from, ?string $through): Builder
    {
        return $days->when($from, fn ($query) => $query->whereDate('meal_entries.date', '>=', $from))
            ->when($through, fn ($query) => $query->whereDate('meal_entries.date', '<=', $through));
    }

    private function completeDailyTotals(int $workspace, int $user): Builder
    {
        return $this->dailyTotals($workspace, $user)
            ->havingRaw("COUNT(DISTINCT CASE WHEN LOWER(meal_entries.meal) IN ('breakfast', 'lunch', 'dinner') THEN LOWER(meal_entries.meal) END) = 3");
    }

    private function dailyTotals(int $workspace, int $user): Builder
    {
        $query = MealEntry::query()
            ->where('meal_entries.workspace_id', $workspace)->where('meal_entries.user_id', $user)
            ->join('food_versions', 'food_versions.id', '=', 'meal_entries.food_version_id')
            ->join('foods', 'foods.id', '=', 'food_versions.food_id')
            ->where('foods.workspace_id', $workspace)->where('foods.user_id', $user)
            ->select('meal_entries.date')->selectRaw('COUNT(*) AS entry_count')
            ->groupBy('meal_entries.date');
        foreach (self::MACROS as $macro) {
            $query->selectRaw("SUM(meal_entries.qty * food_versions.{$macro}) AS {$macro}");
        }

        return $query->toBase();
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Food;
use App\Models\MealEntry;
use App\Services\NutritionLedger;
use App\Services\NutritionReport;
use App\Services\TenantAccess;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class NutritionController extends Controller
{
    public function index(Request $request, TenantAccess $access, NutritionReport $report): View
    {
        $workspace = $access->workspace($request->user(), 'nutrition.read');
        $user = $request->user()->id;
        $v = $request->validate([
            'date' => 'nullable|date_format:Y-m-d',
            'tab' => 'nullable|in:days,day,averages,foods',
            'search' => 'nullable|string|max:200',
        ]);
        $tab = $v['tab'] ?? (isset($v['date']) ? 'day' : 'days');
        $date = $v['date'] ?? now('America/Boise')->toDateString();
        $macros = ['calories' => 'Calories', 'protein' => 'Protein', 'carbs' => 'Carbs', 'fat' => 'Fat'];
        $data = compact('tab', 'date', 'macros');
        $foods = Food::where('workspace_id', $workspace)->where('user_id', $user)->with('currentVersion')->orderBy('name');
        $meals = MealEntry::where('workspace_id', $workspace)->where('user_id', $user)->with('version.food');

        if ($tab === 'days') {
            $days = $report->days($workspace, $user);
            $dayFoods = (clone $meals)->whereIn('date', $days->getCollection()->pluck('date'))->orderBy('id')->get()
                ->groupBy(fn ($meal) => $meal->date->toDateString());
            $data += compact('days', 'dayFoods');
            $data['entryCount'] = (clone $meals)->count();
            $data['summary'] = $report->summary($workspace, $user);
        } elseif ($tab === 'averages') {
            $today = now('America/Boise')->startOfDay();
            $data['periods'] = [
                'All complete days' => $report->summary($workspace, $user),
                'This month' => $report->summary($workspace, $user, $today->copy()->startOfMonth()->toDateString(), $today->toDateString()),
                'Last 30 calendar days' => $report->summary($workspace, $user, $today->copy()->subDays(29)->toDateString(), $today->toDateString()),
            ];
            $data['months'] = $report->months($workspace, $user);
        } elseif ($tab === 'foods') {
            $search = $v['search'] ?? '';
            if ($search !== '') {
                $foods->where('name', 'like', '%'.$search.'%');
            }
            $data += ['foods' => $foods->paginate(25)->withQueryString(), 'search' => $search];
        } else {
            $dailyMeals = $meals->whereDate('date', $date)->orderBy('id')->get();
            $totals = [];
            foreach (array_keys($macros) as $key) {
                $totals[$key] = $dailyMeals->sum(fn ($meal) => $meal->qty * $meal->version->$key);
            }
            $data += ['foods' => $foods->get(), 'meals' => $dailyMeals, 'totals' => $totals];
        }

        return view('nutrition', $data);
    }

    public function food(Request $request, NutritionLedger $ledger): RedirectResponse
    {
        $ledger->saveFood($request->user(), $request->all());

        return redirect()->route('nutrition', ['tab' => 'foods'])->with('status', 'Food saved. Existing meals keep their recorded nutrition.');
    }

    public function meal(Request $request, NutritionLedger $ledger): RedirectResponse
    {
        $input = $request->all();
        $meal = $ledger->logMeal($request->user(), $input);

        return redirect()->route('nutrition', ['date' => $meal->date->toDateString()])->with('status', 'Meal logged.');
    }
}

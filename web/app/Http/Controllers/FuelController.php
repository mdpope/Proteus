<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Services\FuelReport;
use App\Services\TenantAccess;
use Illuminate\Contracts\View\View;
use Illuminate\Http\Request;

class FuelController extends Controller
{
    public function index(Request $request, TenantAccess $access, FuelReport $report): View
    {
        $vehicles = Vehicle::where('workspace_id', $access->workspace($request->user()))->where('kind', '!=', 'trailer')->get();
        $reports = $vehicles->mapWithKeys(fn ($v) => [$v->id => $report->forVehicle($v)]);

        return view('fuel', compact('vehicles', 'reports'));
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Vehicle;
use App\Services\CaptureIngestor;
use App\Services\FuelReport;
use App\Services\TenantAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApiController extends Controller
{
    public function vehicles(Request $request, TenantAccess $access): JsonResponse
    {
        return response()->json(['data' => Vehicle::where('workspace_id', $access->workspace($request->user()))->get(['id', 'name', 'year', 'kind', 'fuel_type', 'notes'])]);
    }

    public function vehicle(Request $request, int $vehicle, TenantAccess $access, FuelReport $report): JsonResponse
    {
        $vehicle = $access->vehicle($request->user(), $vehicle);

        return response()->json(['data' => $vehicle->only(['id', 'name', 'year', 'kind', 'fuel_type', 'notes']), 'history' => $vehicle->services()->orderByDesc('occurred_on')->limit(100)->get(), 'report' => $report->forVehicle($vehicle)]);
    }

    public function capture(Request $request, CaptureIngestor $ingestor): JsonResponse
    {
        $capture = $ingestor->ingest($request->user(), $request->all(), 'api');

        return response()->json(['id' => $capture->id, 'status' => $capture->status, 'uncertainties' => $capture->uncertainties], 201);
    }

    public function inbox(Request $request, TenantAccess $access): JsonResponse
    {
        return response()->json($access->captures($request->user())->where('status', 'review')->latest()->paginate(30));
    }
}

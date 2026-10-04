<?php

namespace App\Mcp\Tools;

use App\Services\FuelReport;
use App\Services\TenantAccess;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
class VehicleHistory extends Tool
{
    protected string $description = 'Read a vehicle’s service and purchase history, oil analysis samples/results and authenticated original PDF links, pending maintenance tasks, fuel economy and monthly/yearly mileage estimates. A purchase does not prove installation. Monthly mileage is interpolated between recorded odometers.';

    public function schema(JsonSchema $schema): array
    {
        return ['vehicle_id' => $schema->integer()->required()];
    }

    public function handle(Request $request, TenantAccess $access, FuelReport $reports): Response
    {
        $v = $request->validate(['vehicle_id' => 'required|integer']);
        $vehicle = $access->vehicle($request->user(), $v['vehicle_id']);
        $report = $reports->forVehicle($vehicle);
        unset($report['fills']);

        return Response::json(['vehicle' => $vehicle->only(['id', 'name', 'kind', 'fuel_type']), 'history' => $vehicle->services()->orderByDesc('occurred_on')->limit(100)->get()->toArray(), 'tasks' => $vehicle->tasks()->where('status', 'open')->get()->toArray(), 'fuel' => $report, 'oil_analyses' => $vehicle->oilAnalyses()->with('attachments')->orderByDesc('payload->sample_date')->limit(100)->get()->map(fn ($capture) => ['id' => $capture->id, 'status' => $capture->status, 'title' => $capture->title, 'notes' => $capture->notes, 'data' => $capture->payload, 'url' => route('captures.show', $capture), 'files' => $capture->attachments->map(fn ($file) => ['name' => $file->original_name, 'sha256' => $file->sha256, 'url' => route('attachments.download', $file)])])->toArray()]);
    }
}

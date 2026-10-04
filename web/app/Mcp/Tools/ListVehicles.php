<?php

namespace App\Mcp\Tools;

use App\Models\Vehicle;
use App\Services\TenantAccess;
use Laravel\Mcp\Request;
use Laravel\Mcp\Response;
use Laravel\Mcp\Server\Tool;
use Laravel\Mcp\Server\Tools\Annotations\IsReadOnly;

#[IsReadOnly]
class ListVehicles extends Tool
{
    protected string $description = 'List vehicles in your current account. Use the stable vehicle ID to match receipts, service work, and fuel photos. Do not guess which vehicle.';

    public function handle(Request $request, TenantAccess $access): Response
    {
        return Response::json(['vehicles' => Vehicle::where('workspace_id', $access->workspace($request->user()))->get(['id', 'name', 'kind', 'year', 'fuel_type', 'notes'])->toArray()]);
    }
}

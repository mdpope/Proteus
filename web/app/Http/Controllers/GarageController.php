<?php

namespace App\Http\Controllers;

use App\Models\AuditEvent;
use App\Models\MaintenanceTask;
use App\Models\Vehicle;
use App\Services\FuelReport;
use App\Services\TenantAccess;
use Illuminate\Contracts\View\View;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GarageController extends Controller
{
    public function index(Request $request, TenantAccess $access): View
    {
        $workspace = $access->workspace($request->user());
        $vehicles = Vehicle::where('workspace_id', $workspace)->withCount(['services', 'fills'])->with(['services' => fn ($q) => $q->orderByDesc('occurred_on'), 'tasks' => fn ($q) => $q->where('status', 'open')])->orderBy('id')->get();

        return view('garage.index', compact('vehicles'));
    }

    public function show(Request $request, int $vehicle, TenantAccess $access, FuelReport $report): View
    {
        $vehicle = $access->vehicle($request->user(), $vehicle);
        $vehicle->load(['services' => fn ($q) => $q->orderByDesc('occurred_on'), 'tasks' => fn ($q) => $q->orderBy('status')->orderBy('due_on')]);

        return view('garage.show', ['vehicle' => $vehicle, 'report' => $report->forVehicle($vehicle), 'oilAnalyses' => $vehicle->oilAnalyses()->with('attachments')->orderByDesc('payload->sample_date')->paginate(10, ['*'], 'oil_page')]);
    }

    public function task(Request $request, int $vehicle, TenantAccess $access): RedirectResponse
    {
        $vehicle = $access->vehicle($request->user(), $vehicle, 'garage.add');
        $v = $request->validate(['title' => 'required|string|max:200', 'notes' => 'nullable|string|max:5000', 'due_on' => 'nullable|date_format:Y-m-d', 'due_odometer' => 'nullable|numeric|min:0|max:10000000']);
        MaintenanceTask::create($v + ['workspace_id' => $vehicle->workspace_id, 'vehicle_id' => $vehicle->id]);

        return back()->with('status', 'Task saved.');
    }

    public function completeTask(Request $request, int $vehicle, int $task, TenantAccess $access): RedirectResponse
    {
        $vehicle = $access->vehicle($request->user(), $vehicle, 'garage.edit');
        $task = $vehicle->tasks()->findOrFail($task);
        $task->update(['status' => 'done']);
        AuditEvent::create(['workspace_id' => $vehicle->workspace_id, 'user_id' => $request->user()->id, 'action' => 'task.completed', 'entity_type' => 'maintenance_task', 'entity_id' => $task->id]);

        return back()->with('status', 'Task marked complete. Add a service record to document any work performed.');
    }
}

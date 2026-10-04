<?php

namespace App\Services;

use App\Models\{Attachment, AuditEvent, Food, MaintenanceTask, Membership, User, Vehicle};
use Illuminate\Support\Facades\{DB, Storage, Validator};
use Illuminate\Support\Str;

/** Adapter: preserve the website domain validators and native retry transaction. */
class LifeActions
{
    public function __construct(private TenantAccess $access, private NutritionLedger $nutrition, private CaptureIngestor $captures, private LifeReadModel $read) {}

    public function run(User $user, string $action, array $input, string $key): array
    {
        abort_if($this->read->profile($user)['readOnly'], 403, 'This account connection is read-only.');
        abort_if($action === 'token.revoke', 403, 'Manage connections on the website after confirming your identity.');
        $w = $user->current_workspace_id; $hash = hash('sha256', json_encode(['action' => $action, 'input' => $input], JSON_THROW_ON_ERROR)); $files = [];
        try {
            return DB::transaction(function () use ($user, $action, $input, $key, $w, $hash, &$files) {
                Membership::where('workspace_id', $w)->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
                $prior = DB::table('proteus_life_mutations')->where(['workspace_id' => $w, 'user_id' => $user->id, 'idempotency_key' => $key])->first();
                if ($prior) { abort_unless(hash_equals($prior->request_hash, $hash), 409, 'This retry key already belongs to different changes.'); return json_decode($prior->result_json, true, flags: JSON_THROW_ON_ERROR); }
                $record = $this->change($user, $action, $input, $key, $files);
                $result = ['ok' => true, 'record' => LifeReadModel::clean($record)];
                DB::table('proteus_life_mutations')->insert(['workspace_id' => $w, 'user_id' => $user->id, 'idempotency_key' => $key, 'request_hash' => $hash, 'result_json' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now()->format('Y-m-d H:i:s')]);
                return $result;
            });
        } catch (\Throwable $e) { foreach ($files as $file) Storage::disk('local')->delete($file); throw $e; }
    }

    private function change(User $user, string $action, array $input, string $key, array &$files): array
    {
        $w = $user->current_workspace_id;
        if ($action === 'food.save') {
            if (isset($input['food_id'])) {
                $this->access->workspace($user, 'nutrition.edit');
                $food = Food::where('workspace_id', $w)->where('user_id', $user->id)->lockForUpdate()->findOrFail($input['food_id']);
                $v = Validator::make($input, ['name' => 'required|string|max:200'])->validate();
                abort_if(Food::where('workspace_id', $w)->where('user_id', $user->id)->where('name', $v['name'])->where('id', '!=', $food->id)->exists(), 422, 'A different food already has this name.');
                $food->update(['name' => $v['name']]);
            }
            return $this->nutrition->saveFood($user, $input)->getAttributes();
        }
        if ($action === 'meal.log') return $this->nutrition->logMeal($user, array_replace($input, ['idempotency_key' => $key]))->getAttributes();
        if (in_array($action, ['meal.update', 'meal.delete'])) {
            $id = Validator::make($input, ['id' => 'required|integer|min:1'])->validate()['id'];
            $meal = $this->nutrition->correctMeal($user, $id, $action === 'meal.delete' ? 'delete' : 'update', $input);
            return $action === 'meal.delete' ? ['id' => $meal->id, 'deleted' => true] : $meal->getAttributes();
        }
        if ($action === 'vehicle.save') {
            $this->access->workspace($user, isset($input['id']) ? 'garage.edit' : 'garage.add');
            $v = Validator::make($input, ['name' => 'required|string|max:200', 'kind' => 'required|in:car,truck,motorcycle,trailer,other,suv,van', 'fuel_type' => 'nullable|in:gas,diesel,electric,hybrid,other', 'year' => 'nullable|integer|between:1900,2200', 'vin' => 'nullable|string|max:100', 'notes' => 'nullable|string|max:5000'])->validate();
            $vehicle = isset($input['id']) ? Vehicle::where('workspace_id', $w)->lockForUpdate()->findOrFail($input['id']) : new Vehicle(['workspace_id' => $w]);
            $vehicle->fill($v)->save(); $this->audit($user, $action, 'vehicle', $vehicle->id); return $vehicle->getAttributes();
        }
        if (in_array($action, ['task.add', 'task.complete'])) {
            $this->access->workspace($user, $action === 'task.add' ? 'garage.add' : 'garage.edit');
            if ($action === 'task.add') {
                $v = Validator::make($input, ['vehicle_id' => 'required|integer|min:1', 'title' => 'required|string|max:200', 'notes' => 'nullable|string|max:5000', 'due_on' => 'nullable|date_format:Y-m-d', 'due_odometer' => 'nullable|numeric|between:0,10000000'])->validate();
                $this->access->vehicle($user, $v['vehicle_id'], 'garage.add'); $task = MaintenanceTask::create(['workspace_id' => $w, 'status' => 'open'] + $v);
            } else { $id = Validator::make($input, ['id' => 'required|integer|min:1'])->validate()['id']; $task = MaintenanceTask::where('workspace_id', $w)->lockForUpdate()->findOrFail($id); $task->update(['status' => 'done']); }
            $this->audit($user, $action, 'maintenance_task', $task->id); return $task->getAttributes();
        }
        if (in_array($action, ['capture.save', 'capture.accept'])) {
            $old = isset($input['id']) ? $this->access->captures($user, 'garage.edit')->lockForUpdate()->findOrFail($input['id']) : null;
            abort_if($action === 'capture.accept' && ! $old, 422, 'Choose a capture to review.');
            $v = array_replace($old ? $old->getAttributes() : [], $input);
            $v['data'] = $input['payload'] ?? $old?->payload ?? []; $v['idempotency_key'] = $old?->idempotency_key ?? $key;
            $v['uncertainties'] = $input['uncertainties'] ?? $old?->uncertainties ?? []; $v['clear_match'] = false;
            $validated = Validator::make($v, $this->captures->rules())->validate();
            if (! $old) return $this->captures->ingest($user, $validated, 'native')->getAttributes();
            if ($action === 'capture.accept' || $old->status === 'saved') {
                abort_if($old->status === 'saved' && $old->kind !== 'oil_analysis', 409, 'This capture has already been accepted.');
                return $this->captures->accept($user, $old, $validated)->getAttributes();
            }
            $vehicle = isset($validated['vehicle_id']) ? $this->access->vehicle($user, $validated['vehicle_id'], 'garage.edit') : null;
            $old->update(['vehicle_id' => $vehicle?->id, 'kind' => $validated['kind'], 'title' => $validated['title'], 'notes' => $validated['notes'] ?? null, 'payload' => $validated['data'], 'uncertainties' => array_values(array_unique(array_merge($validated['uncertainties'], $this->captures->issues($validated['kind'], $vehicle, $validated['data']))))]);
            $this->audit($user, $action, 'capture', $old->id); return $old->getAttributes();
        }
        if ($action === 'attachment.add') {
            $this->access->workspace($user, 'garage.add');
            $v = Validator::make($input, ['capture_id' => 'required|integer|min:1', 'name' => 'required|string|max:255', 'mimeType' => 'required|in:image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,message/rfc822,text/plain', 'base64' => 'required|string|max:27962028'])->validate();
            $capture = $this->access->captures($user, 'garage.add')->lockForUpdate()->findOrFail($v['capture_id']);
            $bytes = base64_decode($v['base64'], true); abort_if($bytes === false || strlen($bytes) === 0 || strlen($bytes) > 20 * 1024 * 1024, 422, 'Evidence must be between 1 byte and 20 MB.');
            $sha = hash('sha256', $bytes); $old = $capture->attachments()->where('sha256', $sha)->first(); if ($old) return ['id' => $old->id, 'duplicate' => true];
            abort_if($capture->attachments()->count() >= 12, 422, 'A capture can have up to 12 originals.');
            $path = 'evidence/'.$w.'/'.Str::uuid(); $files[] = $path; abort_unless(Storage::disk('local')->put($path, $bytes), 500, 'Could not preserve the original.');
            $a = Attachment::create(['workspace_id' => $w, 'capture_id' => $capture->id, 'original_name' => basename($v['name']), 'path' => $path, 'mime_type' => $v['mimeType'], 'bytes' => strlen($bytes), 'sha256' => $sha]);
            $this->audit($user, $action, 'attachment', $a->id); return ['id' => $a->id, 'bytes' => $a->bytes, 'sha256' => $sha];
        }
        abort(422, 'Unknown Life action.');
    }

    private function audit(User $user, string $action, string $type, int $id): void { AuditEvent::create(['workspace_id' => $user->current_workspace_id, 'user_id' => $user->id, 'action' => $action, 'entity_type' => $type, 'entity_id' => $id]); }
}

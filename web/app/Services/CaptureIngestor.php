<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Capture;
use App\Models\FuelFill;
use App\Models\Membership;
use App\Models\OdometerReading;
use App\Models\ServiceRecord;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CaptureIngestor
{
    public function __construct(private TenantAccess $access) {}

    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::in(['receipt', 'service', 'fuel', 'odometer', 'document', 'oil_analysis'])],
            'vehicle_id' => 'nullable|integer', 'title' => 'required|string|max:200', 'notes' => 'nullable|string|max:20000',
            'idempotency_key' => 'required|string|max:100', 'clear_match' => 'required|boolean',
            'uncertainties' => 'present|array|max:30', 'uncertainties.*' => 'string|max:500',
            'data' => 'present|array:occurred_on,date_precision,odometer,odometer_approximate,cost,vendor,parts,filled_at,gallons,price_per_gallon,total_cost,fuel_type,full_tank,missed_fill,trip_miles,dashboard_mpg,station,observed_on,miles,'.implode(',', OilAnalysisData::FIELDS),
            'data.occurred_on' => 'nullable|date_format:Y-m-d|before_or_equal:today', 'data.date_precision' => ['nullable', Rule::in(['day', 'month', 'year', 'unknown'])],
            'data.odometer' => 'nullable|numeric|min:0|max:10000000', 'data.odometer_approximate' => 'sometimes|boolean',
            'data.cost' => 'nullable|numeric|min:0|max:1000000', 'data.vendor' => 'nullable|string|max:200',
            'data.parts' => 'nullable|array|max:100', 'data.parts.*' => 'array:name,part_number,quantity,cost',
            'data.parts.*.name' => 'required|string|max:300', 'data.parts.*.part_number' => 'nullable|string|max:100',
            'data.parts.*.quantity' => 'nullable|numeric|min:0|max:10000', 'data.parts.*.cost' => 'nullable|numeric|min:0|max:1000000',
            'data.filled_at' => 'nullable|date|before_or_equal:now', 'data.gallons' => 'nullable|numeric|gt:0|max:1000',
            'data.price_per_gallon' => 'nullable|numeric|gt:0|max:100', 'data.total_cost' => 'nullable|numeric|min:0|max:10000',
            'data.fuel_type' => ['nullable', Rule::in(['gas', 'diesel', 'other'])],
            'data.full_tank' => 'sometimes|boolean', 'data.missed_fill' => 'sometimes|boolean',
            'data.trip_miles' => 'nullable|numeric|gt:0|max:100000', 'data.dashboard_mpg' => 'nullable|numeric|gt:0|max:1000',
            'data.station' => 'nullable|string|max:200', 'data.observed_on' => 'nullable|date_format:Y-m-d|before_or_equal:today', 'data.miles' => 'nullable|numeric|min:0|max:10000000',
        ] + OilAnalysisData::rules();
    }

    public function ingest(User $user, array $input, string $source): Capture
    {
        $data = Validator::make($input, $this->rules())->validate();
        $workspace = $this->access->workspace($user, 'garage.add');
        $vehicle = isset($data['vehicle_id']) ? $this->access->vehicle($user, $data['vehicle_id'], 'garage.add') : null;
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($user, $data, $source, $workspace, $vehicle, $hash) {
            Membership::where('workspace_id', $workspace)->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
            $existing = Capture::where('workspace_id', $workspace)->where('created_by', $user->id)->where('idempotency_key', $data['idempotency_key'])->first();
            if ($existing) {
                abort_unless(hash_equals($existing->request_hash, $hash), 409, 'This submission key was already used for different data.');

                return $existing;
            }
            $issues = $this->issues($data['kind'], $vehicle, $data['data']);
            $capture = Capture::create(['workspace_id' => $workspace, 'created_by' => $user->id, 'vehicle_id' => $vehicle?->id, 'kind' => $data['kind'], 'source' => $source, 'title' => $data['title'], 'notes' => $data['notes'] ?? null, 'payload' => $data['data'], 'uncertainties' => array_values(array_unique(array_merge($data['uncertainties'], $issues))), 'status' => 'review', 'idempotency_key' => $data['idempotency_key'], 'request_hash' => $hash]);
            if ($data['clear_match'] && ! $capture->uncertainties && $data['kind'] !== 'document') {
                $this->accept($user, $capture, null, true);
            }
            AuditEvent::create(['workspace_id' => $workspace, 'user_id' => $user->id, 'action' => 'capture.created', 'entity_type' => 'capture', 'entity_id' => $capture->id, 'details' => ['source' => $source, 'status' => $capture->status]]);

            return $capture->fresh();
        });
    }

    public function issues(string $kind, ?Vehicle $vehicle, array $data): array
    {
        $issues = [];
        if (! $vehicle) {
            $issues[] = 'Choose a vehicle.';
        }
        $required = match ($kind) {
            'fuel' => ['filled_at', 'odometer', 'gallons', 'fuel_type', 'full_tank'], 'odometer' => ['observed_on', 'miles'], 'receipt' => ['occurred_on', 'vendor', 'cost'], 'service' => ['occurred_on'], 'oil_analysis' => ['analysis_status', 'lab', 'sample_date'], default => []
        };
        foreach ($required as $key) {
            if (! isset($data[$key]) || $data[$key] === '') {
                $issues[] = 'Check '.str_replace('_', ' ', $key).'.';
            }
        }
        if ($kind === 'oil_analysis') {
            $issues = array_merge($issues, OilAnalysisData::issues($data));
        }
        if ($kind === 'fuel' && $vehicle) {
            if ($vehicle->kind === 'trailer') {
                $issues[] = 'Fuel records need a powered vehicle.';
            }
            if (isset($data['fuel_type']) && $vehicle->fuel_type && $vehicle->fuel_type !== $data['fuel_type']) {
                $issues[] = 'Fuel type differs from the vehicle.';
            }
            if (isset($data['gallons'],$data['price_per_gallon'],$data['total_cost']) && abs($data['gallons'] * $data['price_per_gallon'] - $data['total_cost']) > 0.05) {
                $issues[] = 'Gallons × unit price does not match the total.';
            }
            if (isset($data['filled_at'],$data['odometer'])) {
                $before = $vehicle->fills()->where('filled_at', '<=', $data['filled_at'])->orderByDesc('filled_at')->first();
                $after = $vehicle->fills()->where('filled_at', '>=', $data['filled_at'])->orderBy('filled_at')->first();
                if (($before && $before->odometer >= $data['odometer']) || ($after && $after->odometer <= $data['odometer'])) {
                    $issues[] = 'Odometer conflicts with the neighboring fill-ups.';
                }
                if ($before && isset($data['trip_miles']) && abs(($data['odometer'] - $before->odometer) - $data['trip_miles']) > max(2, $data['trip_miles'] * 0.03)) {
                    $issues[] = 'Trip miles differ from the odometer interval.';
                }
            }
        }

        return $issues;
    }

    public function accept(User $user, Capture $capture, ?array $replacement = null, bool $initial = false): Capture
    {
        $ability = $initial ? 'garage.add' : 'garage.edit';
        $workspace = $this->access->workspace($user, $ability);
        abort_unless($capture->workspace_id === $workspace, 404);

        return DB::transaction(function () use ($user, $capture, $replacement, $ability, $initial) {
            $capture = Capture::whereKey($capture->id)->lockForUpdate()->firstOrFail();
            if ($capture->status === 'saved' && ($initial || $capture->kind !== 'oil_analysis')) {
                return $capture;
            }
            $previousAnalysis = $capture->kind === 'oil_analysis' && $capture->status === 'saved' ? $capture->only(['vehicle_id', 'title', 'notes', 'payload']) : null;
            if ($replacement !== null) {
                $v = Validator::make($replacement, $this->rules())->validate();
                if ($capture->status === 'saved') {
                    abort_unless($v['kind'] === 'oil_analysis', 422, 'Keep this record as an oil analysis.');
                }
                $vehicle = isset($v['vehicle_id']) ? $this->access->vehicle($user, $v['vehicle_id'], 'garage.edit') : null;
                $capture->fill(['vehicle_id' => $vehicle?->id, 'kind' => $v['kind'], 'title' => $v['title'], 'notes' => $v['notes'] ?? null, 'payload' => $v['data']]);
            }
            $vehicle = $capture->vehicle_id ? $this->access->vehicle($user, $capture->vehicle_id, $ability) : null;
            if ($vehicle) {
                Vehicle::whereKey($vehicle->id)->lockForUpdate()->first();
            }
            $issues = $this->issues($capture->kind, $vehicle, $capture->payload);
            if ($issues) {
                throw ValidationException::withMessages(['capture' => $issues]);
            }
            $base = ['workspace_id' => $capture->workspace_id, 'vehicle_id' => $capture->vehicle_id, 'created_by' => $user->id, 'capture_id' => $capture->id, 'notes' => $capture->notes];
            $p = $capture->payload;
            if (in_array($capture->kind, ['receipt', 'service'], true)) {
                ServiceRecord::create($base + ['kind' => $capture->kind === 'receipt' ? 'purchase' : 'service', 'title' => $capture->title] + array_intersect_key($p, array_flip(['occurred_on', 'date_precision', 'odometer', 'odometer_approximate', 'cost', 'vendor', 'parts'])));
            } elseif ($capture->kind === 'fuel') {
                FuelFill::create($base + ['missed_fill' => $p['missed_fill'] ?? false] + array_intersect_key($p, array_flip(['filled_at', 'odometer', 'gallons', 'price_per_gallon', 'total_cost', 'fuel_type', 'full_tank', 'trip_miles', 'dashboard_mpg', 'station'])));
            } elseif ($capture->kind === 'odometer') {
                OdometerReading::create($base + array_intersect_key($p, array_flip(['observed_on', 'miles'])));
            }
            $capture->fill(['status' => 'saved', 'accepted_at' => now(), 'uncertainties' => []])->save();
            AuditEvent::create(['workspace_id' => $capture->workspace_id, 'user_id' => $user->id, 'action' => $previousAnalysis ? 'oil_analysis.updated' : 'capture.accepted', 'entity_type' => 'capture', 'entity_id' => $capture->id, 'details' => $previousAnalysis ? ['previous' => $previousAnalysis] : null]);

            return $capture;
        });
    }
}

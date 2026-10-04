<?php

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\Food;
use App\Models\FoodVersion;
use App\Models\MealEntry;
use App\Models\Membership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NutritionLedger
{
    public function __construct(private TenantAccess $access) {}

    public function saveFood(User $user, array $input): Food
    {
        $workspace = $this->access->workspace($user, 'nutrition.add');
        $v = Validator::make($input, ['name' => 'required|string|max:200', 'serving' => 'required|string|max:200', 'calories' => 'required|numeric|min:0|max:100000', 'protein' => 'required|numeric|min:0|max:10000', 'carbs' => 'required|numeric|min:0|max:10000', 'fat' => 'required|numeric|min:0|max:10000', 'source_type' => 'sometimes|string|max:64', 'source_note' => 'nullable|string|max:5000', 'is_estimate' => 'sometimes|boolean'])->validate();

        return DB::transaction(function () use ($user, $workspace, $v) {
            $food = Food::where('workspace_id', $workspace)->where('user_id', $user->id)->where('name', $v['name'])->first();
            if ($food) {
                $this->access->workspace($user, 'nutrition.edit');
            } else {
                $food = Food::create(['workspace_id' => $workspace, 'user_id' => $user->id, 'name' => $v['name'], 'serving' => $v['serving']]);
            }
            $attributes = array_intersect_key($v, array_flip(['calories', 'protein', 'fat', 'carbs', 'source_type', 'source_note', 'is_estimate']));
            $version = FoodVersion::firstOrCreate(['food_id' => $food->id] + $attributes);
            $food->update(['serving' => $v['serving'], 'current_version_id' => $version->id]);

            return $food->load('currentVersion');
        });
    }

    public function logMeal(User $user, array $input): MealEntry
    {
        $workspace = $this->access->workspace($user, 'nutrition.add');
        $v = Validator::make($input, ['food_id' => 'required|integer', 'date' => 'required|date_format:Y-m-d', 'meal' => 'required|in:breakfast,lunch,dinner,snack', 'qty' => 'required|numeric|gt:0|max:1000', 'note' => 'nullable|string|max:5000', 'unit' => 'sometimes|string|max:200', 'idempotency_key' => 'required|string|max:100'])->validate();
        $food = Food::where('workspace_id', $workspace)->where('user_id', $user->id)->findOrFail($v['food_id']);
        abort_unless($food->current_version_id, 422, 'This food has no nutrition values.');
        $hash = hash('sha256', json_encode($v, JSON_THROW_ON_ERROR));

        return DB::transaction(function () use ($user, $workspace, $v, $food, $hash) {
            Membership::where('workspace_id', $workspace)->where('user_id', $user->id)->lockForUpdate()->firstOrFail();
            $old = MealEntry::withTrashed()->where('user_id', $user->id)->where('idempotency_key', $v['idempotency_key'])->first();
            if ($old) {
                abort_unless(hash_equals($old->request_hash, $hash), 409, 'Submission key already used for different meal data.');

                return $old;
            }

            return MealEntry::create(['workspace_id' => $workspace, 'user_id' => $user->id, 'food_version_id' => $food->current_version_id, 'unit' => $v['unit'] ?? $food->serving, 'request_hash' => $hash] + array_intersect_key($v, array_flip(['date', 'meal', 'qty', 'note', 'idempotency_key'])));
        });
    }

    public function correctMeal(User $user, int $entryId, string $action, array $input): MealEntry
    {
        $workspace = $this->access->workspace($user, 'nutrition.edit');
        $changes = Validator::make($input, [
            'food_id' => 'sometimes|integer',
            'date' => 'sometimes|date_format:Y-m-d',
            'meal' => 'sometimes|in:breakfast,lunch,dinner,snack',
            'qty' => 'sometimes|numeric|gt:0|max:1000',
            'unit' => 'sometimes|string|max:200',
            'note' => 'sometimes|nullable|string|max:5000',
        ])->validate();
        abort_unless(in_array($action, ['update', 'delete'], true), 422, 'Unknown correction action.');
        abort_if($action === 'update' && $changes === [], 422, 'Provide at least one field to update.');

        return DB::transaction(function () use ($user, $workspace, $entryId, $action, $changes) {
            $entry = MealEntry::withTrashed()->where('workspace_id', $workspace)->where('user_id', $user->id)->lockForUpdate()->findOrFail($entryId);
            if ($action === 'delete' && $entry->trashed()) {
                return $entry;
            }
            abort_if($entry->trashed(), 409, 'This meal entry was deleted.');
            $before = $entry->only(['food_version_id', 'date', 'meal', 'qty', 'unit', 'note']);
            if ($action === 'delete') {
                $entry->delete();
            } else {
                if (isset($changes['food_id'])) {
                    $food = Food::where('workspace_id', $workspace)->where('user_id', $user->id)->findOrFail($changes['food_id']);
                    abort_unless($food->current_version_id, 422, 'This food has no nutrition values.');
                    $changes['food_version_id'] = $food->current_version_id;
                    $changes['unit'] ??= $food->serving;
                    unset($changes['food_id']);
                }
                $entry->fill($changes);
                if (! $entry->isDirty()) {
                    return $entry;
                }
                $entry->save();
            }
            AuditEvent::create(['workspace_id' => $workspace, 'user_id' => $user->id, 'action' => $action === 'delete' ? 'meal.deleted' : 'meal.updated', 'entity_type' => 'meal_entry', 'entity_id' => $entry->id, 'details' => ['before' => $before, 'after' => $entry->only(['food_version_id', 'date', 'meal', 'qty', 'unit', 'note', 'deleted_at'])]]);

            return $entry;
        });
    }
}

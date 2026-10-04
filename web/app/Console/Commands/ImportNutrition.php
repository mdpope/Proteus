<?php

namespace App\Console\Commands;

use App\Models\AuditEvent;
use App\Models\Food;
use App\Models\FoodVersion;
use App\Models\MealEntry;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ImportNutrition extends Command
{
    protected $signature = 'brain:import-nutrition {email} {snapshot}';

    protected $description = 'Import and verify a transaction-consistent legacy nutrition snapshot.';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->firstOrFail();
        $workspace = $user->current_workspace_id;
        $path = $this->argument('snapshot');
        $hash = hash_file('sha256', $path);
        $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (AuditEvent::where('user_id', $user->id)->where('action', 'nutrition.imported')->where('details->sha256', $hash)->exists()) {
            $this->info('This exact snapshot has already been imported.');

            return self::SUCCESS;
        }
        if (Food::where('user_id', $user->id)->exists() || MealEntry::withTrashed()->where('user_id', $user->id)->exists()) {
            $this->error('Target nutrition is not empty. Import refused to protect existing records.');

            return self::FAILURE;
        }
        DB::transaction(function () use ($user, $workspace, $data, $hash) {
            $foods = [];
            $versions = [];
            foreach ($data['foods'] as $row) {
                if (Food::whereKey($row['id'])->exists()) {
                    throw new \RuntimeException('Legacy ID collision.');
                }
                $f = new Food(['workspace_id' => $workspace, 'user_id' => $user->id, 'legacy_id' => $row['id'], 'name' => $row['name'], 'serving' => $row['serving']]);
                $f->id = $row['id'];
                $f->created_at = $row['created_at'];
                $f->save();
                $foods[$row['id']] = $f;
            }
            foreach ($data['food_versions'] as $row) {
                $version = FoodVersion::create(['food_id' => $foods[$row['food_id']]->id, 'legacy_id' => $row['id'], 'calories' => $row['calories'], 'protein' => $row['protein_g'], 'fat' => $row['fat_g'], 'carbs' => $row['carbs_g'], 'source_type' => $row['source_type'], 'source_note' => $row['source_note'], 'is_estimate' => (bool) $row['is_estimate']]);
                $version->created_at = $row['created_at'];
                $version->save();
                $versions[$row['id']] = $version;
            }
            foreach ($data['foods'] as $row) {
                $foods[$row['id']]->update(['current_version_id' => $versions[$row['current_version_id']]->id]);
            }
            $expected = [];
            $sourceVersions = collect($data['food_versions'])->keyBy('id');
            $sourceFoods = collect($data['foods'])->keyBy('id');
            foreach ($data['meal_entries'] as $row) {
                $food = $foods[$row['food_id']];
                $version = $food->currentVersion;
                if (MealEntry::withTrashed()->whereKey($row['id'])->exists()) {
                    throw new \RuntimeException('Legacy meal ID collision.');
                }
                $meal = new MealEntry(['workspace_id' => $workspace, 'user_id' => $user->id, 'food_version_id' => $version->id, 'legacy_id' => $row['id'], 'date' => $row['entry_date'], 'meal' => $row['meal'], 'qty' => $row['qty'], 'unit' => $row['unit'], 'note' => $row['note'], 'migration_baseline' => true]);
                $meal->id = $row['id'];
                $meal->created_at = $row['created_at'];
                $meal->save();
                foreach (['calories', 'protein', 'fat', 'carbs'] as $key) {
                    $sourceKey = $key === 'calories' ? 'calories' : $key.'_g';
                    $original = $sourceVersions[$sourceFoods[$row['food_id']]['current_version_id']];
                    $expected[$row['entry_date']][$key] = ($expected[$row['entry_date']][$key] ?? 0) + (float) $row['qty'] * (float) $original[$sourceKey];
                }
            }
            $actual = [];
            foreach (MealEntry::where('user_id', $user->id)->with('version')->get() as $meal) {
                foreach (['calories', 'protein', 'fat', 'carbs'] as $key) {
                    $date = $meal->date->toDateString();
                    $actual[$date][$key] = ($actual[$date][$key] ?? 0) + (float) $meal->qty * (float) $meal->version->$key;
                }
            }
            foreach ($expected as $date => $totals) {
                foreach ($totals as $key => $value) {
                    if (abs(round($value, 2) - round($actual[$date][$key] ?? -1, 2)) > 0.001) {
                        throw new \RuntimeException('Nutrition total verification failed for '.$date.' '.$key);
                    }
                }
            }
            if (Food::where('user_id', $user->id)->count() !== count($data['foods']) || FoodVersion::whereIn('food_id', array_map(fn ($food) => $food->id, $foods))->count() !== count($data['food_versions']) || MealEntry::where('user_id', $user->id)->count() !== count($data['meal_entries'])) {
                throw new \RuntimeException('Nutrition row-count verification failed.');
            }
            AuditEvent::create(['workspace_id' => $workspace, 'user_id' => $user->id, 'action' => 'nutrition.imported', 'entity_type' => 'user', 'entity_id' => $user->id, 'details' => ['sha256' => $hash, 'counts' => array_map('count', $data), 'days_verified' => count($expected), 'binding' => 'legacy-current-version-at-migration']]);
        });
        $this->info('Imported and verified '.count($data['foods']).' foods, '.count($data['food_versions']).' versions, and '.count($data['meal_entries']).' meal entries.');

        return self::SUCCESS;
    }
}

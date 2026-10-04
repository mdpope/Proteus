<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\Capture;
use App\Models\MaintenanceTask;
use App\Models\ServiceRecord;
use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ImportGarage extends Command
{
    protected $signature = 'brain:import-garage {email} {manifest}';

    protected $description = 'Idempotently import the bounded, reviewed private notes garage snapshot.';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->firstOrFail();
        $workspace = $user->current_workspace_id;
        $path = realpath($this->argument('manifest'));
        $manifest = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        foreach ($manifest['vehicles'] as $v) {
            DB::transaction(function () use ($v, $user, $workspace, $path) {
                $vehicle = Vehicle::firstOrCreate(['workspace_id' => $workspace, 'source_key' => $v['source_key']], array_intersect_key($v, array_flip(['name', 'year', 'kind', 'fuel_type', 'vin', 'notes'])));
                foreach ($v['records'] as $r) {
                    $record = ServiceRecord::firstOrCreate(['workspace_id' => $workspace, 'source_key' => $r['source_key']], ['vehicle_id' => $vehicle->id, 'created_by' => $user->id] + array_intersect_key($r, array_flip(['kind', 'title', 'occurred_on', 'date_precision', 'odometer', 'odometer_approximate', 'cost', 'vendor', 'parts', 'notes'])));
                    if (! $r['files']) {
                        continue;
                    }
                    $capture = Capture::firstOrCreate(['workspace_id' => $workspace, 'created_by' => $user->id, 'idempotency_key' => $r['source_key']], ['vehicle_id' => $vehicle->id, 'kind' => $r['kind'] === 'purchase' ? 'receipt' : 'service', 'source' => 'cerebro', 'status' => 'saved', 'title' => $r['title'], 'notes' => $r['notes'], 'payload' => array_intersect_key($r, array_flip(['occurred_on', 'date_precision', 'odometer', 'cost', 'vendor', 'parts'])), 'uncertainties' => [], 'request_hash' => hash('sha256', json_encode($r)), 'accepted_at' => now()]);
                    $record->update(['capture_id' => $capture->id]);
                    foreach ($r['files'] as $f) {
                        $file = realpath(dirname($path).'/'.$f['file']);
                        if (! $file || ! str_starts_with($file, dirname($path).DIRECTORY_SEPARATOR) || ! hash_equals($f['sha256'], hash_file('sha256', $file))) {
                            throw new \RuntimeException('Evidence checksum or path mismatch.');
                        }
                        if ($capture->attachments()->where('sha256', $f['sha256'])->exists()) {
                            continue;
                        }
                        $dest = 'evidence/'.$workspace.'/'.$f['sha256'];
                        $stream = fopen($file, 'rb');
                        try {
                            Storage::disk('local')->put($dest, $stream);
                        } finally {
                            fclose($stream);
                        }
                        Attachment::create(['workspace_id' => $workspace, 'capture_id' => $capture->id, 'original_name' => $f['name'], 'path' => $dest, 'mime_type' => (new \finfo(FILEINFO_MIME_TYPE))->file($file), 'bytes' => filesize($file), 'sha256' => $f['sha256']]);
                    }
                }
                foreach ($v['tasks'] as $task) {
                    MaintenanceTask::firstOrCreate(['workspace_id' => $workspace, 'source_key' => $task['source_key']], ['vehicle_id' => $vehicle->id] + array_intersect_key($task, array_flip(['title', 'notes'])));
                }
            });
        }
        $this->info('Garage import verified: '.Vehicle::where('workspace_id', $workspace)->count().' vehicles; '.ServiceRecord::where('workspace_id', $workspace)->count().' history records.');

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Attachment;
use App\Models\User;
use App\Models\Vehicle;
use App\Services\CaptureIngestor;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ImportOilAnalysis extends Command
{
    protected $signature = 'brain:import-oil-analysis {email} {manifest}';

    protected $description = 'Import reviewed oil samples and checksum-verified original PDFs, safely repeatable.';

    public function handle(CaptureIngestor $ingestor): int
    {
        $user = User::where('email', $this->argument('email'))->firstOrFail();
        $manifestPath = realpath($this->argument('manifest'));
        if (! $manifestPath) {
            throw new \RuntimeException('Manifest missing.');
        }
        $manifest = json_decode(file_get_contents($manifestPath), true, 512, JSON_THROW_ON_ERROR);
        Validator::make($manifest, ['records' => 'required|array|max:100', 'records.*.vehicle_source_key' => 'required|string', 'records.*.capture' => 'required|array', 'records.*.files' => 'required|array|min:1|max:12', 'records.*.files.*.file' => 'required|string', 'records.*.files.*.name' => 'required|string|max:200', 'records.*.files.*.sha256' => 'required|regex:/^[a-f0-9]{64}$/'])->validate();
        $prepared = [];
        // Verify every source before any database or file writes.
        foreach ($manifest['records'] as $record) {
            $vehicle = Vehicle::where('workspace_id', $user->current_workspace_id)->where('source_key', $record['vehicle_source_key'])->firstOrFail();
            $input = $record['capture'];
            $input['vehicle_id'] = $vehicle->id;
            Validator::make($input, $ingestor->rules())->validate();
            if ($input['kind'] !== 'oil_analysis' || ! $input['clear_match'] || $input['uncertainties'] || $ingestor->issues('oil_analysis', $vehicle, $input['data'])) {
                throw new \RuntimeException('Import requires reviewed, complete oil sample metadata.');
            }
            foreach ($record['files'] as &$file) {
                $file['path'] = realpath(dirname($manifestPath).'/'.$file['file']);
                if (! $file['path'] || ! str_starts_with($file['path'], dirname($manifestPath).DIRECTORY_SEPARATOR) || ! is_file($file['path']) || ! hash_equals($file['sha256'], hash_file('sha256', $file['path'])) || (new \finfo(FILEINFO_MIME_TYPE))->file($file['path']) !== 'application/pdf') {
                    throw new \RuntimeException('Original PDF path, type or checksum mismatch.');
                }
            }
            unset($file);
            $prepared[] = ['input' => $input, 'files' => $record['files']];
        }
        $createdPaths = [];
        try {
            DB::transaction(function () use ($prepared, $user, $ingestor, &$createdPaths) {
                foreach ($prepared as $record) {
                    $capture = $ingestor->ingest($user, $record['input'], 'cerebro');
                    foreach ($record['files'] as $file) {
                        if ($capture->attachments()->where('sha256', $file['sha256'])->exists()) {
                            continue;
                        }
                        $path = 'evidence/'.$capture->workspace_id.'/oil-analysis/'.Str::uuid().'.pdf';
                        $stream = fopen($file['path'], 'rb');
                        try {
                            $createdPaths[] = $path;
                            if (! Storage::disk('local')->put($path, $stream)) {
                                throw new \RuntimeException('Could not preserve original PDF.');
                            }
                        } finally {
                            fclose($stream);
                        }
                        Attachment::create(['workspace_id' => $capture->workspace_id, 'capture_id' => $capture->id, 'original_name' => basename($file['name']), 'path' => $path, 'mime_type' => 'application/pdf', 'bytes' => filesize($file['path']), 'sha256' => $file['sha256']]);
                    }
                }
            });
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($createdPaths);
            throw $e;
        }
        $this->info('Oil analysis import verified: '.count($prepared).' samples; originals preserved.');

        return self::SUCCESS;
    }
}

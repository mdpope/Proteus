<?php

namespace Tests\Feature;

use App\Mcp\Servers\BrainServer;
use App\Mcp\Tools\SubmitCapture;
use App\Mcp\Tools\VehicleHistory;
use App\Models\Capture;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\CreatesBrain;
use Tests\TestCase;

class OilAnalysisTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    private function sample(int $vehicle): array
    {
        return ['kind' => 'oil_analysis', 'vehicle_id' => $vehicle, 'title' => 'Oil report', 'idempotency_key' => 'test-oil-1', 'clear_match' => true, 'uncertainties' => [], 'data' => ['analysis_status' => 'reported', 'lab' => 'Test laboratory', 'sample_date' => '2025-05-24', 'report_date' => '2025-06-11', 'report_number' => 'TEST-1', 'odometer' => 96000, 'oil_miles' => 2000, 'measurements' => [['name' => 'Fuel', 'value' => '<0.5', 'unit' => '%', 'reference' => '<2.0'], ['name' => 'Insolubles', 'value' => 'TR', 'unit' => '%']]]];
    }

    public function test_report_retains_dates_and_censored_values_without_creating_maintenance(): void
    {
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        $this->signedIn($user);
        $input = $this->sample($vehicle->id);
        $this->postJson('/captures', $input)->assertCreated()->assertJsonPath('status', 'saved');
        $this->postJson('/captures', $input)->assertCreated();
        $this->assertDatabaseCount('captures', 1);
        $this->assertDatabaseCount('service_records', 0);
        $capture = Capture::first();
        $this->assertSame('<0.5', $capture->payload['measurements'][0]['value']);
        $this->get('/garage/'.$vehicle->id)->assertOk()->assertSee('2025-05-24')->assertSee('2025-06-11')->assertSee('&lt;0.5', false)->assertSee('TR');
        $this->get('/captures/'.$capture->id)->assertOk()->assertSee('Save changes');
        BrainServer::actingAs($user)->tool(VehicleHistory::class, ['vehicle_id' => $vehicle->id])->assertSee('oil_analyses')->assertSee('TEST-1');
        $input['idempotency_key'] = 'test-mcp';
        BrainServer::actingAs($user)->tool(SubmitCapture::class, $input)->assertSee('saved');
    }

    public function test_incomplete_or_contradictory_reports_wait_for_review(): void
    {
        $u = $this->owner();
        $v = $this->vehicleFor($u);
        $this->signedIn($u);
        $input = $this->sample($v->id);
        unset($input['data']['report_number']);
        $this->postJson('/captures', $input)->assertJsonPath('status', 'review');
        $input = $this->sample($v->id);
        $input['idempotency_key'] = 'dates';
        $input['data']['report_date'] = '2025-01-01';
        $this->postJson('/captures', $input)->assertJsonPath('status', 'review');
        $input['idempotency_key'] = 'negative';
        $input['data']['oil_miles'] = -1;
        $this->postJson('/captures', $input)->assertUnprocessable()->assertJsonValidationErrors('data.oil_miles');
    }

    public function test_pending_sample_can_receive_report_without_losing_original_files(): void
    {
        Storage::fake('local');
        $u = $this->owner();
        $v = $this->vehicleFor($u);
        $this->signedIn($u);
        $input = $this->sample($v->id);
        $input['data'] = ['analysis_status' => 'awaiting_mailing', 'lab' => 'Test laboratory', 'sample_date' => '2025-05-24', 'collection_notes' => 'Possibly contaminated collection container.'];
        $input['files'] = [UploadedFile::fake()->createWithContent('sample.pdf', "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")];
        $this->post('/captures', $input)->assertRedirect();
        $capture = Capture::first();
        $this->assertSame('saved', $capture->status);
        $report = $this->sample($v->id);
        $report['data']['collection_notes'] = $input['data']['collection_notes'];
        $report['files'] = [UploadedFile::fake()->createWithContent('report.pdf', "%PDF-1.4\n2 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF")];
        $this->post('/captures/'.$capture->id.'/accept', $report)->assertRedirect();
        $this->assertDatabaseCount('captures', 1);
        $this->assertSame('reported', $capture->fresh()->payload['analysis_status']);
        $this->assertSame(2, $capture->attachments()->count());
        $file = $capture->attachments()->first();
        $response = $this->get('/attachments/'.$file->id)->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertStringStartsWith('inline;', $response->headers->get('Content-Disposition'));
        $this->get('/attachments/'.$file->id.'?download=1')->assertDownload('sample.pdf');
        $this->get('/captures/'.$capture->id)->assertSee('target="_blank" rel="noopener noreferrer"', false);
        $this->signedIn($this->owner())->get('/attachments/'.$file->id)->assertNotFound();
        $this->get('/garage/'.$v->id)->assertNotFound();
        $this->post('/captures/'.$capture->id.'/accept', $report)->assertNotFound();
        $this->app['auth']->forgetGuards();
        $this->get('/attachments/'.$file->id)->assertRedirect('/login');
    }

    public function test_reader_cannot_create_and_contributor_cannot_edit_saved_analysis(): void
    {
        $viewer = $this->owner('viewer');
        $v = $this->vehicleFor($viewer);
        $this->signedIn($viewer)->postJson('/captures', $this->sample($v->id))->assertForbidden();
        $u = $this->owner('contributor');
        $v = $this->vehicleFor($u);
        $this->signedIn($u);
        $this->postJson('/captures', $this->sample($v->id))->assertCreated();
        $this->post('/captures/'.Capture::first()->id.'/accept', $this->sample($v->id))->assertForbidden();
    }

    public function test_import_checks_all_pdf_hashes_before_writing_and_is_repeatable(): void
    {
        Storage::fake('local');
        $u = $this->owner();
        $v = $this->vehicleFor($u);
        $v->update(['source_key' => 'test-car']);
        $dir = Storage::disk('local')->path('import');
        mkdir($dir, 0700, true);
        $pdf = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
        file_put_contents($dir.'/report.pdf', $pdf);
        $record = ['vehicle_source_key' => 'test-car', 'capture' => $this->sample($v->id), 'files' => [['file' => 'report.pdf', 'name' => 'report.pdf', 'sha256' => hash('sha256', $pdf)]]];
        $manifest = $dir.'/manifest.json';
        file_put_contents($manifest, json_encode(['records' => [$record]]));
        $this->artisan('brain:import-oil-analysis', ['email' => $u->email, 'manifest' => $manifest])->assertSuccessful();
        $this->artisan('brain:import-oil-analysis', ['email' => $u->email, 'manifest' => $manifest])->assertSuccessful();
        $this->assertDatabaseCount('captures', 1);
        $this->assertDatabaseCount('attachments', 1);
        $record['capture']['idempotency_key'] = 'second';
        $record['files'][0]['sha256'] = str_repeat('0', 64);
        file_put_contents($manifest, json_encode(['records' => [$record]]));
        try {
            $this->artisan('brain:import-oil-analysis', ['email' => $u->email, 'manifest' => $manifest])->run();
            $this->fail('Invalid evidence accepted.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('checksum mismatch', $e->getMessage());
        }
        $this->assertDatabaseCount('captures', 1);
    }
}

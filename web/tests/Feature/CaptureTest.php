<?php

namespace Tests\Feature;

use App\Mcp\Servers\BrainServer;
use App\Mcp\Tools\ListVehicles;
use App\Mcp\Tools\SubmitCapture;
use App\Models\Capture;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class CaptureTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    private function receipt(int $id): array
    {
        return ['kind' => 'receipt', 'vehicle_id' => $id, 'title' => 'Water pump', 'idempotency_key' => 'receipt-001', 'clear_match' => true, 'uncertainties' => [], 'data' => ['occurred_on' => '2026-06-27', 'cost' => 100.25, 'vendor' => 'Parts supplier']];
    }

    public function test_clear_receipt_saves_as_purchase_and_retry_does_not_duplicate(): void
    {
        $user = $this->owner();
        $v = $this->vehicleFor($user);
        Passport::actingAs($user, ['brain:write']);
        $payload = $this->receipt($v->id);
        $this->postJson('/api/v1/captures', $payload)->assertCreated()->assertJsonPath('status', 'saved');
        $this->postJson('/api/v1/captures', $payload)->assertCreated();
        $this->assertDatabaseCount('captures', 1);
        $this->assertDatabaseHas('service_records', ['kind' => 'purchase', 'title' => 'Water pump', 'cost' => 100.25]);
        $payload['data']['cost'] = 200;
        $this->postJson('/api/v1/captures', $payload)->assertConflict();
    }

    public function test_uncertain_receipt_waits_and_review_saves_once(): void
    {
        $user = $this->owner();
        $v = $this->vehicleFor($user);
        $payload = $this->receipt($v->id);
        $payload['uncertainties'] = ['Vehicle unclear'];
        Passport::actingAs($user, ['brain:write']);
        $response = $this->postJson('/api/v1/captures', $payload)->assertJsonPath('status', 'review');
        $this->assertDatabaseCount('service_records', 0);
        $this->signedIn($user)->post('/captures/'.$response->json('id').'/accept', $payload)->assertRedirect();
        $this->assertDatabaseCount('service_records', 1);
    }

    public function test_inconsistent_fuel_stays_in_review(): void
    {
        $user = $this->owner();
        $v = $this->vehicleFor($user);
        Passport::actingAs($user, ['brain:write']);
        $p = $this->receipt($v->id);
        $p['kind'] = 'fuel';
        $p['data'] = ['filled_at' => '2026-06-27 12:00', 'odometer' => 10000, 'gallons' => 10, 'price_per_gallon' => 3, 'total_cost' => 80, 'fuel_type' => 'gas', 'full_tank' => true];
        $this->postJson('/api/v1/captures', $p)->assertJsonPath('status', 'review');
        $this->assertDatabaseCount('fuel_fills', 0);
    }

    public function test_reader_cannot_write_and_other_account_vehicle_is_rejected(): void
    {
        $viewer = $this->owner('viewer');
        $vehicle = $this->vehicleFor($viewer);
        Passport::actingAs($viewer, ['brain:write']);
        $this->postJson('/api/v1/captures', $this->receipt($vehicle->id))->assertForbidden();
        $other = $this->owner();
        Passport::actingAs($other, ['brain:write']);
        $this->postJson('/api/v1/captures', $this->receipt($vehicle->id))->assertNotFound();
        $this->assertDatabaseCount('captures', 0);
    }

    public function test_original_file_is_private_and_cannot_cross_accounts(): void
    {
        Storage::fake('local');
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        $this->signedIn($user);
        $p = $this->receipt($vehicle->id);
        $p['files'] = [UploadedFile::fake()->image('receipt.jpg')];
        $this->post('/captures', $p)->assertRedirect();
        $file = Capture::first()->attachments()->first();
        Storage::disk('local')->assertExists($file->path);
        $this->get('/attachments/'.$file->id)->assertDownload('receipt.jpg');
        $other = $this->owner();
        $this->signedIn($other)->get('/attachments/'.$file->id)->assertNotFound();
    }

    public function test_mcp_tools_use_same_tenant_and_validation_boundaries(): void
    {
        $user = $this->owner();
        $vehicle = $this->vehicleFor($user);
        BrainServer::actingAs($user)->tool(ListVehicles::class)->assertSee('Test vehicle');
        BrainServer::actingAs($user)->tool(SubmitCapture::class, $this->receipt($vehicle->id))->assertSee('saved');
        $this->assertDatabaseCount('service_records', 1);
    }
}

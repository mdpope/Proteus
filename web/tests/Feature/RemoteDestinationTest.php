<?php

namespace Tests\Feature;

use App\Models\RemoteDestination;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\CreatesBrain;
use Tests\TestCase;

class RemoteDestinationTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['remote.relay_url' => 'wss://relay.example.test', 'app.debug' => false]);
    }

    private function payload(array $changes = []): array
    {
        return array_replace([
            'hostId' => '11111111-1111-4111-8111-111111111111',
            'relay' => 'wss://relay.example.test', 'label' => 'Synthetic Mac',
            'deviceId' => '22222222-2222-4222-8222-222222222222', 'key' => str_repeat('a', 64),
            'pairedAt' => '2026-10-04T00:00:00.000Z',
        ], $changes);
    }

    private function account(User $user): string
    {
        return hash_hmac('sha256', 'proteus-browser:'.$user->id, config('app.key'));
    }

    private function authorize(User $user): static
    {
        return $this->signedIn($user)->withHeader('X-Proteus-Account', $this->account($user));
    }

    public function test_destinations_require_authenticated_strong_session_and_expected_account(): void
    {
        $host = $this->payload()['hostId'];
        $this->getJson('/remote/destinations')->assertUnauthorized();
        $this->getJson('/remote/destinations/'.$host.'/credential')->assertUnauthorized();
        $this->postJson('/remote/destinations', $this->payload())->assertUnauthorized();
        $this->deleteJson('/remote/destinations/'.$host, ['deviceId' => $this->payload()['deviceId']])->assertUnauthorized();
        $user = $this->owner();
        $this->actingAs($user)->getJson('/remote/destinations')->assertRedirect('/security');
        $this->postJson('/remote/destinations', $this->payload())->assertRedirect('/security');
        $this->signedIn($user)->getJson('/remote/destinations')->assertConflict();
        $this->authorize($user)->getJson('/remote/destinations')->assertOk()->assertExactJson(['destinations' => []]);
    }

    public function test_secret_is_encrypted_at_rest_hidden_from_serialization_and_released_only_explicitly(): void
    {
        $user = $this->owner(); $payload = $this->payload();
        $saved = $this->authorize($user)->postJson('/remote/destinations', $payload)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->assertArrayNotHasKey('key', $saved->json());
        $row = RemoteDestination::firstOrFail();
        $raw = DB::table('remote_destinations')->value('credential');
        $this->assertNotSame($payload['key'], $raw);
        $this->assertStringNotContainsString($payload['key'], $raw);
        $this->assertArrayNotHasKey('credential', $row->toArray());
        $this->assertStringNotContainsString($payload['key'], $row->toJson());
        $listed = $this->getJson('/remote/destinations')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->json('destinations');
        $this->assertSame(['hostId', 'relay', 'label', 'deviceId', 'pairedAt'], array_keys($listed[0]));
        $this->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('key', $payload['key']);
        $this->post('/logout')->assertRedirect();
        $this->assertDatabaseCount('remote_destinations', 1);
        $this->authorize($user)->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertOk()->assertJsonPath('key', $payload['key']);
    }

    public function test_account_isolation_and_stale_page_binding_apply_before_reads_and_mutations(): void
    {
        $first = $this->owner(); $second = $this->owner(); $payload = $this->payload();
        $this->authorize($first)->postJson('/remote/destinations', $payload)->assertOk();
        $this->authorize($second)->getJson('/remote/destinations')->assertExactJson(['destinations' => []]);
        $this->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertNotFound();
        $this->deleteJson('/remote/destinations/'.$payload['hostId'], ['deviceId' => $payload['deviceId']])->assertNotFound();
        $this->withHeader('X-Proteus-Account', $this->account($first));
        $this->getJson('/remote/destinations')->assertConflict();
        $this->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertConflict();
        $this->postJson('/remote/destinations', $payload)->assertConflict();
        $this->deleteJson('/remote/destinations/'.$payload['hostId'], ['deviceId' => $payload['deviceId']])->assertConflict();
        $this->assertDatabaseCount('remote_destinations', 1);
        $this->authorize($second)->postJson('/remote/destinations', $this->payload(['key' => str_repeat('b', 64), 'user_id' => $first->id]))->assertOk();
        $this->assertDatabaseCount('remote_destinations', 2);
        $this->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertJsonPath('key', str_repeat('b', 64));
        $this->authorize($first)->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertJsonPath('key', str_repeat('a', 64));
    }

    public function test_upsert_retains_order_and_stale_delete_cannot_remove_a_replacement(): void
    {
        $this->authorize($this->owner()); $a = $this->payload(); $b = $this->payload(['hostId' => (string) Str::uuid(), 'label' => 'Second Mac']);
        $this->postJson('/remote/destinations', $a)->assertOk();
        $this->postJson('/remote/destinations', $b)->assertOk();
        $replacement = $this->payload(['deviceId' => (string) Str::uuid(), 'key' => str_repeat('c', 64), 'label' => 'Repaired Mac']);
        $this->postJson('/remote/destinations', $replacement)->assertOk();
        $this->assertDatabaseCount('remote_destinations', 2);
        $this->assertSame([$a['hostId'], $b['hostId']], array_column($this->getJson('/remote/destinations')->json('destinations'), 'hostId'));
        $this->deleteJson('/remote/destinations/'.$a['hostId'], ['deviceId' => $a['deviceId']])->assertConflict();
        $this->getJson('/remote/destinations/'.$a['hostId'].'/credential')->assertJsonPath('key', $replacement['key']);
        $this->deleteJson('/remote/destinations/'.$a['hostId'], [])->assertUnprocessable();
        $this->deleteJson('/remote/destinations/'.$a['hostId'], ['deviceId' => $replacement['deviceId']])->assertOk()->assertExactJson(['removed' => true]);
        $this->getJson('/remote/destinations/'.$a['hostId'].'/credential')->assertNotFound();
        $this->assertDatabaseCount('remote_destinations', 1);
    }

    public function test_invalid_and_oversized_input_never_echoes_or_flashes_credentials(): void
    {
        $this->authorize($this->owner()); $key = str_repeat('a', 64);
        foreach ([['hostId' => 'bad'], ['deviceId' => 'bad'], ['key' => 'NOT_A_SECRET_KEY'], ['label' => str_repeat('L', 81)], ['label' => "bad\nlabel"], ['label' => ' '], ['relay' => 'wss://other.example.test'], ['relay' => 'wss://user:password@relay.example.test'], ['pairedAt' => 'invalid']] as $change) {
            $response = $this->postJson('/remote/destinations', $this->payload($change))->assertUnprocessable();
            $this->assertStringNotContainsString($key, $response->getContent());
            $this->assertStringNotContainsString('NOT_A_SECRET_KEY', $response->getContent());
            $this->assertFalse(session()->has('_old_input.key'));
        }
        $this->postJson('/remote/destinations', $this->payload(['label' => str_repeat('L', 13_000)]))->assertStatus(413);
        $this->assertDatabaseCount('remote_destinations', 0);
    }

    public function test_count_bound_allows_replacing_existing_destination_and_corrupt_credentials_are_preserved(): void
    {
        $this->authorize($this->owner()); $last = null;
        for ($i = 0; $i < 32; $i++) {
            $last = $this->payload(['hostId' => (string) Str::uuid()]);
            $this->postJson('/remote/destinations', $last)->assertOk();
        }
        $this->postJson('/remote/destinations', $this->payload())->assertUnprocessable();
        $this->postJson('/remote/destinations', array_replace($last, ['label' => 'Replacement']))->assertOk();
        DB::table('remote_destinations')->where('host_id', $last['hostId'])->update(['credential' => 'corrupt-encrypted-record']);
        $this->getJson('/remote/destinations')->assertOk()->assertJsonCount(32, 'destinations');
        $this->getJson('/remote/destinations/'.$last['hostId'].'/credential')->assertStatus(503)->assertDontSee('corrupt-encrypted-record');
        $this->assertSame('corrupt-encrypted-record', DB::table('remote_destinations')->where('host_id', $last['hostId'])->value('credential'));
    }

    public function test_migration_rollback_preserves_saved_account_credentials(): void
    {
        $this->authorize($this->owner()); $payload = $this->payload();
        $this->postJson('/remote/destinations', $payload)->assertOk();
        $migration = require database_path('migrations/2026_10_05_000002_create_remote_destinations_table.php');
        $migration->down();
        $this->assertDatabaseCount('remote_destinations', 1);
        $this->getJson('/remote/destinations/'.$payload['hostId'].'/credential')->assertOk()->assertJsonPath('key', $payload['key']);
    }

    public function test_web_csrf_protects_create_and_delete_without_changing_test_database(): void
    {
        $this->authorize($this->owner()); $payload = $this->payload();
        // Only disable Laravel's test-only CSRF bypass. Database/storage remain disposable fixtures.
        $this->app->instance('env', 'local');
        $this->postJson('/remote/destinations', $payload)->assertStatus(419)->assertDontSee($payload['key']);
        $token = 'synthetic-csrf-token';
        $this->withSession(['_token' => $token])->withHeader('X-CSRF-TOKEN', $token)->postJson('/remote/destinations', $payload)->assertOk();
        $this->withHeader('X-CSRF-TOKEN', 'wrong')->deleteJson('/remote/destinations/'.$payload['hostId'], ['deviceId' => $payload['deviceId']])->assertStatus(419);
        $this->assertDatabaseCount('remote_destinations', 1);
        $this->withHeader('X-CSRF-TOKEN', $token)->deleteJson('/remote/destinations/'.$payload['hostId'], ['deviceId' => $payload['deviceId']])->assertOk();
    }
}

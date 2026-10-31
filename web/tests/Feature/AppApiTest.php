<?php

namespace Tests\Feature;

use App\Services\AppRecords;
use App\Services\PushDelivery;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class AppApiTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    public function test_explicit_scopes_and_account_binding_are_required(): void
    {
        $this->getJson('/api/v1/app')->assertUnauthorized();
        $user = $this->owner();
        Passport::actingAs($user, ['brain:read', 'brain:write']);
        $this->getJson('/api/v1/app')->assertForbidden();
        $this->postJson('/api/v1/app/links', [])->assertForbidden();
        Passport::actingAs($user, ['app:read']);
        $this->getJson('/api/v1/app')->assertOk()->assertJsonPath('preferences.defaultMacId', null)->assertJsonPath('preferences.allowanceDisplay', 'compact');
        $this->putJson('/api/v1/app/preferences', ['timezone' => 'America/Denver'])->assertForbidden();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->putJson('/api/v1/app/preferences', ['expectedAccountId' => str_repeat('f', 64), 'timezone' => 'America/Denver'])->assertConflict();
        $nativeHost = (string) Str::uuid();
        $this->putJson('/api/v1/app/preferences', ['defaultMacId' => $nativeHost])->assertOk()->assertJsonPath('defaultMacId', $nativeHost);
        $this->assertDatabaseCount('remote_destinations', 0);
        $this->putJson('/api/v1/app/preferences', ['timezone' => 'America/Denver', 'allowanceDisplay' => 'collapsed'])->assertOk();
        $this->getJson('/api/v1/app')->assertJsonPath('preferences.timezone', 'America/Denver')->assertJsonPath('preferences.allowanceDisplay', 'collapsed');
    }

    public function test_shared_lists_enforce_revisions_and_account_isolation(): void
    {
        $user = $this->owner();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $input = ['name' => 'Synthetic team', 'instructions' => 'Share one update', 'timezone' => 'America/Denver', 'members' => [['id' => 'alex', 'name' => 'Alex', 'mode' => 'fixed'], ['id' => 'sam', 'name' => 'Sam', 'mode' => 'random']], 'links' => [['id' => 'tool', 'title' => 'Tool', 'url' => 'https://example.test/board?view=team']]];
        $created = $this->postJson('/api/v1/app/team-lists', $input)->assertCreated()->assertJsonPath('revision', 1)->assertJsonPath('links.0.url', 'https://example.test/board?view=team')->json();
        $this->putJson('/api/v1/app/team-lists/'.$created['id'], $input + ['expectedRevision' => 1])->assertOk()->assertJsonPath('revision', 2);
        $this->putJson('/api/v1/app/team-lists/'.$created['id'], $input + ['expectedRevision' => 1])->assertConflict();
        $this->deleteJson('/api/v1/app/team-lists/'.$created['id'])->assertUnprocessable();
        $this->deleteJson('/api/v1/app/team-lists/'.$created['id'], ['expectedRevision' => 1])->assertConflict();
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $this->getJson('/api/v1/app/team-lists')->assertExactJson(['items' => []]);
        $this->deleteJson('/api/v1/app/team-lists/'.$created['id'])->assertNotFound();
        $this->putJson('/api/v1/app/team-lists/'.$created['id'], $input + ['expectedRevision' => 2])->assertNotFound();
        $this->assertDatabaseCount('app_records', 1);
        $this->assertStringNotContainsString('Synthetic team', DB::table('app_records')->value('payload'));
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->deleteJson('/api/v1/app/team-lists/'.$created['id'], ['expectedRevision' => 2])->assertOk();
        $this->assertDatabaseCount('app_records', 0);
    }

    public function test_bootstrap_excludes_collections_and_opt_in_pages_detect_changes(): void
    {
        $user = $this->owner();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $records = app(AppRecords::class);
        $links = [];
        for ($i = 0; $i < 5; $i++) {
            $links[] = $records->save($user, 'links', ['title' => 'Link '.$i, 'url' => 'https://example.test/'.$i]);
        }
        $bootstrap = $this->getJson('/api/v1/app?view=bootstrap')->assertOk()->assertJsonMissingPath('links')->assertJsonMissingPath('logs')->assertJsonPath('displayName', $user->name)->json();
        $this->getJson('/api/v1/app?view=bootstrap&include=links')->assertOk()->assertJsonCount(5, 'links')->assertJsonMissingPath('history')->assertJsonPath('accountId', $bootstrap['accountId']);
        $first = $this->getJson('/api/v1/app/links?pageSize=2')->assertOk()->assertJsonCount(2, 'items')->assertJsonPath('total', 5)->assertJsonPath('hasMore', true)->json();
        $second = $this->getJson('/api/v1/app/links?pageSize=2&page=2&expectedRevision='.$first['collectionRevision'])->assertOk()->assertJsonCount(2, 'items')->json();
        $this->assertEmpty(array_intersect(array_column($first['items'], 'id'), array_column($second['items'], 'id')));
        $this->putJson('/api/v1/app/links/'.$links[0]['id'], ['title' => 'Changed', 'url' => $links[0]['url'], 'expectedRevision' => 1])->assertOk();
        $this->getJson('/api/v1/app/links?pageSize=2&page=2&expectedRevision='.$first['collectionRevision'])->assertConflict();
        $this->deleteJson('/api/v1/app/links/'.$links[0]['id'], ['expectedRevision' => 1])->assertConflict();
        $this->deleteJson('/api/v1/app/links/'.$links[0]['id'], ['expectedRevision' => 2])->assertOk();
        $this->getJson('/api/v1/app/links?pageSize=101')->assertUnprocessable();
        $this->getJson('/api/v1/app?include=secret')->assertUnprocessable();
        $this->getJson('/api/v1/app')->assertOk()->assertJsonCount(4, 'links')->assertJsonPath('history', []);
    }

    public function test_browser_profiles_require_scope_and_revisions_and_exclude_credentials(): void
    {
        $user = $this->owner();
        Passport::actingAs($user, ['app:read']);
        $this->postJson('/api/v1/app/browser-profiles', ['name' => 'Research'])->assertForbidden();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->postJson('/api/v1/app/browser-profiles', ['name' => 'Default'])->assertUnprocessable();
        $input = ['name' => 'Research', 'settings' => ['blockingEnabled' => true, 'exceptions' => ['https://example.test']]];
        $created = $this->postJson('/api/v1/app/browser-profiles', $input + ['cookies' => 'must not persist'])->assertCreated()->assertJsonPath('revision', 1)->assertJsonMissingPath('cookies')->json();
        $this->putJson('/api/v1/app/browser-profiles/'.$created['id'], $input + ['expectedRevision' => 1])->assertOk()->assertJsonPath('revision', 2);
        $this->deleteJson('/api/v1/app/browser-profiles/'.$created['id'], ['expectedRevision' => 1])->assertConflict();
        $this->postJson('/api/v1/app/browser-profiles', ['name' => 'Other', 'settings' => ['cookies' => 'private']])->assertUnprocessable();
        $this->postJson('/api/v1/app/browser-profiles', ['name' => 'Other', 'settings' => ['exceptions' => ['https://user:secret@example.test']]])->assertUnprocessable();
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $this->getJson('/api/v1/app/browser-profiles')->assertExactJson(['items' => []]);
        $this->putJson('/api/v1/app/browser-profiles/'.$created['id'], $input + ['expectedRevision' => 2])->assertNotFound();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->deleteJson('/api/v1/app/browser-profiles/'.$created['id'], ['expectedRevision' => 2])->assertOk();
        $this->getJson('/api/v1/app/browser-profiles')->assertExactJson(['items' => []]);
    }

    public function test_empty_browser_profile_settings_keep_json_object_shape(): void
    {
        $user = $this->owner();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $created = $this->postJson('/api/v1/app/browser-profiles', ['name' => 'Empty settings', 'settings' => (object) []])->assertCreated();
        $this->assertStringContainsString('"settings":{}', $created->getContent());
        $list = $this->getJson('/api/v1/app/browser-profiles')->assertOk();
        $this->assertStringContainsString('"settings":{}', $list->getContent());
        $this->putJson('/api/v1/app/browser-profiles/'.$created->json('id'), ['name' => 'Renamed', 'settings' => (object) [], 'expectedRevision' => 1])->assertOk();
        $this->getJson('/api/v1/app')->assertOk()->assertJsonPath('browserProfiles.0.name', 'Renamed');
    }

    public function test_history_rejects_auth_urls_and_strips_query_and_fragment(): void
    {
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        foreach (['javascript:alert(1)', 'https://name:secret@example.test/', 'https://example.test/oauth/callback?code=secret'] as $url) {
            $this->postJson('/api/v1/app/history', ['url' => $url, 'source' => 'desktop'])->assertUnprocessable();
        }
        foreach (['https://example.test/remote#pair=SYNTHETIC_CAPSULE', 'https://example.test/remote#data=SYNTHETIC_CAPSULE', 'https://example.test/#access_token=secret', 'https://example.test/#%70air=secret', 'https://example.test/?pairing=secret', 'https://example.test/?token=secret'] as $url) {
            $this->postJson('/api/v1/app/history', ['url' => $url, 'source' => 'desktop'])->assertUnprocessable();
            $this->postJson('/api/v1/app/links', ['url' => $url, 'title' => 'Synthetic'])->assertUnprocessable();
        }
        $this->postJson('/api/v1/app/links', ['url' => 'https://example.test/board?view=team#section', 'title' => 'Synthetic'])->assertCreated()->assertJsonPath('url', 'https://example.test/board?view=team#section');
        $this->postJson('/api/v1/app/history', ['url' => 'https://example.test/docs?view=reference#section', 'source' => 'mobile', 'title' => 'Reference'])->assertCreated()->assertJsonPath('url', 'https://example.test/docs');
        $this->getJson('/api/v1/app/history')->assertJsonCount(1, 'items')->assertDontSee('secret');
        $visit = ['id' => (string) Str::uuid(), 'url' => 'https://example.test/retry', 'source' => 'desktop'];
        $first = $this->postJson('/api/v1/app/history', $visit)->assertCreated()->json('id');
        $this->postJson('/api/v1/app/history', $visit)->assertCreated()->assertJsonPath('id', $first);
        $this->getJson('/api/v1/app/history')->assertJsonCount(2, 'items');
    }

    public function test_notification_and_log_events_are_idempotent_and_keep_bounded_chat_text(): void
    {
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $payload = ['id' => (string) Str::uuid(), 'type' => 'chat.completed', 'title' => 'HOA fee schedule', 'body' => 'Drafted the reply to Craig.', 'hostName' => 'Build Mac', 'prompt' => 'PRIVATE PROMPT'];
        $first = $this->postJson('/api/v1/app/notifications', $payload)->assertCreated()->assertJsonPath('title', 'HOA fee schedule')->assertJsonPath('body', 'Drafted the reply to Craig.')->assertJsonPath('hostName', 'Build Mac')->assertDontSee('PRIVATE PROMPT')->json();
        $this->postJson('/api/v1/app/notifications', ['id' => (string) Str::uuid(), 'type' => 'review.required', 'title' => "bad\u{0007}title"])->assertUnprocessable();
        $this->postJson('/api/v1/app/notifications', $payload)->assertCreated()->assertJsonPath('id', $first['id']);
        $this->patchJson('/api/v1/app/notifications/'.$first['id'], ['read' => true])->assertOk()->assertJsonPath('read', true);
        $this->postJson('/api/v1/app/logs', ['id' => (string) Str::uuid(), 'event' => 'chat.completed', 'level' => 'info', 'message' => 'private transcript'])->assertCreated()->assertDontSee('private transcript');
        $this->postJson('/api/v1/app/logs', ['id' => (string) Str::uuid(), 'event' => 'secret', 'level' => 'info'])->assertUnprocessable();
        $this->getJson('/api/v1/app')->assertJsonCount(1, 'notifications')->assertJsonCount(1, 'logs');
    }

    public function test_push_registration_validates_destinations_and_never_claims_unconfigured_delivery(): void
    {
        Http::preventStrayRequests();
        $user = $this->owner();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $device = (string) Str::uuid();
        $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => $device, 'platform' => 'web', 'endpoint' => 'https://127.0.0.1/private'])->assertUnprocessable();
        $subscription = $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => $device, 'platform' => 'apns', 'token' => str_repeat('a', 64), 'environment' => 'sandbox'])->assertOk()->assertJsonPath('configured', false)->assertDontSee(str_repeat('a', 64))->json();
        $this->postJson('/api/v1/app/notifications', ['id' => (string) Str::uuid(), 'type' => 'approval.required'])->assertCreated();
        $this->assertSame(1, DB::table('app_records')->where('kind', 'push-outbox')->count());
        $this->artisan('proteus:deliver-push')->assertSuccessful();
        Http::assertNothingSent();
        $this->deleteJson('/api/v1/app/push-subscriptions/'.$subscription['id'])->assertOk();
        $this->artisan('proteus:deliver-push')->assertSuccessful();
        $this->assertSame(0, DB::table('app_records')->where('kind', 'push-outbox')->count());
    }

    public function test_configured_push_uses_generic_payload_and_cleans_expired_subscription(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'proteus-test-push-');
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        openssl_pkey_export($key, $pem);
        file_put_contents($path, $pem);
        try {
            config(['push.apns_key_path' => $path, 'push.apns_key_id' => 'SYNTHETIC', 'push.apns_team_id' => 'TEAM', 'push.apns_topic' => 'test.proteus']);
            Http::fake(['api.sandbox.push.apple.com/*' => Http::response([], 410)]);
            $service = app(PushDelivery::class);
            $this->assertSame('expired', $service->deliver(['platform' => 'apns', 'environment' => 'sandbox', 'token' => str_repeat('a', 64)]));
            Http::assertSent(fn ($request) => $request['aps']['alert']['title'] === 'Proteus' && ! isset($request['chatId']) && $request->hasHeader('apns-push-type', 'alert'));
        } finally {
            unlink($path);
        }
    }

    public function test_push_worker_routes_each_computers_event_without_private_chat_content(): void
    {
        Http::preventStrayRequests();
        $path = tempnam(sys_get_temp_dir(), 'proteus-test-push-');
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        openssl_pkey_export($key, $pem);
        file_put_contents($path, $pem);
        try {
            config(['push.apns_key_path' => $path, 'push.apns_key_id' => 'SYNTHETIC', 'push.apns_team_id' => 'TEAM', 'push.apns_topic' => 'org.proteusapp.review.proteus']);
            Http::fake(['api.sandbox.push.apple.com/*' => Http::response([], 200)]);
            $user = $this->owner();
            Passport::actingAs($user, ['app:read', 'app:write']);
            $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => (string) Str::uuid(), 'platform' => 'apns', 'token' => str_repeat('b', 64), 'environment' => 'sandbox'])->assertOk();
            $events = [];
            foreach (['personal', 'work', 'linux', 'windows'] as $computer) {
                $event = ['eventId' => (string) Str::uuid(), 'hostId' => (string) Str::uuid(), 'chatId' => 'chat-'.$computer, 'scheduleId' => 'schedule-'.$computer, 'type' => 'review.required'];
                $events[] = $event;
                $this->postJson('/api/v1/app/notifications', $event + ['prompt' => 'PRIVATE PROMPT', 'title' => 'Fee schedule '.$computer, 'body' => 'Needs your review', 'hostName' => 'Mac '.$computer, 'url' => 'https://private.test/'])->assertCreated();
                $this->postJson('/api/v1/app/notifications', $event)->assertCreated();
            }
            $this->assertSame(4, DB::table('app_records')->where('kind', 'push-outbox')->count(), 'Replayed host events do not enqueue duplicate alerts');
            $this->artisan('proteus:deliver-push')->assertSuccessful();
            Http::assertSentCount(4);
            foreach ($events as $event) {
                Http::assertSent(fn ($request) => $request['hostId'] === $event['hostId'] && $request['chatId'] === $event['chatId'] && $request['scheduleId'] === $event['scheduleId'] && $request['notificationId'] === $event['eventId'] && $request->hasHeader('apns-topic', 'org.proteusapp.review.proteus') && $request->hasHeader('apns-collapse-id', hash('sha256', $event['eventId'])) && ! str_contains($request->body(), 'PRIVATE') && ! isset($request['url']) && str_starts_with($request['aps']['alert']['title'], 'Fee schedule ') && $request['aps']['alert']['body'] === 'Needs your review' && str_starts_with($request['aps']['alert']['subtitle'], 'Mac '));
            }
            $this->assertSame(0, DB::table('app_records')->where('kind', 'push-outbox')->count());
        } finally {
            unlink($path);
        }
    }

    public function test_website_notifications_preserve_safe_origin_and_reject_owner_references(): void
    {
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $event = ['id' => (string) Str::uuid(), 'hostId' => (string) Str::uuid(), 'type' => 'website.notification', 'origin' => 'https://messages.example.test:8443', 'title' => 'A website message', 'body' => 'The site supplied this text', 'sound' => false, 'silent' => false, 'browserIssue' => ['tabId' => 'PRIVATE-TAB', 'profileId' => 'PRIVATE-PROFILE'], 'url' => 'https://messages.example.test/private'];
        $first = $this->postJson('/api/v1/app/notifications', $event)->assertCreated()->assertJsonPath('eventId', $event['id'])->assertJsonPath('origin', $event['origin'])->assertJsonPath('sound', false)->assertJsonMissingPath('browserIssue')->assertJsonMissingPath('url')->json();
        $this->postJson('/api/v1/app/notifications', $event)->assertCreated()->assertJsonPath('id', $first['id']);
        foreach (['https://user:secret@example.test', 'https://example.test/path', 'https://example.test?token=secret', 'https://example.test#fragment', 'file:///private', 'https://example .test'] as $origin) {
            $this->postJson('/api/v1/app/notifications', array_replace($event, ['id' => (string) Str::uuid(), 'origin' => $origin]))->assertUnprocessable();
        }
        $this->getJson('/api/v1/app')->assertJsonCount(1, 'notifications');
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $this->getJson('/api/v1/app')->assertJsonCount(0, 'notifications');
    }

    public function test_website_push_keeps_site_sound_choice_and_suppressed_events_do_not_alert(): void
    {
        Http::preventStrayRequests();
        $path = tempnam(sys_get_temp_dir(), 'proteus-test-push-');
        $key = openssl_pkey_new(['private_key_type' => OPENSSL_KEYTYPE_EC, 'curve_name' => 'prime256v1']);
        openssl_pkey_export($key, $pem);
        file_put_contents($path, $pem);
        try {
            config(['push.apns_key_path' => $path, 'push.apns_key_id' => 'SYNTHETIC', 'push.apns_team_id' => 'TEAM', 'push.apns_topic' => 'org.proteusapp.review.proteus']);
            Http::fake(['api.sandbox.push.apple.com/*' => Http::response([], 200)]);
            Passport::actingAs($this->owner(), ['app:read', 'app:write']);
            $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => (string) Str::uuid(), 'platform' => 'apns', 'token' => str_repeat('c', 64), 'environment' => 'sandbox'])->assertOk();
            $event = ['id' => (string) Str::uuid(), 'hostId' => (string) Str::uuid(), 'type' => 'website.notification', 'origin' => 'https://messages.example.test', 'title' => 'Website message', 'sound' => false];
            $this->postJson('/api/v1/app/notifications', $event)->assertCreated();
            $this->postJson('/api/v1/app/notifications', $event)->assertCreated();
            $this->postJson('/api/v1/app/notifications', array_replace($event, ['id' => (string) Str::uuid(), 'silent' => true]))->assertCreated();
            $this->assertSame(1, DB::table('app_records')->where('kind', 'push-outbox')->count());
            $this->artisan('proteus:deliver-push')->assertSuccessful();
            Http::assertSentCount(1);
            Http::assertSent(fn ($request) => $request['type'] === 'website.notification' && $request['notificationId'] === $event['id'] && $request['hostId'] === $event['hostId'] && ! isset($request['aps']['sound']) && ! isset($request['origin']) && ! isset($request['tabId']));
            $push = app(PushDelivery::class);
            $this->assertSame('obsolete', $push->deliver(['platform' => 'apns'], $event + ['createdAt' => now()->subMinutes(6)->toIso8601String()]));
            $this->assertSame('obsolete', $push->deliver(['platform' => 'apns'], $event + ['silent' => true]));
            Http::assertSentCount(1);
        } finally {
            unlink($path);
        }
    }

    public function test_push_outbox_drops_deleted_notifications_without_revoking_the_phone(): void
    {
        Http::preventStrayRequests();
        $user = $this->owner();
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => (string) Str::uuid(), 'platform' => 'apns', 'token' => str_repeat('c', 64), 'environment' => 'sandbox'])->assertOk();
        $this->postJson('/api/v1/app/notifications', ['eventId' => (string) Str::uuid(), 'type' => 'chat.completed'])->assertCreated();
        DB::table('app_records')->where('kind', 'notifications')->delete();
        $this->artisan('proteus:deliver-push')->assertSuccessful();
        Http::assertNothingSent();
        $this->assertSame(0, DB::table('app_records')->where('kind', 'push-outbox')->count());
        $this->assertSame(1, DB::table('app_records')->where('kind', 'push-subscriptions')->count());
    }

    public function test_browsing_and_engine_room_require_strong_session_and_render_shell(): void
    {
        $this->withoutVite();
        $this->get('/team')->assertRedirect('/login');
        $this->signedIn($this->owner());
        foreach (['/team', '/browser-home', '/engine-room'] as $path) {
            $this->get($path)->assertOk()->assertSee('Engine Room')->assertSee('Team Tools')->assertDontSee('Your agent control room');
        }
        $this->getJson('/app-api')->assertConflict();
    }

    public function test_history_preserves_actual_visit_time_and_device_without_rewriting_older_records(): void
    {
        Passport::actingAs($this->owner(), ['app:read', 'app:write']);
        $visit = ['url' => 'https://example.test/history', 'source' => 'desktop', 'visitedAt' => '2026-09-01T18:30:00.000Z', 'deviceId' => (string) Str::uuid(), 'deviceName' => 'Studio workstation'];
        $this->postJson('/api/v1/app/history', $visit)->assertCreated()->assertJsonPath('visitedAt', $visit['visitedAt'])->assertJsonPath('deviceId', $visit['deviceId'])->assertJsonPath('deviceName', 'Studio workstation');
        foreach (['visitedAt' => 'invalid', 'deviceId' => 'not-a-uuid', 'deviceName' => str_repeat('a', 101)] as $key => $invalid) {
            $this->postJson('/api/v1/app/history', array_replace($visit, [$key => $invalid]))->assertUnprocessable();
        }
        $this->postJson('/api/v1/app/history', ['url' => 'https://example.test/legacy', 'source' => 'web'])->assertCreated()->assertJsonMissingPath('visitedAt')->assertJsonMissingPath('deviceName');
        $this->getJson('/api/v1/app/history')->assertJsonCount(2, 'items');
    }

    public function test_history_is_bounded_and_schedule_push_is_opt_in(): void
    {
        $user = $this->owner();
        $records = app(AppRecords::class);
        for ($i = 0; $i < 503; $i++) {
            $records->save($user, 'history', ['url' => 'https://example.test/'.$i, 'source' => 'web']);
        }
        $this->assertCount(500, $records->all($user, 'history'));
        Passport::actingAs($user, ['app:read', 'app:write']);
        $this->postJson('/api/v1/app/push-subscriptions', ['deviceId' => (string) Str::uuid(), 'platform' => 'apns', 'token' => str_repeat('b', 64), 'environment' => 'sandbox'])->assertOk();
        $this->postJson('/api/v1/app/notifications', ['id' => (string) Str::uuid(), 'type' => 'schedule.completed'])->assertCreated();
        $this->assertSame(0, DB::table('app_records')->where('kind', 'push-outbox')->count());
    }
}

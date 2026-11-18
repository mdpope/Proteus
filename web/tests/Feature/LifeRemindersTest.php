<?php

namespace Tests\Feature;

use App\Models\Membership;
use App\Models\Workspace;
use App\Services\AppRecords;
use App\Services\LifeReminders;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Passport\Passport;
use Tests\CreatesBrain;
use Tests\TestCase;

class LifeRemindersTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    private function login($user, array $scopes = ['brain:read', 'brain:write']): array
    {
        Passport::actingAs($user, $scopes, 'api');

        return $this->getJson('/api/v1/life')->assertOk()->json();
    }

    private function change(array $p, string $action, array $input, ?string $key = null)
    {
        return $this->postJson('/api/v1/life/action', ['action' => 'reminders.'.$action, 'input' => $input, 'idempotencyKey' => $key ?? (string) Str::uuid(), 'expectedAccountId' => $p['accountId'], 'expectedWorkspaceId' => $p['workspaceId']]);
    }

    private function data(array $query = [])
    {
        return $this->postJson('/api/v1/life/data', ['section' => 'reminders', 'query' => $query]);
    }

    public function test_editing_without_rescheduling_does_not_repeat_a_due_alert(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-14T17:00:00Z'));
        $user = $this->owner();
        $profile = $this->login($user);
        $input = ['title' => 'Call dentist', 'dueKind' => 'datetime', 'dueAt' => '2026-11-14T09:00:00-07:00', 'timeZone' => 'America/Denver'];
        $record = $this->change($profile, 'create', $input)->assertOk()->json('record');
        $service = app(LifeReminders::class);
        $this->assertSame(1, $service->enqueueDue());
        $this->change($profile, 'update', $input + ['id' => $record['id'], 'expectedRevision' => 1])->assertOk();
        $this->assertSame(0, $service->enqueueDue());
        $this->change($profile, 'update', ['id' => $record['id'], 'expectedRevision' => 2, 'dueKind' => 'datetime', 'dueAt' => '2026-11-15T09:00:00-07:00', 'timeZone' => 'America/Denver'])->assertOk();
        $this->assertSame(0, $service->enqueueDue());
        $this->travel(1)->days();
        $this->assertSame(1, $service->enqueueDue());
        $this->assertSame(0, $service->enqueueDue());
        $this->assertCount(2, collect(app(AppRecords::class)->all($user, 'notifications'))->where('type', 'life.reminder.due'));
    }

    public function test_confirmation_and_due_alert_have_distinct_durable_identities_and_cancel_on_completion(): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-14T15:59:00Z'));
        $u = $this->owner();
        $p = $this->login($u);
        $key = (string) Str::uuid();
        $records = app(AppRecords::class);
        $input = ['title' => 'Call dentist', 'dueKind' => 'datetime', 'dueAt' => '2026-11-14T09:00:00-07:00', 'timeZone' => 'America/Denver'];
        $response = $this->change($p, 'create', $input, $key)->assertOk()->json();
        $this->change($p, 'create', $input, $key)->assertOk()->assertJsonPath('confirmation.id', $response['confirmation']['id']);
        $this->assertCount(1, $records->all($u, 'notifications'));
        $service = app(LifeReminders::class);
        $this->assertSame(0, $service->enqueueDue());
        $this->travel(2)->minutes();
        $this->assertSame(1, $service->enqueueDue());
        $this->assertSame(0, $service->enqueueDue());
        $notices = $records->all($u, 'notifications');
        $this->assertCount(2, $notices);
        $due = collect($notices)->firstWhere('type', 'life.reminder.due');
        $this->assertSame($response['record']['id'], $due['destination']['reminderId']);
        $this->assertNotSame($response['confirmation']['id'], $due['id']);
        $this->change($p, 'complete', ['id' => $response['record']['id'], 'expectedRevision' => 1])->assertOk();
        $this->assertSame(0, $service->enqueueDue());
        $resolved = $records->decode($records->query($u, 'notifications')->where('id', $due['id'])->first());
        $this->assertNotEmpty($resolved['resolvedAt']);
        $this->assertTrue($resolved['silent']);
    }

    public function test_web_uses_same_account_service_and_cannot_switch_account_on_save(): void
    {
        $u = $this->owner();
        $this->signedIn($u);
        $p = $this->postJson('/life/api/data', ['section' => 'reminders'])->assertOk()->json();
        $this->assertFalse($p['readOnly']);
        $this->postJson('/life/api/action', ['action' => 'reminders.create', 'input' => ['title' => 'Web task'], 'idempotencyKey' => (string) Str::uuid(), 'expectedAccountId' => $p['accountId'], 'expectedWorkspaceId' => $p['workspaceId']])->assertOk();
        $this->get('/life/reminders')->assertOk()->assertSee('life-reminders');
        $this->assertDatabaseHas('life_reminders', ['user_id' => $u->id, 'title' => 'Web task']);
    }

    public function test_account_isolation_scopes_and_captured_identity(): void
    {
        $this->data()->assertUnauthorized();
        $a = $this->owner();
        $b = $this->owner();
        $p = $this->login($a);
        $r = $this->change($p, 'create', ['title' => 'Private task'])->assertOk()->json('record');
        $q = $this->login($b);
        $this->data(['id' => $r['id']])->assertNotFound();
        $this->change($q, 'delete', ['id' => $r['id'], 'expectedRevision' => 1])->assertNotFound();
        $this->change($p, 'create', ['title' => 'Wrong account'])->assertConflict();
        Membership::create(['workspace_id' => $a->current_workspace_id, 'user_id' => $b->id, 'role' => 'owner']);
        $b->forceFill(['current_workspace_id' => $a->current_workspace_id])->save();
        $this->login($b);
        $this->data()->assertOk()->assertJsonCount(0, 'items');
        $this->login($a, ['brain:read']);
        $this->change($p, 'complete', ['id' => $r['id'], 'expectedRevision' => 1])->assertForbidden();
    }

    public function test_replay_conflict_and_stale_revisions_do_not_duplicate_or_overwrite(): void
    {
        $p = $this->login($this->owner());
        $key = (string) Str::uuid();
        $input = ['title' => 'Buy milk', 'dueKind' => 'date', 'dueDate' => '2026-11-14'];
        $r = $this->change($p, 'create', $input, $key)->assertOk()->json('record');
        $this->assertNull($r['dueAt']);
        $this->assertFalse($r['alertScheduled']);
        $this->change($p, 'create', $input, $key)->assertOk()->assertJsonPath('record.id', $r['id']);
        $this->change($p, 'create', ['title' => 'Different'], $key)->assertConflict();
        $this->change($p, 'complete', ['id' => $r['id'], 'expectedRevision' => 1])->assertOk()->assertJsonPath('record.revision', 2);
        $this->change($p, 'update', ['id' => $r['id'], 'expectedRevision' => 1, 'title' => 'Stale'])->assertConflict();
        $this->data()->assertOk()->assertJsonCount(0, 'items');
        $this->change($p, 'reopen', ['id' => $r['id'], 'expectedRevision' => 2])->assertOk();
        $this->assertDatabaseCount('life_reminders', 1);
    }

    public function test_list_deletion_preserves_reminders_and_tombstones_sync_and_restore(): void
    {
        $p = $this->login($this->owner());
        $base = $this->data()->assertOk()->json();
        $list = $this->change($p, 'list.create', ['name' => 'Home'])->assertOk()->json('record');
        $r = $this->change($p, 'create', ['title' => 'Water plants', 'listId' => $list['id']])->assertOk()->json('record');
        $this->change($p, 'list.delete', ['id' => $list['id'], 'expectedRevision' => 1])->assertOk();
        $this->data(['id' => $r['id']])->assertOk()->assertJsonPath('record.listId', $base['inboxId'])->assertJsonPath('record.revision', 2);
        $this->change($p, 'delete', ['id' => $r['id'], 'expectedRevision' => 2])->assertOk();
        $this->data()->assertJsonCount(0, 'items');
        $changes = $this->data(['since' => $base['cursor']])->assertOk()->json('changes');
        $last = end($changes);
        $this->assertSame($r['id'], $last['record']['id']);
        $this->assertNotNull($last['record']['deletedAt']);
        $this->change($p, 'restore', ['id' => $r['id'], 'expectedRevision' => 3])->assertOk()->assertJsonPath('record.deletedAt', null);
        $this->change($p, 'list.delete', ['id' => $base['inboxId'], 'expectedRevision' => 1])->assertUnprocessable();
    }

    public function test_due_precision_timezone_and_sort_validation(): void
    {
        $user = $this->owner();
        Workspace::whereKey($user->current_workspace_id)->update(['timezone' => 'America/Denver']);
        $p = $this->login($user);
        $this->data()->assertJsonPath('timeZone', 'America/Denver');
        $this->change($p, 'create', ['title' => 'Call', 'dueKind' => 'datetime', 'dueAt' => '2026-11-14T09:00:00-07:00', 'timeZone' => 'America/Denver'])->assertOk()->assertJsonPath('record.dueAt', '2026-11-14T16:00:00+00:00');
        $this->change($p, 'create', ['title' => 'Call', 'dueKind' => 'datetime', 'dueAt' => '2026-11-14T09:00:00-07:00'])->assertUnprocessable();
        $this->change($p, 'create', ['title' => 'Invalid day', 'dueKind' => 'date', 'dueDate' => '2026-02-30'])->assertUnprocessable();
        $this->change($p, 'create', ['title' => '   '])->assertUnprocessable();
        $this->data(['sort' => 'title; DROP TABLE users'])->assertUnprocessable();
        $this->assertDatabaseCount('life_reminders', 1);
    }

    public function test_browser_replica_rejects_another_signed_in_account(): void
    {
        $user = $this->owner();
        $user->forceFill(['two_factor_confirmed_at' => now()])->save();
        $this->actingAs($user)->withSession(['auth.two_factor_user' => $user->id]);
        $this->withHeader('X-Proteus-Account', str_repeat('0', 64))->postJson('/life/api/data', ['section' => 'reminders', 'query' => ['since' => 0]])->assertConflict();
        $account = hash_hmac('sha256', 'proteus-browser:'.$user->id, config('app.key'));
        $this->withHeader('X-Proteus-Account', $account)->postJson('/life/api/data', ['section' => 'reminders', 'query' => ['since' => 0]])->assertOk()->assertJsonStructure(['cursor', 'changes']);
    }

    public function test_reminders_can_be_scoped_to_a_workspace_and_project_and_filtered_exactly(): void
    {
        $profile = $this->login($this->owner());
        $none = $this->change($profile, 'create', ['title' => 'Loose'])->assertOk()->json('record');
        $workspaceOnly = $this->change($profile, 'create', ['title' => 'Workspace', 'workspaceId' => 'workspace-a'])->assertOk()->json('record');
        $project = $this->change($profile, 'create', ['title' => 'Project', 'workspaceId' => 'workspace-a', 'projectId' => 'project-1'])->assertOk()->json('record');
        $other = $this->change($profile, 'create', ['title' => 'Elsewhere', 'workspaceId' => 'workspace-b', 'projectId' => 'project-9'])->assertOk()->json('record');
        $this->assertNull($none['workspaceId']);
        $this->assertSame('project-1', $project['projectId']);
        $titles = fn (array $query) => collect($this->data($query)->assertOk()->json('items'))->pluck('title')->sort()->values()->all();
        $this->assertSame(['Project', 'Workspace'], $titles(['workspaceId' => 'workspace-a']));
        $this->assertSame(['Project'], $titles(['projectId' => 'project-1']));
        $this->assertSame(['Elsewhere'], $titles(['workspaceId' => 'workspace-b']));
        $this->change($profile, 'create', ['title' => 'Orphan project', 'projectId' => 'project-1'])->assertStatus(422);
        $moved = $this->change($profile, 'update', ['id' => $project['id'], 'expectedRevision' => 1, 'workspaceId' => null, 'projectId' => null])->assertOk()->json('record');
        $this->assertNull($moved['workspaceId']);
        $this->assertSame(['Workspace'], $titles(['workspaceId' => 'workspace-a']));
        $untouched = $this->change($profile, 'update', ['id' => $other['id'], 'expectedRevision' => 1, 'title' => 'Elsewhere 2'])->assertOk()->json('record');
        $this->assertSame('project-9', $untouched['projectId']);
        $this->assertNotNull($workspaceOnly['id']);
    }
}

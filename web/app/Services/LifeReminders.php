<?php

namespace App\Services;

use App\Models\User;
use App\Models\Workspace;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

/** Account-owned source of truth. All callers share revisions, retry receipts and tombstones. */
class LifeReminders
{
    public function __construct(private AppRecords $records, private PushDelivery $push) {}

    private function confirmation(User $user, array $record, string $action): array
    {
        $list = $this->rows($user, true)->where('id', $record['listId'])->firstOrFail();
        $due = match ($record['dueKind']) {
            'date' => 'Due '.$record['dueDate'].'. Date only; no timed alert.',
            'datetime' => 'Due '.CarbonImmutable::parse($record['dueAt'])->setTimezone($record['timeZone'])->format('M j, Y g:i a').' '.$record['timeZone'].'.',
            default => 'No due date.',
        };
        $verb = ['create' => 'Saved', 'update' => 'Updated', 'complete' => 'Completed', 'reopen' => 'Reopened', 'delete' => 'Deleted', 'restore' => 'Restored'][$action];
        $notification = $this->records->save($user, 'notifications', ['eventId' => (string) Str::uuid(), 'type' => 'life.reminder', 'title' => Str::limit($verb.': '.$record['title'], 150), 'body' => Str::limit($list->name.' · '.$due, 480), 'destination' => ['kind' => 'reminder', 'accountId' => hash_hmac('sha256', 'proteus-life:'.$user->id, config('app.key')), 'reminderId' => $record['id']], 'read' => false, 'occurredAt' => now()->toIso8601String()]);
        $this->push->enqueue($user, $notification);

        return ['id' => $notification['id'], 'eventId' => $notification['eventId'], 'at' => (int) floor(microtime(true) * 1000)];
    }

    /** Minute worker creates each due event once; edits serialize on the same account lock. */
    public function enqueueDue(int $limit = 100): int
    {
        $rows = DB::table('life_reminders')->whereNull('deleted_at')->whereNull('completed_at')->whereNull('alert_id')->where('due_at', '<=', now()->utc())->orderBy('due_at')->limit($limit)->get();
        $count = 0;
        foreach ($rows as $row) {
            $count += DB::transaction(function () use ($row) {
                $user = User::whereKey($row->user_id)->lockForUpdate()->first();
                if (! $user) {
                    return 0;
                }
                $r = $this->rows($user)->where('id', $row->id)->whereNull('deleted_at')->whereNull('completed_at')->whereNull('alert_id')->where('due_at', '<=', now()->utc())->first();
                if (! $r) {
                    return 0;
                }
                $n = $this->records->save($user, 'notifications', ['eventId' => (string) Str::uuid(), 'type' => 'life.reminder.due', 'title' => Str::limit('Reminder: '.$r->title, 150), 'body' => Str::limit($r->notes ?? '', 480), 'destination' => ['kind' => 'reminder', 'accountId' => hash_hmac('sha256', 'proteus-life:'.$user->id, config('app.key')), 'reminderId' => $r->id], 'read' => false, 'occurredAt' => now()->toIso8601String()]);
                $this->rows($user)->where('id', $r->id)->update(['alert_id' => $n['id']]);
                $this->push->enqueue($user, $n);

                return 1;
            });
        }

        return $count;
    }

    public function rows(User $user, bool $lists = false): Builder
    {
        return DB::table($lists ? 'life_reminder_lists' : 'life_reminders')->where('user_id', $user->id);
    }

    public function project(object $row, bool $list = false): array
    {
        $stamp = fn ($value) => $value ? CarbonImmutable::parse($value, 'UTC')->toIso8601String() : null;
        $value = ['id' => $row->id, 'revision' => (int) $row->revision, 'createdAt' => $stamp($row->created_at), 'updatedAt' => $stamp($row->updated_at), 'deletedAt' => $stamp($row->deleted_at)];
        if ($list) {
            return $value + ['name' => $row->name, 'inbox' => (bool) $row->inbox];
        }

        return $value + ['workspaceId' => $row->workspace_id ?? null, 'projectId' => $row->project_id ?? null, 'listId' => $row->list_id, 'title' => $row->title, 'notes' => $row->notes ?? '', 'dueKind' => $row->due_kind, 'dueDate' => $row->due_date ? substr($row->due_date, 0, 10) : null, 'dueAt' => $row->due_at ? CarbonImmutable::parse($row->due_at, 'UTC')->toIso8601String() : null, 'timeZone' => $row->time_zone, 'completedAt' => $stamp($row->completed_at), 'alertScheduled' => $row->due_kind === 'datetime' && ! $row->completed_at && ! $row->deleted_at];
    }

    private function change(User $user, string $id, bool $list = false): array
    {
        $record = $this->project($this->rows($user, $list)->where('id', $id)->firstOrFail(), $list);
        DB::table('life_reminder_changes')->insert(['user_id' => $user->id, 'kind' => $list ? 'list' : 'reminder', 'record_json' => json_encode($record, JSON_THROW_ON_ERROR)]);

        return $record;
    }

    private function inbox(User $user): string
    {
        $row = $this->rows($user, true)->where('inbox', true)->first();
        if ($row) {
            return $row->id;
        }
        $id = (string) Str::uuid();
        DB::table('life_reminder_lists')->insert(['id' => $id, 'user_id' => $user->id, 'name' => 'Inbox', 'inbox' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->change($user, $id, true);

        return $id;
    }

    public function read(User $user, array $query): array
    {
        $v = Validator::make($query, ['id' => 'sometimes|uuid', 'listId' => 'sometimes|uuid', 'workspaceId' => 'sometimes|string|max:128', 'projectId' => 'sometimes|string|max:128', 'since' => 'sometimes|integer|min:0', 'page' => 'sometimes|integer|between:1,100000', 'sort' => 'sometimes|in:due,created,list,title', 'completed' => 'sometimes|in:all,open,completed', 'deleted' => 'sometimes|boolean', 'search' => 'nullable|string|max:200'])->validate();

        // Account lock provides a consistent snapshot/cursor and exactly one Inbox.
        return DB::transaction(function () use ($user, $v) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $inbox = $this->inbox($user);
            $cursor = (int) DB::table('life_reminder_changes')->where('user_id', $user->id)->max('id');
            $preferences = $this->records->all($user, 'preferences')[0] ?? [];
            $base = ['inboxId' => $inbox, 'timeZone' => $preferences['timezone'] ?? Workspace::findOrFail($user->current_workspace_id)->timezone, 'cursor' => $cursor];
            if (isset($v['since'])) {
                $changes = DB::table('life_reminder_changes')->where('user_id', $user->id)->where('id', '>', $v['since'])->orderBy('id')->limit(501)->get();
                $more = $changes->count() > 500;
                $changes = $changes->take(500);

                return array_replace($base, ['cursor' => $more ? (int) $changes->last()->id : $cursor, 'hasMore' => $more, 'changes' => $changes->map(fn ($row) => ['kind' => $row->kind, 'record' => json_decode($row->record_json, true)])->all()]);
            }
            if (isset($v['id'])) {
                return $base + ['record' => $this->project($this->rows($user)->where('id', $v['id'])->firstOrFail())];
            }
            $rows = $this->rows($user);
            ($v['deleted'] ?? false) ? $rows->whereNotNull('deleted_at') : $rows->whereNull('deleted_at');
            if (isset($v['workspaceId'])) {
                $rows->where('workspace_id', $v['workspaceId']);
            }
            if (isset($v['projectId'])) {
                $rows->where('project_id', $v['projectId']);
            }
            if (isset($v['listId'])) {
                $this->rows($user, true)->where('id', $v['listId'])->whereNull('deleted_at')->firstOrFail();
                $rows->where('list_id', $v['listId']);
            }
            if (($v['completed'] ?? 'open') !== 'all') {
                ($v['completed'] ?? 'open') === 'completed' ? $rows->whereNotNull('completed_at') : $rows->whereNull('completed_at');
            }
            if (! empty($v['search'])) {
                $rows->where('title', 'like', '%'.$v['search'].'%');
            }
            $sort = $v['sort'] ?? 'due';
            if ($sort === 'due') {
                $rows->orderByRaw('CASE WHEN due_date IS NULL AND due_at IS NULL THEN 1 ELSE 0 END')->orderByRaw('COALESCE(due_date, due_at)');
            } elseif ($sort === 'list') {
                $rows->orderByRaw('(SELECT name FROM life_reminder_lists WHERE life_reminder_lists.id = life_reminders.list_id)');
            } else {
                $rows->orderBy(['created' => 'created_at', 'title' => 'title'][$sort]);
            }
            $total = (clone $rows)->count();

            return $base + ['items' => $rows->orderBy('id')->offset((($v['page'] ?? 1) - 1) * 100)->limit(100)->get()->map(fn ($r) => $this->project($r))->all(), 'total' => $total, 'page' => $v['page'] ?? 1, 'lists' => $this->rows($user, true)->whereNull('deleted_at')->orderByDesc('inbox')->orderBy('name')->orderBy('id')->get()->map(fn ($r) => $this->project($r, true))->all()];
        });
    }

    public function run(User $user, string $action, array $input, string $operationId): array
    {
        abort_unless(in_array($action, ['create', 'update', 'complete', 'reopen', 'delete', 'restore', 'list.create', 'list.update', 'list.delete'], true), 422, 'Unknown reminder action.');

        return DB::transaction(function () use ($user, $action, $input, $operationId) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $hash = hash('sha256', json_encode([$action, $input], JSON_THROW_ON_ERROR));
            $prior = DB::table('life_reminder_operations')->where(['user_id' => $user->id, 'operation_id' => $operationId])->first();
            if ($prior) {
                abort_unless(hash_equals($prior->request_hash, $hash), 409, 'This operation ID belongs to different reminder changes.');

                return json_decode($prior->result_json, true, flags: JSON_THROW_ON_ERROR);
            }
            $inbox = $this->inbox($user);
            $list = str_starts_with($action, 'list.');
            $create = in_array($action, ['create', 'list.create'], true);
            $v = Validator::make($input, ['id' => $create ? 'prohibited' : 'required|uuid', 'expectedRevision' => $create ? 'prohibited' : 'required|integer|min:1', 'name' => 'sometimes|required|string|max:200', 'title' => 'sometimes|required|string|max:500', 'notes' => 'nullable|string|max:10000', 'listId' => 'sometimes|uuid', 'workspaceId' => 'nullable|string|max:128|regex:/^[A-Za-z0-9_:-]+$/', 'projectId' => 'nullable|string|max:128|regex:/^[A-Za-z0-9_:-]+$/', 'dueKind' => 'sometimes|in:none,date,datetime', 'dueDate' => 'nullable|date_format:Y-m-d', 'dueAt' => 'nullable|date_format:Y-m-d\TH:i:sP', 'timeZone' => 'nullable|timezone'])->validate();
            $id = $create ? (string) Str::uuid() : $v['id'];
            $row = $create ? null : $this->rows($user, $list)->where('id', $id)->firstOrFail();
            if ($row) {
                abort_unless((int) $row->revision === (int) $v['expectedRevision'], 409, 'This reminder or list changed. Refresh before saving.');
                abort_if($row->deleted_at && $action !== 'restore', 409, 'This item was deleted. Restore it explicitly.');

            }
            $patch = ['updated_at' => now(), 'revision' => $row ? $row->revision + 1 : 1];
            if ($list) {
                abort_if($row?->inbox, 422, 'The Inbox cannot be renamed or deleted.');
                if ($action === 'list.delete') {
                    foreach ($this->rows($user)->where('list_id', $id)->get() as $item) {
                        $this->rows($user)->where('id', $item->id)->update(['list_id' => $inbox, 'revision' => $item->revision + 1, 'updated_at' => now()]);
                        $this->change($user, $item->id);
                    }
                    $patch['deleted_at'] = now();
                } else {
                    abort_if(trim($v['name'] ?? '') === '', 422, 'Give the list a name.');
                    $patch['name'] = trim($v['name']);
                    abort_if($this->rows($user, true)->whereNull('deleted_at')->where('name', $patch['name'])->where('id', '!=', $id)->exists(), 422, 'A list already has this name.');
                }
            } elseif (in_array($action, ['create', 'update'], true)) {
                if ($create || isset($v['title'])) {
                    abort_if(trim($v['title'] ?? '') === '', 422, 'Give the reminder a title.');
                    $patch['title'] = trim($v['title']);
                }
                if (array_key_exists('notes', $v)) {
                    $patch['notes'] = $v['notes'];
                }
                if (array_key_exists('workspaceId', $v) || array_key_exists('projectId', $v)) {
                    abort_if(! empty($v['projectId']) && empty($v['workspaceId']), 422, 'A project needs its workspace.');
                    $patch['workspace_id'] = $v['workspaceId'] ?? null;
                    $patch['project_id'] = $v['projectId'] ?? null;
                }
                $listId = $v['listId'] ?? $row?->list_id ?? $inbox;
                $this->rows($user, true)->where('id', $listId)->whereNull('deleted_at')->firstOrFail();
                $patch['list_id'] = $listId;
                if ($create || isset($v['dueKind'])) {
                    $kind = $v['dueKind'] ?? 'none';
                    abort_if($kind === 'date' && (empty($v['dueDate']) || ! empty($v['dueAt'])), 422, 'A date-only reminder needs a date and no time.');
                    abort_if($kind === 'datetime' && (empty($v['dueAt']) || empty($v['timeZone']) || ! empty($v['dueDate'])), 422, 'A timed reminder needs an exact instant and timezone.');
                    abort_if($kind === 'none' && (! empty($v['dueAt']) || ! empty($v['dueDate'])), 422, 'Choose a due date type.');
                    $patch += ['due_kind' => $kind, 'due_date' => $kind === 'date' ? $v['dueDate'] : null, 'due_at' => $kind === 'datetime' ? CarbonImmutable::parse($v['dueAt'])->utc()->format('Y-m-d H:i:s') : null, 'time_zone' => $kind === 'datetime' ? $v['timeZone'] : null, 'alert_id' => null];
                } else {
                    abort_if(isset($v['dueDate']) || isset($v['dueAt']) || isset($v['timeZone']), 422, 'Include dueKind when changing a due date.');
                }
            } else {
                $patch += match ($action) {
                    'complete' => ['completed_at' => now()],
                    'reopen' => ['completed_at' => null, 'alert_id' => null],
                    'delete' => ['deleted_at' => now()],
                    'restore' => ['deleted_at' => null, 'alert_id' => null, 'list_id' => $this->rows($user, true)->where('id', $row->list_id)->whereNull('deleted_at')->exists() ? $row->list_id : $inbox],
                };
            }
            if (! $list && $row) {
                $rescheduled = array_key_exists('due_at', $patch) && ($patch['due_at'] !== $row->due_at || $patch['due_kind'] !== $row->due_kind);
                if (! $rescheduled && $action === 'update') {
                    unset($patch['alert_id']);
                }
                if ($row->alert_id && ($rescheduled || in_array($action, ['complete', 'delete'], true))) {
                    // Remove unsent due intents. Already delivered alerts cannot be recalled.
                    foreach ($this->records->all($user, 'push-outbox') as $pending) {
                        if ($pending['notificationId'] === $row->alert_id && $pending['state'] === 'pending') {
                            $this->records->query($user, 'push-outbox')->where('id', $pending['id'])->delete();
                        }
                    }
                    $notice = $this->records->query($user, 'notifications')->where('id', $row->alert_id)->first();
                    if ($notice) {
                        $payload = $this->records->decode($notice);
                        unset($payload['id'], $payload['revision'], $payload['createdAt'], $payload['updatedAt']);
                        $this->records->save($user, 'notifications', array_replace($payload, ['resolvedAt' => now()->toIso8601String(), 'silent' => true]), $row->alert_id);
                    }
                }
            }
            if ($create) {
                DB::table($list ? 'life_reminder_lists' : 'life_reminders')->insert($patch + ['id' => $id, 'user_id' => $user->id, 'created_at' => now()]);
            } else {
                $this->rows($user, $list)->where('id', $id)->update($patch);
            }
            $result = ['ok' => true, 'record' => $this->change($user, $id, $list)];
            if (! $list) {
                $result['confirmation'] = $this->confirmation($user, $result['record'], $action);
            }
            DB::table('life_reminder_operations')->insert(['user_id' => $user->id, 'operation_id' => $operationId, 'request_hash' => $hash, 'result_json' => json_encode($result, JSON_THROW_ON_ERROR)]);

            return $result;
        });
    }
}

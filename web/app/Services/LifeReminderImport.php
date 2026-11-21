<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use JsonException;
use Ramsey\Uuid\Uuid;

/** Preview and apply one source account under the same lock as ordinary reminder writes. */
class LifeReminderImport
{
    public function __construct(private LifeReminders $reminders) {}

    public function run(User $user, bool $apply, array $input, string $operationId): array
    {
        $request = Validator::make($input, [
            'source' => 'required|string|max:800000',
            'digest' => $apply ? 'required|regex:/^[a-f0-9]{64}$/' : 'prohibited',
        ])->validate();
        $hash = hash('sha256', json_encode(['reminders.import.apply', $request], JSON_THROW_ON_ERROR));
        $source = $this->source($request['source']);

        return DB::transaction(function () use ($user, $apply, $request, $hash, $source, $operationId) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $key = ['user_id' => $user->id, 'operation_id' => $operationId];
            $prior = $apply ? DB::table('life_reminder_operations')->where($key)->first() : null;
            if ($prior) {
                abort_unless(hash_equals($prior->request_hash, $hash), 409, 'This operation ID belongs to different reminder changes.');

                return json_decode($prior->result_json, true, flags: JSON_THROW_ON_ERROR);
            }
            [$lists, $items, $summary] = $this->plan($user, $source);
            $digest = hash('sha256', json_encode([$source, $lists, $items, $summary], JSON_THROW_ON_ERROR));
            $result = ['ok' => true, 'digest' => $digest, 'sourceName' => $source['sourceName'], 'lists' => $summary, 'createdLists' => count($lists), 'createdItems' => count($items)];
            if (! $apply) {
                return $result;
            }
            abort_unless(hash_equals($digest, $request['digest']), 409, 'The import preview changed. Review it again before importing.');
            foreach ($lists as $id => $name) {
                DB::table('life_reminder_lists')->insert(['user_id' => $user->id, 'id' => $id, 'name' => $name, 'created_at' => now(), 'updated_at' => now()]);
                $this->reminders->change($user, $id, true);
            }
            foreach ($items as $id => $item) {
                DB::table('life_reminders')->insert($item + ['user_id' => $user->id, 'id' => $id, 'updated_at' => now()]);
                $this->reminders->change($user, $id);
            }
            DB::table('life_reminder_operations')->insert($key + ['request_hash' => $hash, 'result_json' => json_encode($result, JSON_THROW_ON_ERROR)]);

            return $result;
        });
    }

    private function source(string $raw): array
    {
        abort_if(strlen($raw) > 800000, 422, 'Import one account or a smaller group of lists.');
        try {
            $source = json_decode($raw, true, 20, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            abort(422, 'The reminder import is not valid JSON.');
        }
        abort_unless(is_array($source), 422, 'Choose a supported reminder export.');
        $v = Validator::make($source, [
            'format' => 'required|in:proteus-reminders-1',
            'sourceId' => 'required|string|max:300', 'sourceName' => 'required|string|max:200',
            'lists' => 'required|array|list|max:200',
            'lists.*' => 'required|array:id,name,items',
            'lists.*.id' => 'required|string|max:300|distinct:strict',
            'lists.*.name' => 'required|string|max:200',
            'lists.*.items' => 'present|array|list|max:2000',
            'lists.*.items.*' => 'required|array:id,title,notes,createdAt,completed,completedAt,dueKind,dueDate,dueAt,timeZone,extras',
            'lists.*.items.*.id' => 'required|string|max:300',
            'lists.*.items.*.title' => 'required|string|max:500',
            'lists.*.items.*.notes' => 'nullable|string|max:10000',
            'lists.*.items.*.createdAt' => 'nullable|date_format:Y-m-d\TH:i:sP',
            'lists.*.items.*.completed' => 'required|boolean',
            'lists.*.items.*.completedAt' => 'nullable|date_format:Y-m-d\TH:i:sP',
            'lists.*.items.*.dueKind' => 'required|in:none,date,datetime',
            'lists.*.items.*.dueDate' => 'nullable|date_format:Y-m-d',
            'lists.*.items.*.dueAt' => 'nullable|date_format:Y-m-d\TH:i:sP',
            'lists.*.items.*.timeZone' => 'nullable|timezone|max:100',
            'lists.*.items.*.extras' => 'nullable|array|max:15',
        ])->validate();
        abort_if(array_sum(array_map(fn ($list) => count($list['items']), $v['lists'])) > 2000, 422, 'Import up to 2,000 items at a time.');

        return $v;
    }

    private function plan(User $user, array $source): array
    {
        $id = fn ($kind, $origin) => Uuid::uuid5(Uuid::NAMESPACE_URL, json_encode(['proteus-reminders-1', $user->id, $source['sourceId'], $kind, $origin], JSON_THROW_ON_ERROR))->toString();
        $existingLists = $this->reminders->rows($user, true)->get(['id', 'name', 'deleted_at'])->keyBy('id');
        $names = $existingLists->whereNull('deleted_at')->mapWithKeys(fn ($row) => [mb_strtolower($row->name) => true])->all();
        $existingItems = $this->reminders->rows($user)->whereIn('id', collect($source['lists'])->flatMap(fn ($list) => array_map(fn ($item) => $id('item', $item['id']), $list['items']))->all())->pluck('id')->flip();
        $seen = $lists = $items = $summary = [];
        foreach ($source['lists'] as $list) {
            $listId = $id('list', $list['id']);
            $existing = $existingLists->get($listId);
            $name = $existing->name ?? trim($list['name']);
            if (! $existing) {
                for ($n = 1; isset($names[mb_strtolower($name)]); $n++) {
                    $suffix = $n === 1 ? ' (Imported)' : " (Imported {$n})";
                    $name = mb_substr(trim($list['name']), 0, 200 - strlen($suffix)).$suffix;
                }
                $names[mb_strtolower($name)] = true;
                $lists[$listId] = $name;
            }
            $counts = ['source' => $list['name'], 'destination' => $name, 'open' => 0, 'completed' => 0, 'skipped' => 0, 'withExtras' => 0, 'timed' => 0, 'deletedList' => (bool) $existing?->deleted_at];
            foreach ($list['items'] as $item) {
                $itemId = $id('item', $item['id']);
                abort_if(isset($seen[$itemId]), 422, 'The export contains a duplicate reminder identifier.');
                $seen[$itemId] = true;
                if ($existing?->deleted_at || $existingItems->has($itemId)) {
                    $counts['skipped']++;

                    continue;
                }
                $items[$itemId] = $this->row($item, $listId);
                $counts[$item['completed'] ? 'completed' : 'open']++;
                $counts['withExtras'] += (int) ! empty($item['extras']);
                $counts['timed'] += (int) (! $item['completed'] && $item['dueKind'] === 'datetime');
            }
            $summary[] = $counts;
        }

        return [$lists, $items, $summary];
    }

    private function row(array $item, string $listId): array
    {
        $instant = fn ($value) => $value ? CarbonImmutable::parse($value)->utc()->format('Y-m-d H:i:s') : null;
        $completed = $instant($item['completedAt'] ?? null);
        abort_if((bool) $item['completed'] !== ($completed !== null), 422, 'A completed reminder needs its original completion timestamp.');
        $date = $item['dueDate'] ?? null;
        $due = $instant($item['dueAt'] ?? null);
        $zone = $item['timeZone'] ?? null;
        $valid = match ($item['dueKind']) {
            'none' => ! $date && ! $due && ! $zone,
            'date' => $date && ! $due && ! $zone,
            'datetime' => ! $date && $due && $zone,
        };
        abort_unless($valid, 422, 'Preserve date-only reminders or supply a time and a timezone.');

        return ['list_id' => $listId, 'title' => $item['title'], 'notes' => $item['notes'] ?? null, 'created_at' => $instant($item['createdAt'] ?? null), 'completed_at' => $completed, 'due_kind' => $item['dueKind'], 'due_date' => $date, 'due_at' => $due, 'time_zone' => $zone];
    }
}

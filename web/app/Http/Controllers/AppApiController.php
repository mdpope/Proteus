<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AppRecords;
use App\Services\PushDelivery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AppApiController extends Controller
{
    public function __construct(private AppRecords $records, private PushDelivery $push) {}

    private function account(Request $request): void
    {
        if (! $request->is('api/*')) {
            $expected = hash_hmac('sha256', 'proteus-browser:'.$request->user()->id, config('app.key'));
            abort_unless(hash_equals($expected, (string) $request->header('X-Proteus-Account')), 409, 'The account changed. Reload before continuing.');
        }
        if ($request->has('expectedAccountId')) {
            abort_unless(hash_equals(hash_hmac('sha256', 'proteus-life:'.$request->user()->id, config('app.key')), (string) $request->input('expectedAccountId')), 409, 'The account changed.');
        }
        if ($request->has('expectedWorkspaceId')) {
            abort_unless((string) $request->user()->current_workspace_id === $request->input('expectedWorkspaceId'), 409, 'The workspace changed.');
        }
        abort_if(strlen($request->getContent()) > 100_000, 413);
    }

    private function response(array $value, int $status = 200): JsonResponse
    {
        return response()->json($value, $status)->header('Cache-Control', 'private, no-store');
    }

    public function index(Request $request): JsonResponse
    {
        $this->account($request);
        $user = $request->user();

        return $this->response(['protocol' => 1, 'accountId' => hash_hmac('sha256', 'proteus-life:'.$user->id, config('app.key')), 'workspaceId' => (string) $user->current_workspace_id, 'preferences' => $this->records->preferences($user), 'teamLists' => $this->records->all($user, 'team-lists'), 'links' => $this->records->all($user, 'links'), 'history' => $this->records->all($user, 'history'), 'notifications' => $this->records->all($user, 'notifications'), 'logs' => $this->records->all($user, 'logs'), 'push' => $this->push->status()]);
    }

    public function list(Request $request, string $kind): JsonResponse
    {
        $this->account($request);

        return $this->response(['items' => $this->records->all($request->user(), $kind)]);
    }

    public function preferences(Request $request): JsonResponse
    {
        $this->account($request);
        $value = $request->validate(['defaultMacId' => 'sometimes|nullable|uuid', 'timezone' => ['sometimes', Rule::in(timezone_identifiers_list())], 'searchEngine' => 'sometimes|in:google,duckduckgo,bing', 'allowanceDisplay' => 'sometimes|in:compact,expanded,collapsed', 'sidebarCollapsed' => 'sometimes|boolean', 'scheduleCompletionNotifications' => 'sometimes|boolean']);
        // A default host ID is a preference, never an access grant. Browser-only and native
        // pairings are verified by their clients without uploading protected device keys.

        return DB::transaction(function () use ($request, $value) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $old = $this->records->preferences($request->user());
            $payload = array_replace($old, $value);
            unset($payload['id'], $payload['revision'], $payload['createdAt'], $payload['updatedAt']);

            return $this->response($this->records->save($request->user(), 'preferences', $payload, $old['id'] ?? null));
        });
    }

    public function store(Request $request, string $kind, ?string $id = null): JsonResponse
    {
        $this->account($request);
        if (in_array($kind, ['notifications', 'logs', 'history'])) {
            $request->merge(['eventId' => $request->input('eventId', $request->input('id')), 'code' => $request->input('code', $request->input('event')), 'downtimeSeconds' => $request->input('downtimeSeconds', $request->input('offlineSeconds'))]);
            if ($kind === 'notifications') {
                $request->merge(['type' => str_replace(['_', 'host.reconnected'], ['.', 'device.reconnected'], (string) $request->input('type'))]);
            }
        }
        $rules = match ($kind) {
            'team-lists' => ['name' => 'required|string|max:100', 'instructions' => 'sometimes|nullable|string|max:4000', 'timezone' => ['sometimes', Rule::in(timezone_identifiers_list())], 'members' => 'present|array|max:200', 'members.*' => 'array:id,name,mode', 'members.*.id' => 'required|string|max:100|distinct', 'members.*.name' => 'required|string|max:100', 'members.*.mode' => 'required|in:fixed,random', 'links' => 'sometimes|array|max:50', 'links.*' => 'array:id,title,url', 'links.*.id' => 'required|string|max:100|distinct', 'links.*.title' => 'required|string|max:100', 'links.*.url' => 'required|string|max:2048'],
            'links' => ['title' => 'required|string|max:100', 'url' => 'required|string|max:2048'],
            'history' => ['visitedAt' => ['sometimes', 'string', 'max:40', 'date', 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/'], 'deviceId' => 'sometimes|nullable|uuid', 'deviceName' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/\A[^\x00-\x1f\x7f]*\z/u'], 'eventId' => 'sometimes|nullable|uuid', 'url' => 'required|string|max:2048', 'title' => 'sometimes|string|max:160', 'source' => 'required|in:desktop,mobile,web', 'hostId' => 'sometimes|nullable|uuid'],
            'notifications' => ['eventId' => 'required|uuid', 'type' => 'required|in:chat.completed,approval.required,review.required,schedule.completed,device.added,device.reconnected', 'hostId' => 'sometimes|nullable|uuid', 'chatId' => 'sometimes|nullable|string|max:100|regex:/^[a-zA-Z0-9_-]+$/', 'downtimeSeconds' => 'sometimes|nullable|integer|between:0,31536000'],
            'logs' => ['eventId' => 'required|uuid', 'code' => 'required|in:connected,disconnected,reconnected,command_failed,push_failed,permission_denied,run_started,run_completed,run_failed,device_added,device_revoked,chat.queued,chat.running,chat.awaiting_input,chat.completed,chat.failed,chat.cancelled,chat.interrupted,transport.online,transport.offline,transport.device_added,browser.open,browser.unload,app.started,app.stopping,api.failed', 'level' => 'required|in:info,warning,error', 'source' => 'sometimes|in:desktop,mobile,web,server', 'hostId' => 'sometimes|nullable|uuid'],
            default => abort(404),
        };
        if ($id) {
            $rules['expectedRevision'] = 'required|integer|min:1';
        }
        $value = $request->validate($rules);
        $revision = $value['expectedRevision'] ?? null;
        unset($value['expectedRevision']);
        if (isset($value['url'])) {
            $value['url'] = $this->records->safeUrl($value['url'], $kind === 'history');
        }
        foreach ($value['links'] ?? [] as $index => $link) {
            $value['links'][$index]['url'] = $this->records->safeUrl($link['url'], false);
        }
        if ($kind === 'notifications') {
            $value['read'] = false;
            $value['title'] = match ($value['type']) {
                'chat.completed' => 'Chat completed', 'approval.required' => 'Approval required', 'review.required' => 'Review required', 'schedule.completed' => 'Schedule completed', 'device.added' => 'Device added', 'device.reconnected' => 'Mac reconnected',
            };
        }
        if ($kind === 'logs') {
            $value['event'] = $value['code'];
            $value['message'] = ucfirst(str_replace('_', ' ', $value['code']));
        }
        $result = DB::transaction(function () use ($request, $kind, $value, $id, $revision) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            if (isset($value['eventId'])) {
                foreach ($this->records->all($request->user(), $kind) as $old) {
                    if (($old['eventId'] ?? '') === $value['eventId']) {
                        return $old;
                    }
                }
            }
            $result = $this->records->save($request->user(), $kind, $value, $id, $revision);
            if ($kind === 'notifications' && ($value['type'] !== 'schedule.completed' || $this->records->preferences($request->user())['scheduleCompletionNotifications'])) {
                $this->push->enqueue($request->user(), $result);
            }

            return $result;
        });

        return $this->response($result, $id ? 200 : 201);
    }

    public function read(Request $request, string $id): JsonResponse
    {
        $this->account($request);
        $value = $request->validate(['read' => 'required|boolean']);
        $old = $this->records->query($request->user(), 'notifications')->where('id', $id)->first();
        abort_unless($old, 404);
        $payload = $this->records->decode($old);
        unset($payload['id'], $payload['revision'], $payload['createdAt'], $payload['updatedAt']);

        return $this->response($this->records->save($request->user(), 'notifications', array_replace($payload, $value), $id));
    }

    public function destroy(Request $request, string $kind, string $id): JsonResponse
    {
        $this->account($request);
        abort_unless($this->records->query($request->user(), $kind)->where('id', $id)->delete(), 404);

        return $this->response(['removed' => true]);
    }

    public function subscribe(Request $request): JsonResponse
    {
        $this->account($request);
        $value = $request->validate(['deviceId' => 'required|uuid', 'platform' => 'required|in:web,apns', 'endpoint' => 'required_if:platform,web|string|max:2048', 'keys' => 'sometimes|array:p256dh,auth', 'keys.p256dh' => 'sometimes|string|max:200', 'keys.auth' => 'sometimes|string|max:100', 'token' => 'required_if:platform,apns|string|regex:/^[a-fA-F0-9]{64,200}$/', 'environment' => 'required_if:platform,apns|in:sandbox,production']);
        if ($value['platform'] === 'web') {
            $this->push->validateEndpoint($value['endpoint']);
            unset($value['token'], $value['environment']);
        } else {
            unset($value['endpoint'], $value['keys']);
        }
        $old = collect($this->records->all($request->user(), 'push-subscriptions'))->firstWhere('deviceId', $value['deviceId']);
        $result = $this->records->save($request->user(), 'push-subscriptions', $value, $old['id'] ?? null);

        return $this->response(['id' => $result['id'], 'deviceId' => $value['deviceId'], 'platform' => $value['platform'], 'configured' => $this->push->status()[$value['platform']], 'delivery' => 'pending_configuration_or_worker']);
    }
}

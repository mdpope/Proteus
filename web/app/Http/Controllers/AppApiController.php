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
        $options = $request->validate(['view' => 'sometimes|in:bootstrap', 'include' => 'sometimes|string|max:150']);
        $collections = ['browserProfiles' => 'browser-profiles', 'teamLists' => 'team-lists', 'links' => 'links', 'history' => 'history', 'notifications' => 'notifications', 'logs' => 'logs'];
        $include = isset($options['include']) ? explode(',', $options['include']) : (isset($options['view']) ? [] : array_keys($collections));
        abort_if(array_diff($include, array_keys($collections)), 422, 'Choose supported account collections.');
        $result = ['protocol' => 1, 'accountId' => hash_hmac('sha256', 'proteus-life:'.$user->id, config('app.key')), 'workspaceId' => (string) $user->current_workspace_id, 'displayName' => $user->name, 'preferences' => $this->records->preferences($user), 'push' => $this->push->status()];
        foreach (array_unique($include) as $key) {
            $result[$key] = $this->records->all($user, $collections[$key]);
        }

        return $this->response($result);
    }

    public function list(Request $request, string $kind): JsonResponse
    {
        $this->account($request);

        $options = $request->validate(['page' => 'sometimes|integer|between:1,10000', 'pageSize' => 'sometimes|integer|between:1,100', 'expectedRevision' => 'sometimes|string|regex:/^[a-f0-9]{64}$/']);
        if ($options) {
            return $this->response($this->records->page($request->user(), $kind, $options['page'] ?? 1, $options['pageSize'] ?? 100, $options['expectedRevision'] ?? null));
        }

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
            $request->merge(['eventId' => $request->input('eventId', $request->input('id')), 'downtimeSeconds' => $request->input('downtimeSeconds', $request->input('offlineSeconds'))]);
            if ($kind === 'logs') {
                $request->merge(['code' => $request->input('code', $request->input('event'))]);
            }
            if ($kind === 'notifications') {
                $request->merge(['occurredAt' => $request->input('occurredAt', $request->input('createdAt')), 'type' => str_replace(['_', 'host.reconnected'], ['.', 'device.reconnected'], (string) $request->input('type'))]);
            }
        }
        $rules = match ($kind) {
            'browser-profiles' => ['name' => ['required', 'string', 'max:80', 'not_regex:/[\x00-\x1f\x7f]/', 'not_in:Default,default'], 'settings' => 'sometimes|array:blockingEnabled,exceptions,notifications,extensions,allowExtensionAgents', 'settings.blockingEnabled' => 'sometimes|boolean', 'settings.allowExtensionAgents' => 'sometimes|boolean', 'settings.exceptions' => 'sometimes|array|max:200', 'settings.exceptions.*' => 'string|max:2048|distinct', 'settings.notifications' => 'sometimes|array|max:200', 'settings.notifications.*' => 'array:origin,permission', 'settings.notifications.*.origin' => 'required|string|max:2048|distinct', 'settings.notifications.*.permission' => 'required|in:ask,allow,block', 'settings.extensions' => 'sometimes|array|max:50', 'settings.extensions.*' => 'array:id,enabled', 'settings.extensions.*.id' => 'required|string|regex:/^[a-p]{32}$/|distinct', 'settings.extensions.*.enabled' => 'required|boolean'],
            'team-lists' => ['name' => 'required|string|max:100', 'instructions' => 'sometimes|nullable|string|max:4000', 'timezone' => ['sometimes', Rule::in(timezone_identifiers_list())], 'members' => 'present|array|max:200', 'members.*' => 'array:id,name,mode', 'members.*.id' => 'required|string|max:100|distinct', 'members.*.name' => 'required|string|max:100', 'members.*.mode' => 'required|in:fixed,random', 'links' => 'sometimes|array|max:50', 'links.*' => 'array:id,title,url', 'links.*.id' => 'required|string|max:100|distinct', 'links.*.title' => 'required|string|max:100', 'links.*.url' => 'required|string|max:2048'],
            'links' => ['title' => 'required|string|max:100', 'url' => 'required|string|max:2048'],
            'history' => ['visitedAt' => ['sometimes', 'string', 'max:40', 'date', 'regex:/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/'], 'deviceId' => 'sometimes|nullable|uuid', 'deviceName' => ['sometimes', 'nullable', 'string', 'max:100', 'regex:/\A[^\x00-\x1f\x7f]*\z/u'], 'eventId' => 'sometimes|nullable|uuid', 'url' => 'required|string|max:2048', 'title' => 'sometimes|string|max:160', 'source' => 'required|in:desktop,mobile,web', 'hostId' => 'sometimes|nullable|uuid'],
            'notifications' => ['occurredAt' => ['sometimes', 'nullable', 'date', 'max:40'], 'eventId' => 'required|uuid', 'type' => 'required|in:chat.completed,approval.required,review.required,schedule.completed,device.added,device.reconnected,website.notification,schedule.error', 'origin' => 'required_if:type,website.notification|prohibited_unless:type,website.notification|string|max:2048', 'sound' => 'sometimes|boolean', 'silent' => 'sometimes|boolean', 'hostId' => 'sometimes|nullable|uuid', 'chatId' => 'sometimes|nullable|string|max:100|regex:/^[a-zA-Z0-9_-]+$/', 'scheduleId' => 'sometimes|nullable|string|max:100|regex:/^[a-zA-Z0-9_-]+$/', 'downtimeSeconds' => 'sometimes|nullable|integer|between:0,31536000', 'level' => 'required_if:type,schedule.error|prohibited_unless:type,schedule.error|in:error', 'action' => 'required_if:type,schedule.error|prohibited_unless:type,schedule.error|in:save,preview,preflight,reconcile,revoke-access,clear-provider-override', 'code' => 'required_if:type,schedule.error|prohibited_unless:type,schedule.error|in:SCHEDULE_EXECUTION_UNSUPPORTED,SCHEDULE_EXECUTOR_UNAVAILABLE,SCHEDULE_CONFIGURATION_FAILED', 'correlationId' => 'required_if:type,schedule.error|prohibited_unless:type,schedule.error|uuid', 'title' => ['sometimes', 'nullable', 'string', 'max:160', 'regex:/\A[^\x00-\x1f\x7f]*\z/u'], 'body' => ['sometimes', 'nullable', 'string', 'max:500', 'regex:/\A[^\x00-\x1f\x7f]*\z/u'], 'hostName' => ['sometimes', 'nullable', 'string', 'max:80', 'regex:/\A[^\x00-\x1f\x7f]*\z/u']],
            'logs' => ['eventId' => 'required|uuid', 'code' => 'required|in:connected,disconnected,reconnected,command_failed,push_failed,permission_denied,run_started,run_completed,run_failed,device_added,device_revoked,chat.queued,chat.running,chat.awaiting_input,chat.completed,chat.failed,chat.cancelled,chat.interrupted,transport.online,transport.offline,transport.device_added,browser.open,browser.unload,app.started,app.stopping,api.failed', 'level' => 'required|in:info,warning,error', 'source' => 'sometimes|in:desktop,mobile,web,server', 'hostId' => 'sometimes|nullable|uuid'],
            default => abort(404),
        };
        if ($id) {
            $rules['expectedRevision'] = 'required|integer|min:1';
        }
        $value = $request->validate($rules);
        if ($kind === 'notifications' && $value['type'] === 'website.notification') {
            $parts = parse_url($value['origin']);
            abort_unless($parts && ! preg_match('/[\x00-\x20\x7f]/', $value['origin']) && filter_var($value['origin'], FILTER_VALIDATE_URL) && in_array($parts['scheme'] ?? '', ['https', 'http']) && isset($parts['host']) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && empty($parts['path']), 422, 'Use a website origin without a path or credentials.');
        }
        if ($kind === 'browser-profiles') {
            foreach (array_merge($value['settings']['exceptions'] ?? [], array_column($value['settings']['notifications'] ?? [], 'origin')) as $origin) {
                $parts = parse_url($origin);
                abort_unless($parts && in_array($parts['scheme'] ?? '', ['https', 'http']) && isset($parts['host']) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && empty($parts['path']), 422, 'Use a website origin without a path or credentials.');
            }
        }
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
            // The desktop's chat title wins; the generic label covers older desktops.
            $value['title'] = filled($value['title'] ?? null) ? $value['title'] : match ($value['type']) {
                'chat.completed' => 'Chat completed', 'approval.required' => 'Approval required', 'review.required' => 'Review required', 'schedule.completed' => 'Schedule completed', 'device.added' => 'Device added', 'device.reconnected' => 'Computer reconnected', 'website.notification' => 'Website notification', 'schedule.error' => 'Schedule configuration failed',
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
            if ($kind === 'notifications' && ! ($value['silent'] ?? false) && ($value['type'] !== 'schedule.completed' || $this->records->preferences($request->user())['scheduleCompletionNotifications'])) {
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

        return DB::transaction(function () use ($request, $kind, $id) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $old = $this->records->query($request->user(), $kind)->where('id', $id)->first();
            abort_unless($old, 404);
            $required = in_array($kind, ['browser-profiles', 'team-lists', 'links']) ? 'required' : 'sometimes';
            $value = $request->validate(['expectedRevision' => $required.'|integer|min:1']);
            abort_if(isset($value['expectedRevision']) && (int) $old->revision !== (int) $value['expectedRevision'], 409, 'This record changed. Refresh before deleting.');
            $this->records->query($request->user(), $kind)->where('id', $id)->delete();

            return $this->response(['removed' => true]);
        });
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
        $value['deviceId'] = strtolower($value['deviceId']);
        if ($value['platform'] === 'apns') {
            $value['token'] = strtolower($value['token']);
        }
        $result = DB::transaction(function () use ($request, $value) {
            User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
            $matches = collect($this->records->all($request->user(), 'push-subscriptions'))->filter(function (array $old) use ($value): bool {
                if (($old['platform'] ?? '') !== $value['platform']) {
                    return false;
                }
                if ($value['platform'] === 'apns' && ($old['environment'] ?? '') !== $value['environment']) {
                    return false;
                }

                return strtolower($old['deviceId'] ?? '') === $value['deviceId']
                    || ($value['platform'] === 'apns' && strtolower($old['token'] ?? '') === $value['token']);
            })->values();
            $result = $this->records->save($request->user(), 'push-subscriptions', $value, $matches->first()['id'] ?? null);
            $retired = $matches->pluck('id')->reject(fn (string $id): bool => $id === $result['id']);
            $this->records->query($request->user(), 'push-subscriptions')->whereIn('id', $retired)->delete();
            if ($retired->isNotEmpty()) {
                // Do not replay queued copies belonging to duplicate registrations.
                $outbox = collect($this->records->all($request->user(), 'push-outbox'))
                    ->filter(fn (array $item): bool => $retired->contains($item['subscriptionId']))->pluck('id');
                $this->records->query($request->user(), 'push-outbox')->whereIn('id', $outbox)->delete();
            }

            return $result;
        });

        return $this->response(['id' => $result['id'], 'deviceId' => $value['deviceId'], 'platform' => $value['platform'], 'configured' => $this->push->status()[$value['platform']], 'delivery' => 'pending_configuration_or_worker']);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\RemoteDestination;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class RemoteDestinationController extends Controller
{
    private const MAX_DESTINATIONS = 32;

    private function response(array $data, int $status = 200): JsonResponse
    {
        return response()->json($data, $status)->header('Cache-Control', 'no-store, private');
    }

    private function checkAccount(Request $request): void
    {
        // Ambient session cookies can change while an older tab remains open.
        $account = hash_hmac('sha256', 'proteus-browser:'.$request->user()->getAuthIdentifier(), config('app.key'));
        $expected = $request->header('X-Proteus-Account', '');
        abort_unless(is_string($expected) && hash_equals($account, $expected), 409, 'The signed-in account changed. Reload this page before managing destinations.');
    }

    private function relay(): string
    {
        $relay = config('remote.relay_url');
        $parts = is_string($relay) ? parse_url($relay) : false;
        $local = in_array($parts['host'] ?? '', ['localhost', '127.0.0.1', '[::1]'], true);
        abort_unless($parts && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['path']) && ! isset($parts['query']) && ! isset($parts['fragment']) && (($parts['scheme'] ?? '') === 'wss' || ($local && ($parts['scheme'] ?? '') === 'ws')), 503, 'Remote relay configuration is unavailable.');

        return $relay;
    }

    private function destination(Request $request, string $hostId): RemoteDestination
    {
        return RemoteDestination::where('user_id', $request->user()->getAuthIdentifier())
            ->where('host_id', strtolower($hostId))->firstOrFail();
    }

    public function index(Request $request): JsonResponse
    {
        $this->checkAccount($request);
        $destinations = RemoteDestination::where('user_id', $request->user()->getAuthIdentifier())
            ->orderBy('id')->get()->map(fn (RemoteDestination $destination) => $destination->metadata())->all();

        return $this->response(['destinations' => $destinations]);
    }

    public function credential(Request $request, string $hostId): JsonResponse
    {
        $this->checkAccount($request);
        $destination = $this->destination($request, $hostId);
        abort_unless($destination->relay === $this->relay(), 409, 'This destination uses a different configured relay.');
        try {
            $key = $destination->credential;
        } catch (DecryptException) {
            return $this->response(['message' => 'The saved credential could not be decrypted. The original record was preserved.'], 503);
        }
        if (! is_string($key) || ! preg_match('/\A[a-f0-9]{64}\z/i', $key)) {
            return $this->response(['message' => 'The saved credential is invalid. The original record was preserved.'], 503);
        }

        return $this->response($destination->metadata() + ['key' => $key]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->checkAccount($request);
        abort_if(strlen($request->getContent()) > 12_000, 413, 'Destination request is too large.');
        $input = $request->only(['hostId', 'relay', 'label', 'deviceId', 'key', 'pairedAt']);
        // Never flash the key into the session on a validation redirect. All failures are JSON.
        $request->replace($request->except('key'));
        $validator = Validator::make($input, [
            'hostId' => ['required', 'string', 'uuid'],
            'relay' => ['required', 'string', 'max:255', Rule::in([$this->relay()])],
            'label' => ['required', 'string', 'max:80', 'regex:/\A[^\x00-\x1f\x7f]+\z/u'],
            'deviceId' => ['required', 'string', 'uuid'],
            'key' => ['required', 'string', 'regex:/\A[a-f0-9]{64}\z/i'],
            'pairedAt' => ['required', 'string', 'max:40', 'date'],
        ]);
        if ($validator->fails()) {
            return $this->response(['message' => 'Invalid destination settings.', 'errors' => $validator->errors()], 422);
        }
        $value = $validator->validated();
        if (trim($value['label']) === '') {
            return $this->response(['message' => 'Enter a destination label.'], 422);
        }
        $destination = DB::transaction(function () use ($request, $value) {
            $userId = $request->user()->getAuthIdentifier();
            // Serialize account-local inserts so concurrent browsers cannot exceed the count cap.
            User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $destination = RemoteDestination::where('user_id', $userId)->where('host_id', strtolower($value['hostId']))->lockForUpdate()->first();
            abort_if(! $destination && RemoteDestination::where('user_id', $userId)->count() >= self::MAX_DESTINATIONS, 422, 'This account already has 32 destinations. Remove one before pairing another.');
            $destination ??= new RemoteDestination;
            $destination->user_id = $userId;
            $destination->fill([
                'host_id' => strtolower($value['hostId']), 'relay' => $value['relay'], 'label' => trim($value['label']),
                'device_id' => strtolower($value['deviceId']), 'credential' => strtolower($value['key']),
                'paired_at' => CarbonImmutable::parse($value['pairedAt'])->utc(),
            ])->save();

            return $destination;
        });

        return $this->response($destination->metadata());
    }

    public function rename(Request $request, string $hostId): JsonResponse
    {
        $this->checkAccount($request);
        abort_if(strlen($request->getContent()) > 1000, 413, 'Destination request is too large.');
        $validator = Validator::make($request->only(['deviceId', 'label']), [
            'deviceId' => ['required', 'string', 'uuid'],
            'label' => ['required', 'string', 'max:80', 'regex:/\\A[^\\x00-\\x1f\\x7f]+\\z/u'],
        ]);
        if ($validator->fails() || trim((string) $request->input('label')) === '') {
            return $this->response(['message' => 'Provide a valid Mac name and current device ID.'], 422);
        }
        $destination = DB::transaction(function () use ($request, $hostId, $validator) {
            User::whereKey($request->user()->getAuthIdentifier())->lockForUpdate()->firstOrFail();
            $destination = $this->destination($request, $hostId);
            $value = $validator->validated();
            abort_unless(hash_equals($destination->device_id, strtolower($value['deviceId'])), 409, 'This Mac was paired again. Refresh before updating its name.');
            $destination->label = trim($value['label']);
            $destination->save();

            return $destination;
        });

        return $this->response($destination->metadata());
    }

    public function destroy(Request $request, string $hostId): JsonResponse
    {
        $this->checkAccount($request);
        $validator = Validator::make($request->only('deviceId'), ['deviceId' => ['required', 'string', 'uuid']]);
        if ($validator->fails()) {
            return $this->response(['message' => 'Provide the current destination device ID.', 'errors' => $validator->errors()], 422);
        }
        DB::transaction(function () use ($request, $hostId, $validator) {
            $userId = $request->user()->getAuthIdentifier();
            User::whereKey($userId)->lockForUpdate()->firstOrFail();
            $destination = RemoteDestination::where('user_id', $userId)->where('host_id', strtolower($hostId))->lockForUpdate()->firstOrFail();
            abort_unless(hash_equals($destination->device_id, strtolower($validator->validated()['deviceId'])), 409, 'This Mac was paired again. Refresh before removing its replacement credential.');
            $destination->delete();
        });

        return $this->response(['removed' => true]);
    }
}

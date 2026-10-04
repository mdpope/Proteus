<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Services\{LifeActions, LifeReadModel, TenantAccess};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class LifeApiController extends Controller
{
    public function status(Request $request, LifeReadModel $read) { return response()->json($read->profile($request->user()))->header('Cache-Control', 'private, no-store'); }

    public function data(Request $request, LifeReadModel $read) {
        $v = $request->validate(['section' => 'required|in:overview,nutrition,garage,fuel,captures,security,connections', 'query' => 'sometimes|array', 'query.tab' => 'sometimes|in:days,day,averages,foods,versions', 'query.from' => 'nullable|date_format:Y-m-d', 'query.through' => 'nullable|date_format:Y-m-d', 'query.date' => 'nullable|date_format:Y-m-d', 'query.search' => 'nullable|string|max:200', 'query.foodId' => 'nullable|integer|min:1', 'query.vehicleId' => 'nullable|integer|min:1', 'query.captureId' => 'nullable|integer|min:1', 'query.status' => 'nullable|in:review,saved', 'query.page' => 'sometimes|integer|between:1,100000']);
        abort_if(isset($v['query']['from'], $v['query']['through']) && $v['query']['from'] > $v['query']['through'], 422, 'The start date must not be after the end date.');
        return response()->json($read->data($request->user(), $v['section'], $v['query'] ?? []))->header('Cache-Control', 'private, no-store');
    }

    public function action(Request $request, LifeActions $actions, LifeReadModel $read) {
        $v = $request->validate(['action' => 'required|string|max:50', 'input' => 'required|array', 'expectedAccountId' => 'required|string|size:64', 'expectedWorkspaceId' => 'required|string|max:30', 'idempotencyKey' => ['required', 'string', 'regex:/^[a-zA-Z0-9_-]{16,100}$/']]);
        $profile = $read->profile($request->user());
        abort_unless(hash_equals($profile['accountId'], $v['expectedAccountId']) && $profile['workspaceId'] === $v['expectedWorkspaceId'], 409, 'The active Life account changed. Refresh before saving.');
        return response()->json($actions->run($request->user(), $v['action'], $v['input'], $v['idempotencyKey']) + ['accountId' => $profile['accountId'], 'workspaceId' => $profile['workspaceId']])->header('Cache-Control', 'private, no-store');
    }

    public function evidence(Request $request, int $id, TenantAccess $access) {
        $w = $access->workspace($request->user()); $a = Attachment::where('workspace_id', $w)->findOrFail($id);
        $access->captures($request->user())->findOrFail($a->capture_id);
        $path = Storage::disk('local')->path($a->path); $root = realpath(Storage::disk('local')->path('')); $resolved = realpath($path);
        abort_unless($root && $resolved && str_starts_with($resolved, $root.DIRECTORY_SEPARATOR), 404);
        abort_unless(filesize($resolved) === (int) $a->bytes && hash_equals($a->sha256, hash_file('sha256', $resolved)), 409, 'Original evidence integrity check failed.');
        return response()->download($resolved, basename($a->original_name), ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'private, no-store']);
    }
}

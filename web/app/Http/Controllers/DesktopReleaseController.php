<?php

namespace App\Http\Controllers;

use App\Services\DesktopReleases;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DesktopReleaseController extends Controller
{
    public function __construct(private DesktopReleases $releases) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate(['platform' => 'required|in:win32,darwin,linux', 'arch' => 'required|in:x64,arm64', 'channel' => 'sometimes|in:stable,preview']);
        $items = $this->releases->catalog($filters['platform'], $filters['arch'], $filters['channel'] ?? 'stable');

        return response()->json([
            'accountId' => hash_hmac('sha256', 'proteus-life:'.$request->user()->id, config('app.key')),
            'workspaceId' => (string) $request->user()->current_workspace_id,
            'releases' => array_column($items, 'envelope'),
        ])->header('Cache-Control', 'private, no-store');
    }

    public function page(): Response
    {
        return response()->view('desktop-releases', ['releases' => array_column($this->releases->catalog('win32', 'x64', 'stable'), 'release')])
            ->header('Cache-Control', 'private, no-store');
    }

    public function download(string $id, string $kind): StreamedResponse|JsonResponse
    {
        $item = $this->releases->find($id);
        abort_unless($item, 404);
        if ($kind === 'manifest') {
            return response()->json($item['envelope'])->header('Content-Disposition', 'attachment; filename="release.json"')->header('Cache-Control', 'private, no-store');
        }
        $handle = $this->releases->openArtifact($item, $kind);
        abort_unless(is_resource($handle), 404);
        $artifact = $item['release'][$kind];

        return response()->streamDownload(function () use ($handle): void {
            try {
                fpassthru($handle);
            } finally {
                fclose($handle);
            }
        }, $artifact['filename'], ['Content-Type' => 'application/octet-stream', 'Content-Length' => (string) $artifact['bytes'], 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
